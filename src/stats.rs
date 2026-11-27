//! Database-only statistics jobs. Game API work belongs to the puller.
use crate::{CHAR_NAMES, schema};
use bb8_redis::redis;
use diesel::{
    prelude::*,
    sql_types::{BigInt, Integer},
};
use diesel_async::{AsyncConnection, RunQueryDsl, scoped_futures::ScopedFutureExt};
use tracing::{info, warn};

pub type StatsError = Box<dyn std::error::Error + Send + Sync>;

#[derive(Clone, Copy, Debug)]
pub enum StatsJob {
    Hourly,
    Daily,
}

impl StatsJob {
    fn timestamp_key(self) -> &'static str {
        match self {
            Self::Hourly => "last_update_hourly",
            Self::Daily => "last_update_daily",
        }
    }

    /// Call inside a transaction. The same hourly lock is used by backfill.
    pub async fn lock(
        self,
        connection: &mut diesel_async::AsyncPgConnection,
    ) -> Result<(), diesel::result::Error> {
        diesel::sql_query("SET LOCAL lock_timeout = '5s'")
            .execute(connection)
            .await?;
        diesel::sql_query("SELECT pg_advisory_xact_lock(1788735600, $1)")
            .bind::<Integer, _>(match self {
                Self::Hourly => 0,
                Self::Daily => 1,
            })
            .execute(connection)
            .await?;
        Ok(())
    }
}

/// Success is recorded only after the database transaction commits.
/// Redis cache writes are repeatable, but are not rolled back with PostgreSQL.
pub async fn run(state: crate::AppState, job: StatsJob) -> Result<(), StatsError> {
    let mut redis = state.redis_pool.get().await?;
    {
        let mut connection = state.db_pool.get().await?;
        let redis = &mut redis;
        connection
            .transaction::<_, StatsError, _>(|conn| {
                async move {
                    job.lock(conn).await?;
                    match job {
                        StatsJob::Daily => {
                            update_popularity(conn, redis).await?;
                            update_matchups(conn, redis).await?;
                            update_distribution(conn, redis).await?;
                        }
                        StatsJob::Hourly => update_stats(conn, redis).await?,
                    }
                    Ok(())
                }
                .scope_boxed()
            })
            .await?;
    }
    crate::imdb::set_last_update(&mut redis, job.timestamp_key()).await?;
    info!(job = ?job, "Statistics update completed");
    Ok(())
}

pub async fn run_scheduled(state: crate::AppState) {
    use chrono::{TimeDelta, Utc};
    use tokio::time::{self, Duration, MissedTickBehavior};

    let mut interval = time::interval(Duration::from_secs(60));
    interval.set_missed_tick_behavior(MissedTickBehavior::Skip);
    loop {
        interval.tick().await;
        for (job, cadence) in [
            (StatsJob::Hourly, TimeDelta::hours(1)),
            (StatsJob::Daily, TimeDelta::days(1)),
        ] {
            let last_run = async {
                let mut redis = state.redis_pool.get().await?;
                let timestamp =
                    crate::imdb::get_last_update(&mut redis, job.timestamp_key()).await?;
                Ok::<_, StatsError>(timestamp)
            }
            .await;
            match last_run {
                Ok(timestamp) => {
                    let last_run = timestamp.as_deref().and_then(|timestamp| {
                        chrono::NaiveDateTime::parse_from_str(
                            timestamp,
                            crate::imdb::UPDATE_TIMESTAMP_FORMAT,
                        )
                        .ok()
                    });
                    if last_run.is_none_or(|last| Utc::now().naive_utc() - last >= cadence)
                        && let Err(error) = run(state.clone(), job).await
                    {
                        warn!(?job, %error, "Scheduled statistics update failed");
                    }
                }
                Err(error) => warn!(?job, %error, "Could not check statistics schedule"),
            }
        }
    }
}

fn character_code(id: i16) -> Option<&'static str> {
    let character = usize::try_from(id).ok().and_then(|id| CHAR_NAMES.get(id));
    if character.is_none() {
        warn!(id, "Skipping unknown character in popularity statistics");
    }
    character.map(|(code, _)| *code)
}

#[derive(QueryableByName, serde::Serialize, serde::Deserialize)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct DistributionResult {
    #[diesel(sql_type = diesel::sql_types::Integer)]
    pub lower_bound: i32,
    #[diesel(sql_type = diesel::sql_types::Integer)]
    pub upper_bound: i32,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub count: i64,
    #[diesel(sql_type = diesel::sql_types::Double)]
    pub percentage: f64,
    #[diesel(sql_type = diesel::sql_types::Double)]
    pub percentile: f64,
}
async fn update_distribution(
    conn: &mut crate::Connection<'_>,
    redis_connection: &mut crate::RedisConnection<'_>,
) -> Result<(), StatsError> {
    info!("Updating distribution");

    let distribution_results = diesel::sql_query(
        "
        WITH buckets AS (
            SELECT
              unnest(ARRAY[-10000000, 1,    1000, 2000, 3000, 4200, 5400, 6600, 8800,  11000, 13200, 15600, 18000, 20400, 24400, 28400, 32400, 36600, 40800, 10000000, 10001600, 10001700, 10001800]) AS lower_bound,
              unnest(ARRAY[1, 1000, 2000, 3000, 4200, 5400, 6600, 8800, 11000, 13200, 15600, 18000, 20400, 24400, 28400, 32400, 36600, 40800, 10000000, 10001600, 10001700, 10001800, 200000000]) AS upper_bound
        ),
        bucket_counts AS (  -- CTE to count values in each bucket
            SELECT 
                b.lower_bound, 
                b.upper_bound, 
                count(t.value) AS bucket_count
            FROM player_ratings t
            LEFT JOIN buckets b ON t.value >= b.lower_bound AND t.value < b.upper_bound
            GROUP BY b.lower_bound, b.upper_bound
        ),
        percentiles AS ( -- CTE to calculate cumulative percentage (excluding placement from percentile)
            SELECT 
                lower_bound,
                upper_bound,
                bucket_count,
                SUM(bucket_count) OVER (ORDER BY lower_bound) as cumulative_sum,
                SUM(bucket_count) OVER () as total_count,
                SUM(CASE WHEN upper_bound != 1 THEN bucket_count ELSE 0 END) OVER (ORDER BY lower_bound) as cumulative_sum_ranked_only,
                SUM(bucket_count) FILTER (WHERE upper_bound != 1) OVER () as total_count_excluding_placement
            FROM bucket_counts        
        )
        SELECT 
            p.lower_bound,
            p.upper_bound,
            p.bucket_count AS count,
            CASE 
                WHEN p.upper_bound = 1 THEN CAST(ROUND((p.bucket_count * 100.0 / p.total_count), 2) AS FLOAT)  -- Placement percentage includes all players
                ELSE CAST(ROUND((p.bucket_count * 100.0 / p.total_count_excluding_placement), 2) AS FLOAT)  -- Ranked percentage excludes placement
            END AS percentage,
            CASE 
                WHEN p.upper_bound = 1 THEN 0.0  -- Set percentile to 0 for placement
                ELSE CAST(ROUND((100.0 - ((p.cumulative_sum_ranked_only - p.bucket_count) * 100.0 / p.total_count_excluding_placement)), 2) AS FLOAT)
            END AS percentile
        FROM percentiles p
        ORDER BY p.lower_bound;
        ",
    );

    let distribution_results = distribution_results
        .get_results::<DistributionResult>(conn)
        .await?;

    redis::cmd("SET")
        .arg("distribution_rating")
        .arg(serde_json::to_string(&distribution_results)?)
        .query_async::<String>(&mut **redis_connection)
        .await?;

    info!("Updating distribution - Done");
    Ok(())
}

#[derive(QueryableByName, serde::Serialize, serde::Deserialize)]
pub struct Matchup {
    #[diesel(sql_type = diesel::sql_types::SmallInt)]
    pub opponent_char: i16,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub wins: i64,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub total_games: i64,
}
async fn update_matchups(
    conn: &mut crate::Connection<'_>,
    redis_connection: &mut crate::RedisConnection<'_>,
) -> Result<(), StatsError> {
    info!("Updating matchups");

    {
        let mut all_characters: std::collections::HashMap<i16, Vec<Matchup>> =
            std::collections::HashMap::new();

        for c in 0..CHAR_NAMES.len() {
            let results = diesel::sql_query(
                "
              SELECT 
                  opponent_char,
                  SUM(CASE 
                      WHEN (position = 'a' AND winner = 1) OR (position = 'b' AND winner = 2)
                      THEN 1 
                      ELSE 0 
                  END) as wins,
                  COUNT(*) as total_games
              FROM (
                  SELECT 
                      char_b as opponent_char, 
                      winner,
                      'a' as position
                  FROM games
                  WHERE char_a = $1
                  AND timestamp > now() - interval '1 month'
                  AND game_floor = 0  -- Only ranked matches
                  AND value_a > 0
                  AND value_b > 0
                  UNION ALL
                  SELECT 
                      char_a as opponent_char, 
                      winner,
                      'b' as position
                  FROM games
                  WHERE char_b = $1
                  AND timestamp > now() - interval '1 month'
                  AND game_floor = 0  -- Only ranked matches
                  AND value_a > 0
                  AND value_b > 0
              ) as combined_results
              GROUP BY opponent_char
              ORDER BY opponent_char;
              ",
            );
            let results: Vec<Matchup> = results
                .bind::<Integer, _>(i32::try_from(c).unwrap())
                .get_results(conn)
                .await?;

            all_characters.insert(i16::try_from(c).unwrap(), results);
        }

        for (char_id, matchups) in all_characters {
            let char_id = char_id as usize;

            redis::cmd("SET")
                .arg(format!("matchup_{}", char_id))
                .arg(serde_json::to_string(&matchups)?)
                .query_async::<String>(&mut **redis_connection)
                .await?;
        }
    }

    {
        let mut all_characters: std::collections::HashMap<i16, Vec<Matchup>> =
            std::collections::HashMap::new();

        for c in 0..CHAR_NAMES.len() {
            let results = diesel::sql_query(
                "
            SELECT 
                opponent_char,
                SUM(CASE 
                    WHEN (position = 'a' AND winner = 1) OR (position = 'b' AND winner = 2)
                    THEN 1 
                    ELSE 0 
                END) as wins,
                COUNT(*) as total_games
            FROM (
                SELECT 
                    char_b as opponent_char, 
                    winner,
                    'a' as position
                FROM games
                WHERE char_a = $1
                AND timestamp > now() - interval '1 month'
                AND game_floor = 0  -- Only ranked matches
                AND value_a >= 10001600
                AND value_b >= 10001600
                UNION ALL
                SELECT
                    char_a as opponent_char,
                    winner,
                    'b' as position
                FROM games
                WHERE char_b = $1
                AND timestamp > now() - interval '1 month'
                AND game_floor = 0  -- Only ranked matches
                AND value_a >= 10001600
                AND value_b >= 10001600
            ) as combined_results
            GROUP BY opponent_char
            ORDER BY opponent_char;
            ",
            );
            let results: Vec<Matchup> = results
                .bind::<Integer, _>(i32::try_from(c).unwrap())
                .get_results(conn)
                .await?;

            all_characters.insert(i16::try_from(c).unwrap(), results);
        }

        for (char_id, matchups) in all_characters {
            let char_id = char_id as usize;

            redis::cmd("SET")
                .arg(format!("matchup_vanq_{}", char_id))
                .arg(serde_json::to_string(&matchups)?)
                .query_async::<String>(&mut **redis_connection)
                .await?;
        }
    }

    info!("Updating matchups - Done");
    Ok(())
}

#[derive(QueryableByName)]
struct PopularityResult {
    #[diesel(sql_type = diesel::sql_types::SmallInt)]
    c: i16,
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    count: i64,
}
#[derive(QueryableByName)]
struct PopularityResultTotal {
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    count: i64,
}
async fn update_popularity(
    conn: &mut crate::Connection<'_>,
    redis_connection: &mut crate::RedisConnection<'_>,
) -> Result<(), StatsError> {
    info!("Updating popularity");
    //We're using subqueries here, so we need to use sql_query

    //Distinct player + character combination counts
    let results = diesel::sql_query(
        "
        SELECT c, COUNT(id) as count
        FROM (
            SELECT g.char_a as c, g.id_a as id
            FROM games g
            WHERE g.timestamp > now() - interval '1 month'
        UNION
            SELECT g.char_b as c, g.id_b as id
            FROM games g
            WHERE g.timestamp > now() - interval '1 month'
        ) as combined_results
        GROUP BY c;
    ",
    );

    let results: Vec<PopularityResult> = results.get_results::<PopularityResult>(conn).await?;

    for r in results {
        let Some(char_code) = character_code(r.c) else {
            continue;
        };
        let count = r.count;

        redis::cmd("SET")
            .arg(format!("popularity_per_player_{}", char_code))
            .arg(count)
            .query_async::<String>(&mut **redis_connection)
            .await?;
    }

    //Total distinct player + character combination.
    let results_total_players = diesel::sql_query(
        "
        SELECT COUNT(id) as count
        FROM (
            SELECT g.id_a as id
            FROM games g
            WHERE g.timestamp > now() - interval '1 month'
        UNION
            SELECT g.id_b as id
            FROM games g
            WHERE g.timestamp > now() - interval '1 month'
        ) as combined_results;
        ",
    );

    let results_total_players: Vec<PopularityResultTotal> = results_total_players
        .get_results::<PopularityResultTotal>(conn)
        .await?;

    redis::cmd("SET")
        .arg("popularity_per_player_total")
        .arg(results_total_players[0].count)
        .query_async::<String>(&mut **redis_connection)
        .await?;

    //Total game count per character (no total needed, we can use 'one_month_games' from stats)
    let results = diesel::sql_query(
        "
        SELECT c, COUNT(c) as count
        FROM (
            SELECT g.char_a as c
            FROM games g
            WHERE g.timestamp > now() - interval '1 month'
        UNION ALL
            SELECT g.char_b as c
            FROM games g
            WHERE g.timestamp > now() - interval '1 month'
        ) as combined_results
        GROUP BY c;
        ",
    );

    let results: Vec<PopularityResult> = results.get_results::<PopularityResult>(conn).await?;

    for r in results {
        let Some(char_code) = character_code(r.c) else {
            continue;
        };
        let count = r.count;

        redis::cmd("SET")
            .arg(format!("popularity_per_character_{}", char_code))
            .arg(count)
            .query_async::<String>(&mut **redis_connection)
            .await?;
    }

    info!("Updating popularity - Done");
    Ok(())
}

#[derive(QueryableByName, Queryable)]
#[diesel(check_for_backend(diesel::pg::Pg))]
struct CountResult {
    #[diesel(sql_type = BigInt)]
    count: i64,
}
async fn update_stats(
    conn: &mut crate::Connection<'_>,
    redis_connection: &mut crate::RedisConnection<'_>,
) -> Result<(), StatsError> {
    info!("Updating stats");

    crate::hourly_players::update_recent(conn).await?;

    // Get total game count
    let total_games: i64 = schema::games::table.count().get_result::<i64>(conn).await?;

    // Get one month game count
    let one_month_games = schema::games::table
        .filter(
            schema::games::timestamp
                .gt(chrono::Utc::now().naive_utc() - chrono::Duration::days(30)),
        )
        .count()
        .get_result::<i64>(conn)
        .await?;

    // Get one week game count
    let one_week_games = schema::games::table
        .filter(
            schema::games::timestamp.gt(chrono::Utc::now().naive_utc() - chrono::Duration::days(7)),
        )
        .count()
        .get_result::<i64>(conn)
        .await?;

    // Get one day game count
    let one_day_games = schema::games::table
        .filter(
            schema::games::timestamp.gt(chrono::Utc::now().naive_utc() - chrono::Duration::days(1)),
        )
        .count()
        .get_result::<i64>(conn)
        .await?;

    // Get one hour game count
    let one_hour_games = schema::games::table
        .filter(
            schema::games::timestamp
                .gt(chrono::Utc::now().naive_utc() - chrono::Duration::hours(1)),
        )
        .count()
        .get_result::<i64>(conn)
        .await?;

    // Get total player count
    let total_players = schema::players::table
        .count()
        .get_result::<i64>(conn)
        .await?;

    // Get past month player count
    let one_month_players = diesel::sql_query(
        "
        select count(id)
        from (
            select id_a as id
            from games
            where timestamp > now() - interval '1 month'
            union
            select id_b as id
            from games
            where timestamp > now() - interval '1 month'
        ) as combined_result;
        ",
    );
    let one_month_players = one_month_players.get_results::<CountResult>(conn).await?;
    let one_month_players = one_month_players[0].count;

    // Get past month player count
    let one_week_players = diesel::sql_query(
        "
        select count(id)
        from (
            select id_a as id
            from games
            where timestamp > now() - interval '1 week'
            union
            select id_b as id
            from games
            where timestamp > now() - interval '1 week'
        ) as combined_result;
        ",
    );
    let one_week_players = one_week_players.get_results::<CountResult>(conn).await?;
    let one_week_players = one_week_players[0].count;

    // Get past day player count
    let one_day_players = diesel::sql_query(
        "
        select count(id)
        from (
            select id_a as id
            from games
            where timestamp > now() - interval '1 day'
            union
            select id_b as id
            from games
            where timestamp > now() - interval '1 day'
        ) as combined_result;
        ",
    );
    let one_day_players = one_day_players.get_results::<CountResult>(conn).await?;
    let one_day_players = one_day_players[0].count;

    // Get past hour player count
    let one_hour_players = diesel::sql_query(
        "
        select count(id)
        from (
            select id_a as id
            from games
            where timestamp > now() - interval '1 hour'
            union
            select id_b as id
            from games
            where timestamp > now() - interval '1 hour'
        ) as combined_result;
        ",
    );
    let one_hour_players = one_hour_players.get_results::<CountResult>(conn).await?;
    let one_hour_players = one_hour_players[0].count;

    redis::cmd("SET")
        .arg("total_games")
        .arg(total_games)
        .query_async::<String>(&mut **redis_connection)
        .await?;

    redis::cmd("SET")
        .arg("one_month_games")
        .arg(one_month_games)
        .query_async::<String>(&mut **redis_connection)
        .await?;

    redis::cmd("SET")
        .arg("one_week_games")
        .arg(one_week_games)
        .query_async::<String>(&mut **redis_connection)
        .await?;

    redis::cmd("SET")
        .arg("one_day_games")
        .arg(one_day_games)
        .query_async::<String>(&mut **redis_connection)
        .await?;

    redis::cmd("SET")
        .arg("one_hour_games")
        .arg(one_hour_games)
        .query_async::<String>(&mut **redis_connection)
        .await?;

    redis::cmd("SET")
        .arg("total_players")
        .arg(total_players)
        .query_async::<String>(&mut **redis_connection)
        .await?;

    redis::cmd("SET")
        .arg("one_month_players")
        .arg(one_month_players)
        .query_async::<String>(&mut **redis_connection)
        .await?;

    redis::cmd("SET")
        .arg("one_week_players")
        .arg(one_week_players)
        .query_async::<String>(&mut **redis_connection)
        .await?;

    redis::cmd("SET")
        .arg("one_day_players")
        .arg(one_day_players)
        .query_async::<String>(&mut **redis_connection)
        .await?;

    redis::cmd("SET")
        .arg("one_hour_players")
        .arg(one_hour_players)
        .query_async::<String>(&mut **redis_connection)
        .await?;

    info!("Updating stats - Done");
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn unknown_character_ids_are_skipped_without_panicking() {
        assert_eq!(super::character_code(0), Some(crate::CHAR_NAMES[0].0));
        assert_eq!(super::character_code(-1), None);
        assert_eq!(super::character_code(crate::CHAR_NAMES.len() as i16), None);
        assert_eq!(super::character_code(i16::MAX), None);
    }
}
