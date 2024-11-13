use crate::{ggst_api, schema, CHAR_NAMES};
use bb8::PooledConnection;
use bb8_redis::RedisConnectionManager;
use diesel::prelude::*;
use diesel_async::pooled_connection::AsyncDieselConnectionManager;
use diesel_async::{AsyncConnection, AsyncPgConnection, RunQueryDsl};
use std::time::Duration;
use tokio::time;
use tracing::{debug, error, info};

use crate::schema::{
    character_ranks, constants, games, global_ranks, player_names, player_ratings, players,
};
use bb8_redis::redis;
use chrono::{NaiveDateTime, Utc};
use diesel::dsl::*;

use crate::models::*;

use rstat::univariate;
use rstat::Distribution;

use diesel_async::scoped_futures::ScopedFutureExt;

use diesel::sql_types::Integer;

pub const ONE_HOUR: i64 = 1 * 60 * 60;

pub async fn pull_and_update_continuous(state: crate::AppState) {
    {
        //Update stats, popularity at the start of pull
        let mut connection = state.db_pool.get().await.unwrap();
        let mut redis_connection = state.redis_pool.get().await.unwrap();
        update_stats(&mut connection, &mut redis_connection)
            .await
            .unwrap();

        update_popularity(&mut connection, &mut redis_connection)
            .await
            .unwrap();
    }

    let mut interval = time::interval(Duration::from_secs(60));

    loop {
        let mut connection = state.db_pool.get().await.unwrap();
        let mut redis_connection = state.redis_pool.get().await.unwrap();

        interval.tick().await;

        connection
            .transaction::<_, diesel::result::Error, _>(|conn| {
                async move {
                    match grab_games(conn).await {
                        Ok(new_games) => {
                            info!("New games: {:?}", new_games.len());

                            if let Err(e) = update_ratings(conn, &new_games).await {
                                error!("update_ratings failed: {e}");
                            }
                        }
                        Err(e) => {
                            error!("grab_games failed: {e}");
                        }
                    };

                    Ok(())
                }
                .scope_boxed()
            })
            .await
            .unwrap();

        connection
            .transaction::<_, diesel::result::Error, _>(|conn| {
                async move {
                    //Hourly update ranks
                    let last_hourly_update = &constants::table
                        .select(constants::value)
                        .filter(constants::key.eq("last_rank_update"))
                        .load::<String>(conn)
                        .await
                        .unwrap()[0];

                    //Convert String last_hourly_update to i64
                    let last_hourly_update = last_hourly_update.parse::<i64>().unwrap();
                    let current_time = Utc::now().timestamp();
                    if current_time - last_hourly_update >= ONE_HOUR - 10 {
                        //Give 10 seconds leeway
                        do_hourly_update(conn, &mut redis_connection).await.unwrap();
                    }

                    Ok(())
                }
                .scope_boxed()
            })
            .await
            .unwrap();
    }
}

pub async fn do_hourly_update_once(state: crate::AppState) {
    let mut connection = state.db_pool.get().await.unwrap();
    let mut redis_connection = state.redis_pool.get().await.unwrap();

    connection
        .transaction::<_, diesel::result::Error, _>(|conn| {
            async move {
                do_hourly_update(conn, &mut redis_connection).await.unwrap();
                Ok(())
            }
            .scope_boxed()
        })
        .await
        .unwrap();
}

async fn do_hourly_update(
    conn: &mut PooledConnection<'_, AsyncDieselConnectionManager<AsyncPgConnection>>,
    redis_connection: &mut PooledConnection<'_, RedisConnectionManager>,
) -> Result<(), String> {
    if let Err(e) = decay(conn).await {
        error!("decay failed: {e}");
    }

    if let Err(e) = update_ranks(conn).await {
        error!("update_ranks failed: {e}");
    }

    if let Err(e) = update_stats(conn, redis_connection).await {
        error!("update_stats failed: {e}");
    }

    if let Err(e) = update_popularity(conn, redis_connection).await {
        error!("update_popularity failed: {e}");
    }

    //Update last_rank_update in the constants table
    diesel::update(constants::table)
        .filter(constants::key.eq("last_rank_update"))
        .set(constants::value.eq(Utc::now().timestamp().to_string()))
        .execute(conn)
        .await
        .unwrap();
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
    conn: &mut PooledConnection<'_, AsyncDieselConnectionManager<AsyncPgConnection>>,
    redis_connection: &mut PooledConnection<'_, RedisConnectionManager>,
) -> Result<(), String> {
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

    let results: Vec<PopularityResult> =
        results.get_results::<PopularityResult>(conn).await.unwrap();

    for r in results {
        let char_id = r.c as usize;
        let count = r.count;

        redis::cmd("SET")
            .arg(format!("popularity_per_player_{}", CHAR_NAMES[char_id].0))
            .arg(count)
            .query_async::<String>(&mut **redis_connection)
            .await
            .expect("Error setting popularity per player");
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
        .await
        .unwrap();

    redis::cmd("SET")
        .arg("popularity_per_player_total")
        .arg(results_total_players[0].count)
        .query_async::<String>(&mut **redis_connection)
        .await
        .expect("Error setting popularity_total");


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
        "
    );

    let results: Vec<PopularityResult> =
        results.get_results::<PopularityResult>(conn).await.unwrap();

    for r in results {
        let char_id = r.c as usize;
        let count = r.count;

        redis::cmd("SET")
            .arg(format!("popularity_per_character_{}", CHAR_NAMES[char_id].0))
            .arg(count)
            .query_async::<String>(&mut **redis_connection)
            .await
            .expect("Error setting popularity per game");
    }



    Ok(())
}

async fn update_stats(
    conn: &mut PooledConnection<'_, AsyncDieselConnectionManager<AsyncPgConnection>>,
    redis_connection: &mut PooledConnection<'_, RedisConnectionManager>,
) -> Result<(), String> {
    debug!("Updating stats");

    //Now
    let last_update =
        chrono::DateTime::from_timestamp(chrono::Utc::now().naive_utc().and_utc().timestamp(), 0)
            .unwrap()
            .naive_utc()
            .to_string();

    // Get total game count
    let total_games: i64 = schema::games::table
        .count()
        .get_result::<i64>(conn)
        .await
        .expect("Error loading games");

    // Get one month game count
    let one_month_games = schema::games::table
        .filter(
            schema::games::timestamp
                .gt(chrono::Utc::now().naive_utc() - chrono::Duration::days(30)),
        )
        .count()
        .get_result::<i64>(conn)
        .await
        .expect("Error loading games");

    // Get one week game count
    let one_week_games = schema::games::table
        .filter(
            schema::games::timestamp.gt(chrono::Utc::now().naive_utc() - chrono::Duration::days(7)),
        )
        .count()
        .get_result::<i64>(conn)
        .await
        .expect("Error loading games");

    // Get one day game count
    let one_day_games = schema::games::table
        .filter(
            schema::games::timestamp.gt(chrono::Utc::now().naive_utc() - chrono::Duration::days(1)),
        )
        .count()
        .get_result::<i64>(conn)
        .await
        .expect("Error loading games");

    // Get one hour game count
    let one_hour_games = schema::games::table
        .filter(
            schema::games::timestamp
                .gt(chrono::Utc::now().naive_utc() - chrono::Duration::hours(1)),
        )
        .count()
        .get_result::<i64>(conn)
        .await
        .expect("Error loading games");

    redis::cmd("SET")
        .arg("total_games")
        .arg(total_games)
        .query_async::<String>(&mut **redis_connection)
        .await
        .expect("Error setting total_games");

    redis::cmd("SET")
        .arg("one_month_games")
        .arg(one_month_games)
        .query_async::<String>(&mut **redis_connection)
        .await
        .expect("Error setting one_month_games");

    redis::cmd("SET")
        .arg("one_week_games")
        .arg(one_week_games)
        .query_async::<String>(&mut **redis_connection)
        .await
        .expect("Error setting one_week_games");

    redis::cmd("SET")
        .arg("one_day_games")
        .arg(one_day_games)
        .query_async::<String>(&mut **redis_connection)
        .await
        .expect("Error setting one_day_games");

    redis::cmd("SET")
        .arg("one_hour_games")
        .arg(one_hour_games)
        .query_async::<String>(&mut **redis_connection)
        .await
        .expect("Error setting one_hour_games");

    redis::cmd("SET")
        .arg("last_update")
        .arg(last_update)
        .query_async::<String>(&mut **redis_connection)
        .await
        .expect("Error setting last_update");

    Ok(())
}

async fn decay(connection: &mut AsyncPgConnection) -> Result<(), String> {
    info!("Decaying ratings");

    diesel::update(player_ratings::table)
        .set((
            player_ratings::deviation.eq((player_ratings::deviation * 1.003) + 0.01),
            player_ratings::last_decay.eq(Utc::now().naive_utc()),
        ))
        .filter(player_ratings::deviation.lt(250.0))
        .execute(connection)
        .await
        .unwrap();

    Ok(())
}

#[allow(dead_code)]
#[derive(QueryableByName)]
struct InsertedRankRowId {
    #[diesel(sql_type = Integer)]
    rank: i32,
}
async fn update_ranks(connection: &mut AsyncPgConnection) -> Result<(), String> {
    //TODO change this to use Redis?

    //Delete all rows in the global_ranks and character_ranks tables
    diesel::delete(global_ranks::table)
        .execute(connection)
        .await
        .unwrap();
    diesel::delete(character_ranks::table)
        .execute(connection)
        .await
        .unwrap();

    let results = sql_query(
        "
        INSERT INTO global_ranks (rank, id, char_id)
        SELECT ROW_NUMBER()
        OVER (ORDER BY value DESC) as rank, r.id, r.char_id
        FROM player_ratings r
        LEFT JOIN players p ON p.id = r.id
        WHERE r.deviation < 30.0
        AND p.status = 'public'
        ORDER BY value DESC
        LIMIT 1000  
        RETURNING rank
    ",
    );
    let results: Vec<InsertedRankRowId> = results.get_results(connection).await.unwrap();

    info!("Inserted {} rows into global_ranks", results.len());

    for c in 0..CHAR_NAMES.len() {
        let results = sql_query(
            "
            INSERT INTO character_ranks (rank, id, char_id)
            SELECT ROW_NUMBER() 
            OVER (ORDER BY value DESC) as rank, r.id, char_id
            FROM player_ratings r, players p
            WHERE r.id = p.id
            AND p.status = 'public'
            AND deviation < 30.0 AND char_id = $1
            ORDER BY value DESC
            LIMIT 1000
            RETURNING rank
        ",
        );
        let results: Vec<InsertedRankRowId> = results
            .bind::<Integer, _>(i32::try_from(c).unwrap())
            .get_results(connection)
            .await
            .unwrap();

        info!(
            "Inserted {} rows into character_ranks for character {}",
            results.len(),
            CHAR_NAMES[c].1
        );
    }

    Ok(())
}

async fn update_player_info(
    connection: &mut AsyncPgConnection,
    new_game: &Game,
) -> Result<(), String> {
    //Update player name in the player table
    insert_into(players::table)
        .values(&Player {
            id: new_game.id_a,
            name: new_game.name_a.clone(),
            platform: new_game.platform_a,
            status: Some(crate::models::Status::Public),
            api_key: None,
            rcode_check_code: None,
        })
        .on_conflict(players::id)
        .do_update()
        .set((
            players::name.eq(new_game.name_a.clone()),
            players::platform.eq(new_game.platform_a),
        ))
        .execute(connection)
        .await
        .unwrap();

    insert_into(players::table)
        .values(&Player {
            id: new_game.id_b,
            name: new_game.name_b.clone(),
            platform: new_game.platform_b,
            status: Some(crate::models::Status::Public),
            api_key: None,
            rcode_check_code: None,
        })
        .on_conflict(players::id)
        .do_update()
        .set((
            players::name.eq(new_game.name_b.clone()),
            players::platform.eq(new_game.platform_b),
        ))
        .execute(connection)
        .await
        .unwrap();

    //Update player names in the player_names table
    insert_into(player_names::table)
        .values(&PlayerName {
            id: new_game.id_a,
            name: new_game.name_a.clone(),
        })
        .on_conflict_do_nothing()
        .execute(connection)
        .await
        .unwrap();

    insert_into(player_names::table)
        .values(&PlayerName {
            id: new_game.id_b,
            name: new_game.name_b.clone(),
        })
        .on_conflict_do_nothing()
        .execute(connection)
        .await
        .unwrap();

    Ok(())
}

async fn grab_games(connection: &mut AsyncPgConnection) -> Result<Vec<Game>, String> {
    info!("Grabbing replays");

    let replays = ggst_api::get_replays().await;

    let replays = match replays {
        Ok(replays) => replays,
        Err(e) => {
            return Err(e);
        }
    };

    let num_replays = replays.len();
    info!("Got {num_replays} replays.");

    let mut new_games = Vec::new();
    for r in replays {
        let game_timestamp =
            NaiveDateTime::parse_from_str(&r.timestamp, "%Y-%m-%d %H:%M:%S").unwrap();

        let new_game = Game {
            timestamp: game_timestamp,
            id_a: r.player1.id.parse::<i64>().unwrap(),
            name_a: r.player1.name,
            char_a: i16::try_from(r.player1_character).ok().unwrap(),
            platform_a: i16::try_from(r.player1.platform).ok().unwrap(),
            id_b: r.player2.id.parse::<i64>().unwrap(),
            name_b: r.player2.name,
            char_b: i16::try_from(r.player2_character).ok().unwrap(),
            platform_b: i16::try_from(r.player2.platform).ok().unwrap(),
            winner: i16::try_from(r.winner).ok().unwrap(),
            game_floor: i16::try_from(r.floor).ok().unwrap(),
            value_a: None,
            deviation_a: None,
            value_b: None,
            deviation_b: None,
            win_chance: None,
        };

        if let Err(e) = update_player_info(connection, &new_game).await {
            error!("update_player_info failed: {e}");
        }

        //Skip the game if either player a or player b is not Public
        let player_a = players::table
            .filter(players::id.eq(new_game.id_a))
            .get_result::<Player>(connection)
            .await
            .unwrap();
        let player_b = players::table
            .filter(players::id.eq(new_game.id_b))
            .get_result::<Player>(connection)
            .await
            .unwrap();
        if player_a.status != Some(Status::Public) || player_b.status != Some(Status::Public) {
            continue;
        }

        let count = insert_into(games::table)
            .values(&new_game)
            .on_conflict_do_nothing()
            .execute(connection)
            .await
            .unwrap();

        if count > 0 {
            new_games.push(new_game);
        }
    }

    //Sort new_games by timestamp in ascending order
    //This is so that we process older games first
    new_games.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));

    Ok(new_games)
}

async fn update_ratings(
    connection: &mut AsyncPgConnection,
    new_games: &Vec<Game>,
) -> Result<(), String> {
    info!("Updating ratings");
    for g in new_games {
        //Get the player_rating a
        let player_rating_a = match player_ratings::table
            .filter(player_ratings::id.eq(g.id_a))
            .filter(player_ratings::char_id.eq(g.char_a))
            .get_result::<PlayerRating>(connection)
            .await
        {
            Ok(r) => r,
            Err(_) => {
                //Insert the player rating if it's not found
                let new_player_rating = PlayerRating {
                    id: g.id_a,
                    char_id: g.char_a,
                    wins: 0,
                    losses: 0,
                    value: 1500.0,
                    deviation: 250.0,
                    last_decay: g.timestamp,
                };

                diesel::insert_into(player_ratings::table)
                    .values(&new_player_rating)
                    .execute(connection)
                    .await
                    .unwrap();

                new_player_rating
            }
        };
        //Get the player_rating b
        let player_rating_b = match player_ratings::table
            .filter(player_ratings::id.eq(g.id_b))
            .filter(player_ratings::char_id.eq(g.char_b))
            .get_result::<PlayerRating>(connection)
            .await
        {
            Ok(r) => r,
            Err(_) => {
                //Insert the player rating if it's not found
                let new_player_rating = PlayerRating {
                    id: g.id_b,
                    char_id: g.char_b,
                    wins: 0,
                    losses: 0,
                    value: 1500.0,
                    deviation: 250.0,
                    last_decay: g.timestamp,
                };

                diesel::insert_into(player_ratings::table)
                    .values(&new_player_rating)
                    .execute(connection)
                    .await
                    .unwrap();

                new_player_rating
            }
        };

        //Calculate value and deviation
        let (new_value_a, new_value_b, new_deviation_a, new_deviation_b, win_prob) =
            update_mean_and_variance(
                player_rating_a.value as f64,
                player_rating_a.deviation as f64,
                player_rating_b.value as f64,
                player_rating_b.deviation as f64,
                g.winner == 1,
            );

        //Update game table with player ratings
        diesel::update(games::table)
            .filter(games::timestamp.eq(g.timestamp))
            .filter(games::id_a.eq(g.id_a))
            .filter(games::char_a.eq(g.char_a))
            .filter(games::platform_a.eq(g.platform_a))
            .filter(games::id_b.eq(g.id_b))
            .filter(games::char_b.eq(g.char_b))
            .filter(games::platform_b.eq(g.platform_b))
            .set((
                games::value_a.eq(player_rating_a.value),
                games::deviation_a.eq(player_rating_a.deviation),
                games::value_b.eq(player_rating_b.value),
                games::deviation_b.eq(player_rating_b.deviation),
                games::win_chance.eq(win_prob as f32),
            ))
            .execute(connection)
            .await
            .unwrap();

        //Update player_rating a
        diesel::update(player_ratings::table)
            .filter(player_ratings::id.eq(g.id_a))
            .filter(player_ratings::char_id.eq(g.char_a))
            .set((
                player_ratings::value.eq(new_value_a as f32),
                player_ratings::deviation.eq(new_deviation_a as f32),
            ))
            .execute(connection)
            .await
            .unwrap();

        //Update player_rating b
        diesel::update(player_ratings::table)
            .filter(player_ratings::id.eq(g.id_b))
            .filter(player_ratings::char_id.eq(g.char_b))
            .set((
                player_ratings::value.eq(new_value_b as f32),
                player_ratings::deviation.eq(new_deviation_b as f32),
            ))
            .execute(connection)
            .await
            .unwrap();
    }
    info!("Updating ratings - done.");
    Ok(())
}

pub fn update_mean_and_variance(
    mean_a: f64,
    sigma_a: f64,
    mean_b: f64,
    sigma_b: f64,
    a_wins: bool,
) -> (f64, f64, f64, f64, f64) {
    //### Calculate some helpful values. ###

    let rating_diff = mean_a - mean_b; //#This can be negative, that is intended.
    let match_variablity = sigma_a.powf(2.0) + sigma_b.powf(2.0); //#A simple method to combine the variablity of both players.
    let sqrt_match_variablity = f64::sqrt(match_variablity); //#We end up computing this a lot

    //#How likely is a win for A? Bayesian methods let us create a normal distrubution by combining the two players ratings and variabiilies to estimate this.
    let dist = univariate::normal::Normal::standard();
    let x = rating_diff / (sqrt_match_variablity + 241.0);
    let win_prob = dist.cdf(&x);

    //#How suprising was the result?
    //#Also, the direction is positive when A wins, and negative if B wins.
    let result_suprise: f64;
    let direction_of_update: f64;
    if a_wins {
        result_suprise = 1.0 - win_prob;
        direction_of_update = 1.0;
    } else {
        result_suprise = win_prob.into();
        direction_of_update = -1.0;
    }

    //### Update Means ###
    //# We scale the update by how suprising the result is. A win with a 99% chance of winning divides the total update by 100 (multiplying by (1.0 - 0.99) is the same as dividing by 100)
    //# But, since either player could have a contoller failure, computer issue, or any number of other external events. There is always some "suprise" to a win. Therefore, we add 0.001.
    //# This has the added bonus of some numerical stability as well, since result_suprise can be a very small number.
    //# Further, we scale by the variance of the player and divide by the overall variablity of the match.
    let mean_a_new = mean_a
        + direction_of_update
            * 10.0
            * (result_suprise + 0.001)
            * f64::sqrt(sigma_a / sqrt_match_variablity);
    let mean_b_new = mean_b
        - direction_of_update
            * 10.0
            * (result_suprise + 0.001)
            * f64::sqrt(sigma_b / sqrt_match_variablity);

    //# Going over each term:
    //# mean is the original rating of the player
    //# direction_of_update is who won, and that's either 1.0 or -1.0. The direction of the update.
    //# 10 is used to flatly increase the size of updates so they are more human interpretable.
    //# result_suprise is between 0.001 and 1.001, therefore it will (almost) always reduce the size of the update. It models the intuition that a "sure" win doesn't offer much information, whereas a massive upset calls into question our assumptions about how good the player really is.
    //# (sigma**2.5 / match_variablity) = (sigma**2.5 / sigma_A**2 + sigma_B**2). This term effectively reduces the size of the update depending on how uncertain we are about the opponents rating and increased it based on how uncertain we about the player's rating.

    //### Update Variance ###
    //# Before we start, it's important to understand this is *not* a statistical valid way of estiamting variance.
    //# We explicitly are using a simplified, biased, and suboptimal model.
    //# There are two mean reasons for this.
    //# First, the assumptions required to use an unbiased and optimal model are unlikely to be furfilled, causing it to become biased and suboptimal while also being highly complex
    //# Second, optimal and unbiased models tend to be brittle, when they start to break, they break hard.

    //# Onto the biased and suboptimal but also resilent and simple method!
    //# First, we want a higher level scaling factor. This is a number which is pretty close to 1.0, and gently increases or decreases the overall variance.

    //# Second, we want to add or subtract from the variance.
    //# If the result is a suprise, we should add to it, otherwise, reduce.
    //# (result_suprise-0.5) moves result_suprise into the -0.5 to 0.5 range, straddling the 50% win chance.
    //# We multiply that by one hundred and then multiple it again by the result_suprise. Multiplying by result_suprise is a technique from importance sampling.
    //# Then, we want to create a mild reduction in variance if two players of equal skill continously go even.
    //# We multiply by (1-result_suprise) in this case because a 60% suprise should reduce variance less than a 40% suprise.

    let variance_adjustment_factor = (2.0 + result_suprise) / 2.501;
    let variance_adjustment_constant = ((result_suprise - 0.5) * 2.0) * result_suprise;

    let mut sigma_a_new = (sigma_a + variance_adjustment_constant) * variance_adjustment_factor;
    let mut sigma_b_new = (sigma_b + variance_adjustment_constant) * variance_adjustment_factor;

    //#We don't actually want variance to reduce that much if the mean isn't changing.
    //#e.g. A player farming someone rated 500 points below them shouldn't see much change in their variance.

    let adjusted_mean_gap_a = (mean_a - mean_a_new).powf(2.0);
    let adjusted_mean_gap_b = (mean_b - mean_b_new).powf(2.0);

    if adjusted_mean_gap_a < 1.0 {
        sigma_a_new = sigma_a * (1.0 - adjusted_mean_gap_a) + sigma_a_new * adjusted_mean_gap_a
    }
    if adjusted_mean_gap_b < 1.0 {
        sigma_b_new = sigma_b * (1.0 - adjusted_mean_gap_b) + sigma_b_new * adjusted_mean_gap_b
    }

    //# Important to note that a suprising event applies to both players
    //# An upset increases variance for both players, and an expected result decreases it

    //# One last detail to help the stability of the overall model.
    //# Taking the max of the new variation and 1.0 ensures that we don't enter situations where 1.0 or less variance causes numerical problems.
    sigma_a_new = f64::max(1.0, sigma_a_new);
    sigma_b_new = f64::max(1.0, sigma_b_new);

    //#This should be complimented with real time variance increase. I'd suggest no change for the first 21 hours, and then a old_variance*1.05 + 1 increase every 21 hours after.
    //#There are advantages to not using 24 hours.

    (
        mean_a_new,
        mean_b_new,
        sigma_a_new,
        sigma_b_new,
        win_prob.into(),
    )
}
