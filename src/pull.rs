use crate::{ggst_api, schema::player_ratings};

use bb8_redis::redis;
use diesel::prelude::*;
use diesel_async::{AsyncConnection, AsyncPgConnection, RunQueryDsl};
use std::time::{Duration, Instant};
use tokio::time;
use tracing::{debug, error, info, warn};

use crate::schema::{games, player_names, players};
use chrono::{NaiveDateTime, Utc};
use diesel::dsl::*;

use crate::models::*;

use diesel_async::scoped_futures::ScopedFutureExt;

#[derive(Debug)]
enum ReplayPullError {
    Transient(String),
    Session(String),
    Database(diesel::result::Error),
}

impl std::fmt::Display for ReplayPullError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Transient(message) | Self::Session(message) => formatter.write_str(message),
            Self::Database(error) => error.fmt(formatter),
        }
    }
}

impl std::error::Error for ReplayPullError {}

impl From<diesel::result::Error> for ReplayPullError {
    fn from(error: diesel::result::Error) -> Self {
        Self::Database(error)
    }
}

define_sql_function! {
    fn coalesce(x: diesel::sql_types::Nullable<diesel::sql_types::Timestamp>, y: diesel::sql_types::Timestamp) -> diesel::sql_types::Timestamp;
}

pub const ONE_MINUTE: u64 = 1 * 60;
const REPLAY_PULL_INTERVAL_SECONDS: i64 = (ONE_MINUTE * 2) as i64;
const REPLAY_PULL_STARTUP_MINIMUM_AGE_SECONDS: i64 = 100;

fn initial_replay_pull_is_due(current_time: i64, last_successful_pull: i64) -> bool {
    current_time >= last_successful_pull.saturating_add(REPLAY_PULL_STARTUP_MINIMUM_AGE_SECONDS)
}

#[cfg(test)]
mod replay_schedule_tests {
    use super::{
        REPLAY_PULL_STARTUP_MINIMUM_AGE_SECONDS, ReplayStopReason, ggst_api,
        initial_replay_pull_is_due, replay_page_stop_reason,
    };

    #[test]
    fn leaderboard_cadence_survives_restarts_and_handles_missing_timestamps() {
        use chrono::{Duration, NaiveDate};
        let current = NaiveDate::from_ymd_opt(2026, 9, 7)
            .unwrap()
            .and_hms_opt(11, 0, 0)
            .unwrap();
        for interval in [Duration::hours(1), Duration::days(1)] {
            assert!(super::leaderboard_is_due(None, current, interval));
            assert!(super::leaderboard_is_due(
                Some("invalid"),
                current,
                interval
            ));
            let due = (current - interval)
                .format(crate::imdb::UPDATE_TIMESTAMP_FORMAT)
                .to_string();
            assert!(super::leaderboard_is_due(Some(&due), current, interval));
            assert!(!super::leaderboard_is_due(
                Some(&due),
                current - Duration::seconds(1),
                interval
            ));
            assert!(!super::leaderboard_is_due(
                Some("2026-09-08 11:00:00"),
                current,
                interval
            ));
        }
    }

    #[test]
    fn startup_skips_until_the_last_success_is_one_hundred_seconds_old() {
        assert!(!initial_replay_pull_is_due(
            REPLAY_PULL_STARTUP_MINIMUM_AGE_SECONDS - 1,
            0
        ));
        assert!(initial_replay_pull_is_due(
            REPLAY_PULL_STARTUP_MINIMUM_AGE_SECONDS,
            0
        ));
    }

    #[test]
    fn a_future_heartbeat_is_not_due() {
        assert!(!initial_replay_pull_is_due(0, 1));
    }

    #[test]
    fn short_replay_page_stops_at_the_end_of_the_listing() {
        assert_eq!(
            replay_page_stop_reason(1, 1, 1),
            Some(ReplayStopReason::ShortPage)
        );
    }

    #[test]
    fn fully_known_replay_page_stops_after_catching_up() {
        assert_eq!(
            replay_page_stop_reason(ggst_api::REPLAYS_PER_PAGE, 127, 127),
            Some(ReplayStopReason::CaughtUp)
        );
    }

    #[test]
    fn partially_known_replay_page_keeps_catching_up() {
        assert_eq!(
            replay_page_stop_reason(ggst_api::REPLAYS_PER_PAGE, 127, 126),
            None
        );
    }
}

// Safety cap on replay pages fetched in one cycle (30 pages of 127 replays,
// roughly half an hour of games at typical rates). Steady state stops after a
// page or two once a fully-known page is reached, so the cap only bounds
// catch-up depth after downtime and bootstrap cost on an empty database.
// Catch-up failures past page 0 degrade to a partial fetch instead of a
// failed cycle.
const MAX_REPLAY_PAGES: usize = 30;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum ReplayStopReason {
    ShortPage,
    CaughtUp,
    PageLimit,
    PartialError,
}

impl ReplayStopReason {
    fn as_str(self) -> &'static str {
        match self {
            Self::ShortPage => "short_page",
            Self::CaughtUp => "caught_up",
            Self::PageLimit => "page_limit",
            Self::PartialError => "partial_error",
        }
    }
}

#[derive(Debug)]
struct ReplayPullStats {
    pages: usize,
    entries: usize,
    known: usize,
    new_matches: usize,
    stop_reason: ReplayStopReason,
    elapsed: Duration,
    newest: Option<NaiveDateTime>,
    oldest: Option<NaiveDateTime>,
}

fn replay_page_stop_reason(
    page_len: usize,
    checked: i64,
    existing: i64,
) -> Option<ReplayStopReason> {
    if page_len < ggst_api::REPLAYS_PER_PAGE {
        Some(ReplayStopReason::ShortPage)
    } else if checked > 0 && existing == checked {
        Some(ReplayStopReason::CaughtUp)
    } else {
        None
    }
}

//TODO move the db stuff from this file into db.rs and imdb.rs

pub async fn pull_and_update_continuous(state: crate::AppState) {
    // Refresh authenticated leaderboards independently of replay polling.
    let leaderboard_state = state.clone();
    let processing_task = tokio::spawn(async move {
        let mut interval = time::interval(Duration::from_secs(ONE_MINUTE));
        interval.set_missed_tick_behavior(time::MissedTickBehavior::Skip);
        loop {
            interval.tick().await;
            if let Err(error) = refresh_due_leaderboards(&leaderboard_state).await {
                error!(%error, "Leaderboard update failed");
            }
        }
    });

    // Replay pulling loop. At a two-minute cadence, the windowed
    // catch-up fetches however many pages accumulated since the last cycle.
    let pull_state = state.clone();
    let pull_task = tokio::spawn(async move {
        let mut interval = time::interval(Duration::from_secs(REPLAY_PULL_INTERVAL_SECONDS as u64));
        interval.set_missed_tick_behavior(time::MissedTickBehavior::Skip);
        let mut check_startup_heartbeat = true;

        loop {
            interval.tick().await;

            let mut redis_connection = match pull_state.redis_pool.get().await {
                Ok(connection) => connection,
                Err(error) => {
                    error!(%error, "Could not get a Redis connection for replay ingestion");
                    continue;
                }
            };
            if check_startup_heartbeat {
                check_startup_heartbeat = false;
                if let Ok(last_successful_pull) =
                    crate::imdb::get_last_successful_replay_pull(&mut redis_connection).await
                    && !initial_replay_pull_is_due(Utc::now().timestamp(), last_successful_pull)
                {
                    debug!(
                        last_successful_pull,
                        "Initial replay pull skipped because the last success was less than 100 seconds ago"
                    );
                    continue;
                }
            }

            let token = match ggst_api::get_token(true).await {
                Ok(token) => token,
                Err(error) => {
                    error!("Could not get a GGST API session: {error}");
                    continue;
                }
            };

            if ggst_api::session_is_blocked(&token).await {
                continue;
            }

            debug!("Replay pull");

            let mut connection = match pull_state.db_pool.get().await {
                Ok(connection) => connection,
                Err(error) => {
                    error!(%error, "Could not get a database connection for replay ingestion");
                    continue;
                }
            };
            let request_token = token.clone();

            let pull_result = connection
                .transaction::<_, ReplayPullError, _>(|conn| {
                    async move { grab_games(conn, &mut redis_connection, &request_token).await }
                        .scope_boxed()
                })
                .await;

            match pull_result {
                Ok(stats) => match pull_state.redis_pool.get().await {
                    Ok(mut heartbeat_connection) => {
                        if let Err(error) =
                            crate::imdb::set_last_successful_replay_pull(&mut heartbeat_connection)
                                .await
                        {
                            error!(
                                "Replay pull succeeded but its heartbeat could not be recorded: {error}"
                            );
                        } else {
                            log_replay_pull(&stats);
                        }
                    }
                    Err(error) => error!(
                        "Replay pull succeeded but no Redis connection was available to record its heartbeat: {error}"
                    ),
                },
                Err(ReplayPullError::Session(error)) => {
                    tracing::error!(
                        error = %error,
                        "GGST replay pull stopped until a new API session is available"
                    );
                    ggst_api::block_session(&token, &error).await;
                }
                Err(error) => {
                    error!("Replay pull failed; the current session will be retried: {error}");
                }
            }
        }
    });

    let stats_task = tokio::spawn(crate::stats::run_scheduled(state));
    tokio::select! {
        _ = stats_task => {},
        _ = processing_task => {},
        _ = pull_task => {},
    }
}

fn log_replay_pull(stats: &ReplayPullStats) {
    let newest = stats
        .newest
        .map(|timestamp| {
            timestamp
                .and_utc()
                .to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
        })
        .unwrap_or_else(|| "n/a".into());
    let newest_age_seconds = stats
        .newest
        .map(|timestamp| {
            Utc::now()
                .timestamp()
                .saturating_sub(timestamp.and_utc().timestamp())
                .max(0)
                .to_string()
        })
        .unwrap_or_else(|| "n/a".into());
    let span_minutes = stats
        .newest
        .zip(stats.oldest)
        .map(|(newest, oldest)| newest.signed_duration_since(oldest).num_minutes().max(0))
        .unwrap_or(0);

    info!(
        pages = stats.pages,
        entries = stats.entries,
        known = stats.known,
        new_matches = stats.new_matches,
        stop_reason = stats.stop_reason.as_str(),
        elapsed_ms = stats.elapsed.as_millis() as u64,
        newest = %newest,
        newest_age_seconds = %newest_age_seconds,
        span_minutes,
        "GGST replay pull completed"
    );
}

fn leaderboard_is_due(
    last_update: Option<&str>,
    current_time: NaiveDateTime,
    interval: chrono::Duration,
) -> bool {
    last_update
        .and_then(|value| {
            NaiveDateTime::parse_from_str(value, crate::imdb::UPDATE_TIMESTAMP_FORMAT).ok()
        })
        .is_none_or(|last| current_time >= last + interval)
}

#[derive(Default, serde::Serialize, serde::Deserialize)]
struct LeaderboardRetry {
    failures: u32,
    retry_at: i64,
}

impl LeaderboardRetry {
    fn failed(&self, current_time: i64) -> Self {
        // Five minutes, doubling to one hour. Persisted so restarts do not reset it.
        let delay = (300_i64 * (1_i64 << self.failures.min(4))).min(3600);
        Self {
            failures: self.failures.saturating_add(1),
            retry_at: current_time.saturating_add(delay),
        }
    }

    fn ready(&self, current_time: i64) -> bool {
        current_time >= self.retry_at
    }
}

async fn refresh_due_leaderboards(state: &crate::AppState) -> Result<(), String> {
    refresh_due_leaderboards_with(state, &GameLeaderboards).await
}

async fn refresh_due_leaderboards_with(
    state: &crate::AppState,
    source: &impl LeaderboardSource,
) -> Result<(), String> {
    let mut redis = state
        .redis_pool
        .get()
        .await
        .map_err(|error| error.to_string())?;
    for (key, interval, legend) in [
        ("last_update_legend", chrono::Duration::hours(1), true),
        ("last_update_leaderboards", chrono::Duration::days(1), false),
    ] {
        let last = crate::imdb::get_last_update(&mut redis, key)
            .await
            .map_err(|error| error.to_string())?;
        if !leaderboard_is_due(last.as_deref(), Utc::now().naive_utc(), interval) {
            continue;
        }
        let retry_key = format!("{key}:retry");
        let encoded: Option<String> = redis::cmd("GET")
            .arg(&retry_key)
            .query_async(&mut *redis)
            .await
            .map_err(|error| error.to_string())?;
        let retry: LeaderboardRetry = encoded
            .as_deref()
            .map(serde_json::from_str)
            .transpose()
            .map_err(|error| format!("Invalid leaderboard retry state: {error}"))?
            .unwrap_or_default();
        if !retry.ready(Utc::now().timestamp()) {
            continue;
        }
        // Reserve a retry delay before requests as well, covering a process crash.
        let next = retry.failed(Utc::now().timestamp());
        redis::cmd("SET")
            .arg(&retry_key)
            .arg(serde_json::to_string(&next).map_err(|error| error.to_string())?)
            .query_async::<()>(&mut *redis)
            .await
            .map_err(|error| error.to_string())?;
        let result = if legend {
            fetch_legend_leaderboard(source).await
        } else {
            fetch_global_leaderboards(source).await
        };
        match result {
            Ok(snapshot) => {
                // Publish the entire crawl and its timestamp together. A failed page
                // leaves every key at the previous successful snapshot.
                let mut publication = redis::pipe();
                publication.atomic();
                for (cache_key, json) in snapshot {
                    publication.set(cache_key, json).ignore();
                }
                publication
                    .set(key, crate::imdb::update_timestamp())
                    .ignore()
                    .del(&retry_key)
                    .ignore()
                    .query_async::<()>(&mut *redis)
                    .await
                    .map_err(|error| error.to_string())?;
            }
            Err(error) => {
                // Start the delay at completion, even if the crawl exceeded a tick.
                let next = retry.failed(Utc::now().timestamp());
                redis::cmd("SET")
                    .arg(&retry_key)
                    .arg(serde_json::to_string(&next).map_err(|error| error.to_string())?)
                    .query_async::<()>(&mut *redis)
                    .await
                    .map_err(|error| error.to_string())?;
                error!(%error, key, retry_at = next.retry_at, "Leaderboard refresh failed; backing off");
            }
        }
    }
    Ok(())
}

type LeaderboardSnapshot = Vec<(String, String)>;

async fn fetch_legend_leaderboard(
    source: &impl LeaderboardSource,
) -> Result<LeaderboardSnapshot, String> {
    let entries: Vec<crate::responses::LeaderboardEntry> = source.legend().await?;
    Ok(vec![(
        "leaderboard_legend".to_owned(),
        serde_json::to_string(&entries).map_err(|error| error.to_string())?,
    )])
}

trait LeaderboardSource: Sync {
    async fn legend(&self) -> Result<Vec<crate::responses::LeaderboardEntry>, String>;
    async fn mr(
        &self,
        page: i64,
        character: i64,
    ) -> Result<Vec<crate::responses::LeaderboardEntry>, String>;
    async fn lp(
        &self,
        page: i64,
        character: i64,
    ) -> Result<Vec<crate::responses::LeaderboardEntry>, String>;
    async fn pause(&self) {
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
}

struct GameLeaderboards;
impl LeaderboardSource for GameLeaderboards {
    async fn legend(&self) -> Result<Vec<crate::responses::LeaderboardEntry>, String> {
        Ok(ggst_api::get_rank_match_legend()
            .await?
            .into_iter()
            .map(Into::into)
            .collect())
    }
    async fn mr(
        &self,
        page: i64,
        character: i64,
    ) -> Result<Vec<crate::responses::LeaderboardEntry>, String> {
        Ok(ggst_api::get_rank_match_mr(page, character)
            .await?
            .into_iter()
            .map(Into::into)
            .collect())
    }
    async fn lp(
        &self,
        page: i64,
        character: i64,
    ) -> Result<Vec<crate::responses::LeaderboardEntry>, String> {
        Ok(ggst_api::get_rank_match_lp(page, character)
            .await?
            .into_iter()
            .map(Into::into)
            .collect())
    }
}

async fn fetch_global_leaderboards(
    source: &impl LeaderboardSource,
) -> Result<LeaderboardSnapshot, String> {
    use crate::responses::LeaderboardEntry;

    info!("Syncing global leaderboards");
    let mut snapshot = Vec::new();

    let mut mr_all: Vec<LeaderboardEntry> = Vec::new();
    let mut page = 0i64;
    loop {
        match source.mr(page, -1).await {
            Ok(players) => {
                let n = players.len();
                if n == 0 {
                    info!("MR: page {page} empty, done ({} total)", mr_all.len());
                    break;
                }
                mr_all.extend(players.into_iter().map(LeaderboardEntry::from));
                info!("MR: page {page} ({n} entries, {} total)", mr_all.len());
                if n < 20 {
                    info!("MR: partial page, done ({} total)", mr_all.len());
                    break;
                }
                page += 1;
                source.pause().await;
            }
            Err(e) => {
                return Err(format!(
                    "sync_global_leaderboards: MR page {page} failed: {e}"
                ));
            }
        }
    }

    let mr_keys: std::collections::HashSet<(String, i64)> = mr_all
        .iter()
        .map(|e| (e.player_id.clone(), e.char_id))
        .collect();
    let mr_count = mr_all.len();

    let mut lp_filtered: Vec<LeaderboardEntry> = Vec::new();
    let mut page = 0i64;
    loop {
        match source.lp(page, -1).await {
            Ok(players) => {
                let n = players.len();
                if n == 0 {
                    info!("LP: page {page} empty, done ({} kept)", lp_filtered.len());
                    break;
                }
                let before = lp_filtered.len();
                for mut entry in players.into_iter().map(LeaderboardEntry::from) {
                    if !mr_keys.contains(&(entry.player_id.clone(), entry.char_id)) {
                        entry.rank = (mr_count + lp_filtered.len() + 1) as i64;
                        lp_filtered.push(entry);
                    }
                }
                info!(
                    "LP: page {page} ({n} entries, {} kept after dedup, {} total)",
                    lp_filtered.len() - before,
                    lp_filtered.len()
                );
                if n < 20 {
                    info!("LP: partial page, done ({} kept)", lp_filtered.len());
                    break;
                } else if lp_filtered.len() >= 1000 {
                    info!(
                        "LP: reached 1000 kept entries, stopping ({} total)",
                        lp_filtered.len()
                    );
                    break;
                }
                page += 1;
                source.pause().await;
            }
            Err(e) => {
                return Err(format!(
                    "sync_global_leaderboards: LP page {page} failed: {e}"
                ));
            }
        }
    }

    let lp_count = lp_filtered.len();
    let mut combined = mr_all;
    combined.extend(lp_filtered);

    info!(
        "Combined leaderboard: {} MR + {} LP = {} total",
        mr_count,
        lp_count,
        combined.len()
    );
    snapshot.push((
        "leaderboard_all".to_owned(),
        serde_json::to_string(&combined).map_err(|error| error.to_string())?,
    ));

    for (char_idx, (char_short, _)) in crate::CHAR_NAMES.iter().enumerate() {
        let char_id = char_idx as i64;

        let mut mr_char: Vec<LeaderboardEntry> = Vec::new();
        let mut page = 0i64;
        loop {
            match source.mr(page, char_id).await {
                Ok(players) => {
                    let n = players.len();
                    if n == 0 {
                        info!(
                            "Char {char_short} MR: page {page} empty, done ({} total)",
                            mr_char.len()
                        );
                        break;
                    }
                    mr_char.extend(players.into_iter().map(LeaderboardEntry::from));
                    info!(
                        "Char {char_short} MR: page {page} ({n} entries, {} total)",
                        mr_char.len()
                    );
                    if n < 20 || mr_char.len() >= 1000 {
                        info!("Char {char_short} MR: done ({} total)", mr_char.len());
                        break;
                    }
                    page += 1;
                    source.pause().await;
                }
                Err(e) => {
                    return Err(format!(
                        "sync_global_leaderboards: char {char_short} MR page {page} failed: {e}"
                    ));
                }
            }
        }
        mr_char.truncate(1000);

        let mr_player_ids: std::collections::HashSet<String> =
            mr_char.iter().map(|e| e.player_id.clone()).collect();
        let mr_count = mr_char.len();

        let mut lp_char: Vec<LeaderboardEntry> = Vec::new();
        let mut page = 0i64;
        loop {
            match source.lp(page, char_id).await {
                Ok(players) => {
                    let n = players.len();
                    if n == 0 {
                        info!(
                            "Char {char_short} LP: page {page} empty, done ({} kept)",
                            lp_char.len()
                        );
                        break;
                    }
                    let before = lp_char.len();
                    for mut entry in players.into_iter().map(LeaderboardEntry::from) {
                        if !mr_player_ids.contains(&entry.player_id) {
                            entry.rank = (mr_count + lp_char.len() + 1) as i64;
                            lp_char.push(entry);
                        }
                    }
                    info!(
                        "Char {char_short} LP: page {page} ({n} entries, {} kept after dedup, {} total)",
                        lp_char.len() - before,
                        lp_char.len()
                    );
                    if n < 20 || mr_count + lp_char.len() >= 1000 {
                        info!("Char {char_short} LP: done ({} kept)", lp_char.len());
                        break;
                    }
                    page += 1;
                    source.pause().await;
                }
                Err(e) => {
                    return Err(format!(
                        "sync_global_leaderboards: char {char_short} LP page {page} failed: {e}"
                    ));
                }
            }
        }

        let mut combined = mr_char;
        combined.extend(lp_char);
        combined.truncate(1000);

        let key = format!("leaderboard_char_{}", char_idx);
        snapshot.push((
            key,
            serde_json::to_string(&combined).map_err(|error| error.to_string())?,
        ));

        source.pause().await;
    }

    info!("Syncing global leaderboards - Done");
    Ok(snapshot)
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

    //Update player rating
    insert_into(player_ratings::table)
        .values(&PlayerRating {
            id: new_game.id_a,
            char_id: new_game.char_a,
            value: new_game.value_a,
        })
        .on_conflict((player_ratings::id, player_ratings::char_id))
        .do_update()
        .set(player_ratings::value.eq(new_game.value_a))
        .execute(connection)
        .await
        .unwrap();

    insert_into(player_ratings::table)
        .values(&PlayerRating {
            id: new_game.id_b,
            char_id: new_game.char_b,
            value: new_game.value_b,
        })
        .on_conflict((player_ratings::id, player_ratings::char_id))
        .do_update()
        .set(player_ratings::value.eq(new_game.value_b))
        .execute(connection)
        .await
        .unwrap();

    Ok(())
}

async fn grab_games(
    connection: &mut AsyncPgConnection,
    redis_connection: &mut crate::RedisConnection<'_>,
    token: &str,
) -> Result<ReplayPullStats, ReplayPullError> {
    let started = Instant::now();
    debug!("Grabbing replays");

    let mut replays = Vec::new();
    let mut pages_fetched = 0;
    let mut known = 0;
    let mut stop_reason = ReplayStopReason::PageLimit;

    for page in 0..MAX_REPLAY_PAGES {
        let page_replays = match ggst_api::get_replay_page(token, page).await {
            Ok(r) => r,
            Err(e) if page > 0 && !e.blocks_session() => {
                warn!(
                    "get_replay_page({page}) failed during catch-up, using the {} replays fetched so far: {e}",
                    replays.len()
                );
                stop_reason = ReplayStopReason::PartialError;
                break;
            }
            Err(e) if e.blocks_session() => return Err(ReplayPullError::Session(e.to_string())),
            Err(e) => return Err(ReplayPullError::Transient(e.to_string())),
        };

        pages_fetched += 1;
        let page_len = page_replays.len();

        // Pagination stops when an entire page already exists in the database
        // (primary-key lookups), which means this fetch has bridged into the
        // previous cycle's data. Existence is checked per game rather than by
        // comparing timestamps: client clocks skew in both directions, so a
        // single stray timestamp must not end pagination early. A partially
        // known boundary page keeps paginating one more page.
        let mut existing_query = games::table
            .filter(sql::<diesel::sql_types::Bool>("FALSE"))
            .into_boxed();
        let mut checked: i64 = 0;
        for r in &page_replays {
            let (Ok(ts), Ok(id_a), Ok(id_b)) = (
                NaiveDateTime::parse_from_str(&r.timestamp, "%Y-%m-%d %H:%M:%S"),
                r.player1.id.parse::<i64>(),
                r.player2.id.parse::<i64>(),
            ) else {
                continue;
            };
            checked += 1;
            existing_query = existing_query.or_filter(
                games::timestamp
                    .eq(ts)
                    .and(games::id_a.eq(id_a))
                    .and(games::id_b.eq(id_b)),
            );
        }
        let existing: i64 = if checked > 0 {
            existing_query.count().get_result(connection).await?
        } else {
            0
        };
        known += usize::try_from(existing).unwrap_or(0);

        replays.extend(page_replays);

        if let Some(reason) = replay_page_stop_reason(page_len, checked, existing) {
            stop_reason = reason;
            break;
        }
    }

    if stop_reason == ReplayStopReason::PageLimit {
        warn!(
            "Catch-up depth exhausted after {pages_fetched} pages without reaching already-stored games; older games in this window are likely lost"
        );
    }

    let num_replays = replays.len();
    debug!("Got {num_replays} replays over {pages_fetched} pages.");
    let newest = replays
        .iter()
        .filter_map(|replay| {
            NaiveDateTime::parse_from_str(&replay.timestamp, "%Y-%m-%d %H:%M:%S").ok()
        })
        .max();
    let oldest = replays
        .iter()
        .filter_map(|replay| {
            NaiveDateTime::parse_from_str(&replay.timestamp, "%Y-%m-%d %H:%M:%S").ok()
        })
        .min();

    replays.reverse();

    let mut new_games = Vec::new();

    //Try to keep order if possible
    let mut seconds_offset = 0;

    // A record that fails to parse here came from a response that already
    // decrypted and deserialized, so the session is healthy and a new one
    // cannot fix the record; skip it instead of pausing pulling.
    macro_rules! field_or_skip {
        ($parse:expr, $field:literal, $value:expr) => {
            match $parse {
                Ok(parsed) => parsed,
                Err(_) => {
                    warn!("Skipping replay with invalid {}: {}", $field, $value);
                    continue;
                }
            }
        };
    }

    for r in replays {
        let game_timestamp = field_or_skip!(
            NaiveDateTime::parse_from_str(&r.timestamp, "%Y-%m-%d %H:%M:%S"),
            "timestamp",
            r.timestamp
        );

        let fixed_timestamp;

        // If the game_timestamp is more than 2 seconds in the future, set it to current time
        if game_timestamp > Utc::now().naive_utc()
            && game_timestamp > Utc::now().naive_utc() + chrono::Duration::seconds(2)
        {
            fixed_timestamp = Some(chrono::SubsecRound::round_subsecs(
                Utc::now().naive_utc() + chrono::Duration::seconds(seconds_offset),
                0,
            ));
        } else {
            fixed_timestamp = None;
        }

        let new_game = Game {
            timestamp: game_timestamp,
            real_timestamp: fixed_timestamp,
            id_a: field_or_skip!(r.player1.id.parse::<i64>(), "player 1 id", r.player1.id),
            name_a: r.player1.name.clone(),
            char_a: field_or_skip!(
                i16::try_from(r.player1_character),
                "player 1 character",
                r.player1_character
            ),
            platform_a: field_or_skip!(
                i16::try_from(r.player1.platform),
                "player 1 platform",
                r.player1.platform
            ),
            id_b: field_or_skip!(r.player2.id.parse::<i64>(), "player 2 id", r.player2.id),
            name_b: r.player2.name.clone(),
            char_b: field_or_skip!(
                i16::try_from(r.player2_character),
                "player 2 character",
                r.player2_character
            ),
            platform_b: field_or_skip!(
                i16::try_from(r.player2.platform),
                "player 2 platform",
                r.player2.platform
            ),
            winner: field_or_skip!(i16::try_from(r.winner), "winner", r.winner),
            game_floor: field_or_skip!(i16::try_from(r.floor), "floor", r.floor),
            value_a: r.player1.rating,
            value_b: r.player2.rating,
        };

        if let Err(e) = update_player_info(connection, &new_game).await {
            error!("update_player_info failed: {e}");
        }

        let count = insert_into(games::table)
            .values(&new_game)
            .on_conflict_do_nothing()
            .execute(connection)
            .await
            .unwrap();

        if count > 0 {
            if fixed_timestamp.is_some() {
                seconds_offset += 1;
                debug!(
                    "Fixing timestamp {} -> {} - {} vs {}",
                    r.timestamp,
                    fixed_timestamp.unwrap(),
                    r.player1.name,
                    r.player2.name
                );
            }

            new_games.push(new_game);
        }
    }

    // Preserve the newest upstream game timestamp as data-freshness metadata.
    if let Some(last_game) = new_games.last() {
        let ts = last_game.real_timestamp.unwrap_or(last_game.timestamp);

        crate::imdb::set_latest_game_time(ts, redis_connection)
            .await
            .unwrap();
    }

    debug!("Grabbing replays - Done");
    Ok(ReplayPullStats {
        pages: pages_fetched,
        entries: num_replays,
        known,
        new_matches: new_games.len(),
        stop_reason,
        elapsed: started.elapsed(),
        newest,
        oldest,
    })
}

#[cfg(test)]
mod leaderboard_tests {
    use super::*;
    use crate::responses::LeaderboardEntry;
    use std::sync::atomic::{AtomicUsize, Ordering};

    struct FakeSource {
        calls: AtomicUsize,
        fail_character: Option<i64>,
    }
    impl FakeSource {
        fn new(fail_character: Option<i64>) -> Self {
            Self {
                calls: AtomicUsize::new(0),
                fail_character,
            }
        }
    }
    impl LeaderboardSource for FakeSource {
        async fn legend(&self) -> Result<Vec<LeaderboardEntry>, String> {
            Ok(vec![])
        }
        async fn mr(&self, page: i64, character: i64) -> Result<Vec<LeaderboardEntry>, String> {
            self.calls.fetch_add(1, Ordering::SeqCst);
            if page == 1 && self.fail_character == Some(character) {
                return Err("HTTP 503 Service Unavailable".into());
            }
            if page > 0 {
                return Ok(vec![]);
            }
            Ok((0..20)
                .map(|i| LeaderboardEntry {
                    rank: i + 1,
                    player_id: i.to_string(),
                    player_name: "Test".into(),
                    char_id: character.max(0),
                    rating: 1000,
                })
                .collect())
        }
        async fn lp(&self, _: i64, _: i64) -> Result<Vec<LeaderboardEntry>, String> {
            Ok(vec![])
        }
        async fn pause(&self) {}
    }

    #[test]
    fn retries_back_off_from_completion_and_survive_serialization() {
        let mut retry = LeaderboardRetry::default();
        for delay in [300, 600, 1200, 2400, 3600, 3600] {
            let completed_at = retry.retry_at + 900;
            retry = retry.failed(completed_at);
            let persisted = serde_json::to_string(&retry).unwrap();
            retry = serde_json::from_str(&persisted).unwrap();
            assert_eq!(retry.retry_at, completed_at + delay);
            assert!(!retry.ready(retry.retry_at - 1));
            assert!(retry.ready(retry.retry_at));
        }
    }

    #[tokio::test]
    async fn late_page_failure_produces_no_publishable_snapshot() {
        let source = FakeSource::new(Some(crate::CHAR_NAMES.len() as i64 - 1));
        let error = fetch_global_leaderboards(&source).await.unwrap_err();
        assert!(error.contains("503"));
        assert!(AtomicUsize::load(&source.calls, Ordering::SeqCst) > crate::CHAR_NAMES.len());
    }

    #[tokio::test]
    async fn successful_crawl_contains_every_leaderboard() {
        let snapshot = fetch_global_leaderboards(&FakeSource::new(None))
            .await
            .unwrap();
        assert_eq!(snapshot.len(), crate::CHAR_NAMES.len() + 1);
        assert_eq!(snapshot[0].0, "leaderboard_all");
        for (index, (key, data)) in snapshot.iter().skip(1).enumerate() {
            assert_eq!(key, &format!("leaderboard_char_{index}"));
            assert_eq!(
                serde_json::from_str::<Vec<LeaderboardEntry>>(data)
                    .unwrap()
                    .len(),
                20
            );
        }
    }

    #[tokio::test]
    #[ignore = "requires migrated disposable TEST_DATABASE_URL and TEST_REDIS_URL"]
    async fn maintenance_preserves_snapshot_and_persisted_backoff_prevents_recrawl() {
        let db_pool = bb8::Pool::builder()
            .build(
                diesel_async::pooled_connection::AsyncDieselConnectionManager::new(
                    std::env::var("TEST_DATABASE_URL").unwrap(),
                ),
            )
            .await
            .unwrap();
        let redis_pool = bb8::Pool::builder()
            .build(
                bb8_redis::RedisConnectionManager::new(std::env::var("TEST_REDIS_URL").unwrap())
                    .unwrap(),
            )
            .await
            .unwrap();
        let state = crate::AppState {
            db_pool,
            redis_pool,
        };
        let mut redis = state.redis_pool.get().await.unwrap();
        let old = "2020-01-01 00:00:00";
        redis::pipe()
            .atomic()
            .set("last_update_legend", crate::imdb::update_timestamp())
            .ignore()
            .set("last_update_leaderboards", old)
            .ignore()
            .del("last_update_leaderboards:retry")
            .ignore()
            .set("leaderboard_all", "old global")
            .ignore()
            .set("leaderboard_char_0", "old character")
            .ignore()
            .query_async::<()>(&mut *redis)
            .await
            .unwrap();
        let failed = FakeSource::new(Some(crate::CHAR_NAMES.len() as i64 - 1));
        refresh_due_leaderboards_with(&state, &failed)
            .await
            .unwrap();
        let values: Vec<String> = redis::cmd("MGET")
            .arg(&[
                "leaderboard_all",
                "leaderboard_char_0",
                "last_update_leaderboards",
            ])
            .query_async(&mut *redis)
            .await
            .unwrap();
        assert_eq!(values, vec!["old global", "old character", old]);
        let replacement = FakeSource::new(None);
        refresh_due_leaderboards_with(&state, &replacement)
            .await
            .unwrap();
        assert_eq!(AtomicUsize::load(&replacement.calls, Ordering::SeqCst), 0);
        redis::cmd("DEL")
            .arg("last_update_leaderboards:retry")
            .query_async::<()>(&mut *redis)
            .await
            .unwrap();
        refresh_due_leaderboards_with(&state, &replacement)
            .await
            .unwrap();
        let encoded: String = redis::cmd("GET")
            .arg("leaderboard_all")
            .query_async(&mut *redis)
            .await
            .unwrap();
        assert_eq!(
            serde_json::from_str::<Vec<LeaderboardEntry>>(&encoded)
                .unwrap()
                .len(),
            20
        );
        assert_ne!(
            crate::imdb::get_last_update(&mut redis, "last_update_leaderboards")
                .await
                .unwrap()
                .unwrap(),
            old
        );
        assert_eq!(
            redis::cmd("EXISTS")
                .arg("last_update_leaderboards:retry")
                .query_async::<i64>(&mut *redis)
                .await
                .unwrap(),
            0
        );
    }
}
