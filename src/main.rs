use axum::extract::{Path, Query};
use axum::http::header::{self, ACCEPT, AUTHORIZATION, CONTENT_TYPE, ORIGIN};
use axum::http::{HeaderMap, HeaderValue, Method};
use axum::response::IntoResponse;
use axum::{extract::State, http::StatusCode, response::Json, routing::get, Router};
use bb8::PooledConnection;
use diesel_async::{pooled_connection::AsyncDieselConnectionManager, AsyncPgConnection};
use handlers::common::{Pagination, TagResponse};
use models::Player;
use serde::{Deserialize, Serialize, Serializer};

fn serialize_i64_as_string<S: Serializer>(v: &i64, s: S) -> Result<S::Ok, S::Error> {
    s.serialize_str(&v.to_string())
}
use std::collections::{HashMap, HashSet};
use std::ops::Deref;
use std::vec;
use tower_http::cors::{Any, CorsLayer};
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::layer::SubscriberExt;
//use diesel::query_dsl::positional_order_dsl::{OrderColumn, PositionalOrderDsl, IntoOrderColumn};

use bb8_redis::{bb8, RedisConnectionManager};

use crate::models::PlayerRating;

type Pool = bb8::Pool<AsyncDieselConnectionManager<AsyncPgConnection>>;
type RedisPool = bb8::Pool<RedisConnectionManager>;

type Connection<'a> = PooledConnection<'a, AsyncDieselConnectionManager<AsyncPgConnection>>;
type RedisConnection<'a> = PooledConnection<'a, RedisConnectionManager>;

#[derive(Clone)]
struct AppState {
    db_pool: Pool,
    redis_pool: RedisPool,
}

mod db;
mod ggst_api;
mod handlers;
mod imdb;
mod models;
mod pull;
mod requests;
mod responses;
mod schema;

pub const CHAR_NAMES: &[(&str, &str)] = &[
    ("SO", "Sol"),
    ("KY", "Ky"),
    ("MA", "May"),
    ("AX", "Axl"),
    ("CH", "Chipp"),
    ("PO", "Potemkin"),
    ("FA", "Faust"),
    ("MI", "Millia"),
    ("ZA", "Zato-1"),
    ("RA", "Ramlethal"),
    ("LE", "Leo"),
    ("NA", "Nagoriyuki"),
    ("GI", "Giovanna"),
    ("AN", "Anji"),
    ("IN", "I-No"),
    ("GO", "Goldlewis"),
    ("JC", "Jack-O'"),
    ("HA", "Happy Chaos"),
    ("BA", "Baiken"),
    ("TE", "Testament"),
    ("BI", "Bridget"),
    ("SI", "Sin"),
    ("BE", "Bedman?"),
    ("AS", "Asuka"),
    ("JN", "Johnny"),
    ("EL", "Elphelt"),
    ("AB", "A.B.A."),
    ("SL", "Slayer"),
    ("DI", "Dizzy"),
    ("VE", "Venom"),
    ("UN", "Unika"),
    ("LU", "Lucy"),
    ("JA", "Jam"),
];

async fn player(
    State(pools): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<crate::handlers::player::PlayerResponse>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let (player_char, match_counts, mut top_chars, top_defeated, top_rating, mut top_global, tags) =
        match db::get_player_response_data(id, &mut db).await {
            Ok(response) => response,
            Err(e) => return Err((StatusCode::NOT_FOUND, e)),
        };

    let mut redis = pools.redis_pool.get().await.unwrap();
    let legend_keys = get_legend_keys(&mut redis).await;

    let leaderboard: Vec<responses::LeaderboardEntry> = read_leaderboard(&mut redis, "leaderboard_all")
        .await
        .unwrap_or_else(|_| vec![]);

    let player_id_str = id.to_string();

    if !leaderboard.is_empty() {
        // top_global: best rank across all chars
        if let Some(entry) = leaderboard.iter()
            .filter(|e| e.player_id == player_id_str)
            .min_by_key(|e| e.rank)
        {
            top_global = entry.rank as i32;
        }
    }

    // top_chars: position within each character's specific leaderboard
    for (_, rating) in &player_char {
        let key = format!("leaderboard_char_{}", rating.char_id);
        let char_leaderboard = read_leaderboard(&mut redis, &key).await.unwrap_or_else(|_| vec![]);
        if let Some(pos) = char_leaderboard.iter().position(|e| e.player_id == player_id_str) {
            top_chars.insert(rating.char_id, (pos + 1) as i32);
        }
    }

    match handlers::player::handle_get_player(
        player_char,
        match_counts,
        top_chars,
        top_defeated,
        top_rating,
        top_global,
        tags,
        legend_keys,
    )
    .await
    {
        Ok(response) => Ok(Json(response)),
        Err(e) => Err((StatusCode::NOT_FOUND, e)),
    }
}

async fn player_history(
    State(pools): State<AppState>,
    Path((player_id, char_id)): Path<(i64, String)>,
    Query(pagination): Query<Pagination>,
) -> Result<Json<handlers::player_history::PlayerGamesResponse>, (StatusCode, String)> {
    let char_id = match CHAR_NAMES.iter().position(|(c, _)| *c == char_id) {
        Some(id) => id as i16,
        None => {
            return Err((StatusCode::NOT_FOUND, "Character not found".to_string()));
        }
    };

    let mut db = pools.db_pool.get().await.unwrap();

    let count = pagination.count.unwrap_or(100) as i64;
    let offset = pagination.offset.unwrap_or(0) as i64;

    let games: Vec<models::Game> =
        match db::get_games(player_id, char_id, count, offset, &mut db).await {
            Ok(games) => games,
            Err(e) => return Err((StatusCode::NOT_FOUND, e)),
        };

    //Get tags
    let mut player_ids = HashSet::new();
    for game in &games {
        player_ids.insert(game.id_a);
        player_ids.insert(game.id_b);
    }
    let player_tags = match db::get_tags_from_player_list(player_ids, &mut db).await {
        Ok(tags) => tags,
        Err(_) => HashMap::new(),
    };

    let mut redis = pools.redis_pool.get().await.unwrap();
    let legend_keys = get_legend_keys(&mut redis).await;

    match handlers::player_history::handle_get_player_history(player_id, games, player_tags, legend_keys).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => Err((StatusCode::NOT_FOUND, e)),
    }
}

async fn get_legend_keys(redis: &mut crate::RedisConnection<'_>) -> HashSet<(i64, i64)> {
    use bb8_redis::redis;
    let data: Result<String, redis::RedisError> = redis::cmd("GET")
        .arg("leaderboard_legend")
        .query_async(&mut **redis)
        .await;
    match data {
        Ok(json) => {
            let entries: Vec<responses::LeaderboardEntry> =
                serde_json::from_str(&json).unwrap_or_default();
            entries
                .iter()
                .filter_map(|e| e.player_id.parse::<i64>().ok().map(|id| (id, e.char_id)))
                .collect()
        }
        Err(_) => HashSet::new(),
    }
}

fn build_rank_response(
    entries: &[responses::LeaderboardEntry],
    legend_keys: &HashSet<(i64, i64)>,
    player_tags: &HashMap<i64, Vec<(String, String)>>,
    offset: usize,
    count: usize,
) -> handlers::top::RankResponse {
    use handlers::top::{PlayerRankResponse, RankResponse, TagResponse};
    let ranks = entries
        .iter()
        .skip(offset)
        .take(count)
        .map(|e| {
            let id = e.player_id.parse::<i64>().unwrap_or(0);
            let tags = player_tags.get(&id).map(|t| {
                t.iter().map(|(tag, style)| TagResponse {
                    tag: tag.clone(),
                    style: style.clone(),
                }).collect()
            }).unwrap_or_default();
            PlayerRankResponse {
                rank: e.rank,
                id,
                name: e.player_name.clone(),
                rating: e.rating,
                char_short: CHAR_NAMES[e.char_id as usize].0.to_string(),
                char_long: CHAR_NAMES[e.char_id as usize].1.to_string(),
                is_legend: legend_keys.contains(&(id, e.char_id)),
                tags,
            }
        })
        .collect();
    RankResponse { ranks, last_update: None }
}

async fn read_leaderboard(
    redis: &mut crate::RedisConnection<'_>,
    key: &str,
) -> Result<Vec<responses::LeaderboardEntry>, (StatusCode, String)> {
    use bb8_redis::redis;
    let data: Result<String, redis::RedisError> = redis::cmd("GET")
        .arg(key)
        .query_async(&mut **redis)
        .await;
    match data {
        Ok(json) => serde_json::from_str(&json)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        Err(_) => Err((StatusCode::SERVICE_UNAVAILABLE, "Leaderboard not yet available".to_string())),
    }
}

async fn read_last_update_hourly(redis: &mut crate::RedisConnection<'_>) -> Option<String> {
    use bb8_redis::redis;
    redis::cmd("GET")
        .arg("last_update_hourly")
        .query_async::<String>(&mut **redis)
        .await
        .ok()
}

async fn read_last_update_daily(redis: &mut crate::RedisConnection<'_>) -> Option<String> {
    use bb8_redis::redis;
    redis::cmd("GET")
        .arg("last_update_daily")
        .query_async::<String>(&mut **redis)
        .await
        .ok()
}

async fn top_legend(
    State(pools): State<AppState>,
    Query(pagination): Query<Pagination>,
) -> Result<Json<handlers::top::RankResponse>, (StatusCode, String)> {
    let mut redis = pools.redis_pool.get().await.unwrap();
    let entries = read_leaderboard(&mut redis, "leaderboard_legend").await?;
    let legend_keys: HashSet<(i64, i64)> = entries
        .iter()
        .filter_map(|e| e.player_id.parse::<i64>().ok().map(|id| (id, e.char_id)))
        .collect();
    let count = pagination.count.unwrap_or(100);
    let offset = pagination.offset.unwrap_or(0);
    let player_ids: HashSet<i64> = entries.iter().skip(offset).take(count)
        .filter_map(|e| e.player_id.parse::<i64>().ok()).collect();
    let last_update = read_last_update_hourly(&mut redis).await;
    let mut db = pools.db_pool.get().await.unwrap();
    let player_tags = db::get_tags_from_player_list(player_ids, &mut db).await.unwrap_or_default();
    let mut response = build_rank_response(&entries, &legend_keys, &player_tags, offset, count);
    response.last_update = last_update;
    Ok(Json(response))
}

async fn top(
    State(pools): State<AppState>,
    Query(pagination): Query<Pagination>,
) -> Result<Json<handlers::top::RankResponse>, (StatusCode, String)> {
    let mut redis = pools.redis_pool.get().await.unwrap();
    let entries = read_leaderboard(&mut redis, "leaderboard_all").await?;
    let legend_keys = get_legend_keys(&mut redis).await;
    let last_update = read_last_update_daily(&mut redis).await;
    let count = pagination.count.unwrap_or(100);
    let offset = pagination.offset.unwrap_or(0);
    let player_ids: HashSet<i64> = entries.iter().skip(offset).take(count)
        .filter_map(|e| e.player_id.parse::<i64>().ok()).collect();
    let mut db = pools.db_pool.get().await.unwrap();
    let player_tags = db::get_tags_from_player_list(player_ids, &mut db).await.unwrap_or_default();
    let mut response = build_rank_response(&entries, &legend_keys, &player_tags, offset, count);
    response.last_update = last_update;
    Ok(Json(response))
}

async fn top_char(
    State(pools): State<AppState>,
    Path(char_id): Path<String>,
    Query(pagination): Query<Pagination>,
) -> Result<Json<handlers::top::RankResponse>, (StatusCode, String)> {
    let char_idx = match CHAR_NAMES.iter().position(|(c, _)| *c == char_id) {
        Some(id) => id as i64,
        None => return Err((StatusCode::NOT_FOUND, "Character not found".to_string())),
    };
    let mut redis = pools.redis_pool.get().await.unwrap();
    let key = format!("leaderboard_char_{}", char_idx);
    let entries = read_leaderboard(&mut redis, &key).await?;
    let legend_keys = get_legend_keys(&mut redis).await;
    let last_update = read_last_update_daily(&mut redis).await;
    let count = pagination.count.unwrap_or(100);
    let offset = pagination.offset.unwrap_or(0);
    let player_ids: HashSet<i64> = entries.iter().skip(offset).take(count)
        .filter_map(|e| e.player_id.parse::<i64>().ok()).collect();
    let mut db = pools.db_pool.get().await.unwrap();
    let player_tags = db::get_tags_from_player_list(player_ids, &mut db).await.unwrap_or_default();
    let mut response = build_rank_response(&entries, &legend_keys, &player_tags, offset, count);
    response.last_update = last_update;
    Ok(Json(response))
}

async fn characters() -> Result<Json<Vec<(&'static str, &'static str)>>, (StatusCode, String)> {
    Ok(Json(CHAR_NAMES.to_vec()))
}

async fn player_search(
    State(pools): State<AppState>,
    Query(search_params): Query<crate::handlers::search::SearchParams>,
) -> Result<Json<crate::handlers::search::SearchResponse>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let data: Vec<(Player, PlayerRating)> = match db::find_player(search_params, &mut db).await {
        Ok(data) => data,
        Err(e) => return Err((StatusCode::NOT_FOUND, e)),
    };

    //TODO tags

    match handlers::search::player_search(data).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => Err((StatusCode::NOT_FOUND, e)),
    }
}

async fn rating_sync (
    State(pools): State<AppState>,
    Path(player_id): Path<i64>,
) -> Result<Json<String>, (StatusCode, String)> {
    if !std::fs::exists("token.txt").unwrap_or(false) {
        return Err((
            StatusCode::NOT_FOUND,
            "GGST is not connected, patch?".to_string(),
        ));
    }

    let mut redis = pools.redis_pool.get().await.unwrap();

    // Check if player has synced in the last 60 seconds
    match imdb::check_rating_sync_rate_limit(player_id, &mut redis).await {
        Ok(true) => {
            return Err((
                StatusCode::TOO_MANY_REQUESTS,
                "Rating sync is limited to once per minute".to_string(),
            ));
        },
        Ok(false) => {}, // Not rate limited, proceed
        Err(_) => {
            // Allow on error (logged in imdb function)
        }
    }

    // Set rate limit key with 60 second expiry
    let _ = imdb::set_rating_sync_rate_limit(player_id, &mut redis).await;

    let mut db = pools.db_pool.get().await.unwrap();

    let json_response = match ggst_api::get_player_stats(player_id.to_string()).await {
        Ok(json) => json,
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to get player stats: {}", e),
            ));
        }
    };

    match handlers::rating_sync::parse_player_stats_and_update_ratings(player_id, &json_response, &mut db).await {
        Ok(updated_ratings) => {
            if updated_ratings.is_empty() {
                Ok(Json("No ratings to update".to_string()))
            } else {
                let count = updated_ratings.len();
                Ok(Json(format!("Updated {} character ratings", count)))
            }
        },
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to update ratings: {}", e),
        )),
    }
}

#[derive(Serialize)]
struct SettingsResponse {
    #[serde(serialize_with = "serialize_i64_as_string")]
    id: i64,
    name: String,
}
async fn settings(
    State(pools): State<AppState>,
    Path(key): Path<String>,
) -> Result<Json<SettingsResponse>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let player_rating = match db::get_player_id_and_name_using_key(key, &mut db).await {
        Ok(player_rating) => player_rating,
        Err(_) => {
            return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
        }
    };

    Ok(Json(SettingsResponse {
        id: player_rating.0,
        name: player_rating.1,
    }))
}

async fn alias(
    State(pools): State<AppState>,
    Path(player_id): Path<i64>,
) -> Result<Json<Vec<String>>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let alias: Vec<String> = match db::get_aliases(player_id, &mut db).await {
        Ok(alias) => alias,
        Err(_) => {
            return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
        }
    };

    Ok(Json(alias))
}

#[derive(Serialize)]
struct RatingsResponse {
    timestamp: String,
    rating: i64,
}
#[derive(Deserialize, Default)]
struct RatingsParams {
    pre_vanquisher: Option<bool>,
}

async fn ratings(
    State(pools): State<AppState>,
    Path((player_id, char_id, duration)): Path<(i64, String, i32)>,
    Query(params): Query<RatingsParams>,
) -> Result<Json<Vec<RatingsResponse>>, (StatusCode, String)> {
    let char_id = match CHAR_NAMES.iter().position(|(c, _)| *c == char_id) {
        Some(id) => id as i16,
        None => {
            return Err((StatusCode::NOT_FOUND, "Character not found".to_string()));
        }
    };

    let mut db = pools.db_pool.get().await.unwrap();

    let results = match db::get_ratings(player_id, char_id, duration, params.pre_vanquisher.unwrap_or(false), &mut db).await {
        Ok(results) => results,
        Err(e) => {
            return Err((StatusCode::NOT_FOUND, e));
        }
    };

    let ratings = results
        .iter()
        .map(|p| RatingsResponse {
            timestamp: p.timestamp.to_string(),
            rating: p.value,
        })
        .collect();

    Ok(Json(ratings))
}

async fn player_matchups(
    State(pools): State<AppState>,
    Path((player_id, char_id, duration)): Path<(i64, String, i32)>,
) -> Result<Json<MatchupCharResponse>, (StatusCode, String)> {
    let char_id = match CHAR_NAMES.iter().position(|(c, _)| *c == char_id) {
        Some(id) => id as i16,
        None => {
            return Err((StatusCode::NOT_FOUND, "Character not found".to_string()));
        }
    };

    let mut db = pools.db_pool.get().await.unwrap();

    let char_matchup = match db::get_matchups(player_id, char_id, duration, &mut db).await {
        Ok(char_matchup) => char_matchup,
        Err(e) => {
            return Err((StatusCode::NOT_FOUND, e));
        }
    };

    Ok(Json(MatchupCharResponse {
        char_short: CHAR_NAMES[char_id as usize].1.to_string(),
        char_name: CHAR_NAMES[char_id as usize].0.to_string(),
        matchups: char_matchup
            .iter()
            .map(|m| MatchupEntry {
                char_name: CHAR_NAMES[m.opponent_char as usize].1.to_string(),
                char_short: CHAR_NAMES[m.opponent_char as usize].0.to_string(),
                wins: m.wins,
                total_games: m.total_games,
            })
            .collect(),
    }))
}

#[derive(Serialize)]
struct StatsResponse {
    timestamp: String,
    total_games: i64,
    one_month_games: i64,
    one_week_games: i64,
    one_day_games: i64,
    one_hour_games: i64,
    total_players: i64,
    one_month_players: i64,
    one_week_players: i64,
    one_day_players: i64,
    one_hour_players: i64,
}
async fn stats(State(pools): State<AppState>) -> Result<Json<StatsResponse>, (StatusCode, String)> {
    let mut redis = pools.redis_pool.get().await.unwrap();

    let stats = match imdb::get_stats(&mut redis).await {
        Ok(stats) => stats,
        Err(e) => {
            return Err((StatusCode::NOT_FOUND, e));
        }
    };

    let imdb::Stats {
        timestamp,
        total_games,
        one_month_games,
        one_week_games,
        one_day_games,
        one_hour_games,
        total_players,
        one_month_players,
        one_week_players,
        one_day_players,
        one_hour_players,
    } = stats;

    Ok(Json(StatsResponse {
        timestamp,
        total_games,
        one_month_games,
        one_week_games,
        one_day_games,
        one_hour_games,
        total_players,
        one_month_players,
        one_week_players,
        one_day_players,
        one_hour_players,
    }))
}

#[derive(Serialize)]
struct PopularityResultChar {
    name: String,
    value: i64,
}
#[derive(Serialize)]
struct PopularityResult {
    per_player: Vec<PopularityResultChar>,
    per_character: Vec<PopularityResultChar>,
    per_player_total: i64,
    per_character_total: i64,
    last_update: String,
}
async fn popularity(
    State(pools): State<AppState>,
) -> Result<Json<PopularityResult>, (StatusCode, String)> {
    let mut redis = pools.redis_pool.get().await.unwrap();

    let results = match imdb::get_popularity(&mut redis).await {
        Ok(results) => results,
        Err(e) => {
            return Err((StatusCode::NOT_FOUND, e));
        }
    };

    Ok(Json(PopularityResult {
        per_player: results
            .per_player
            .iter()
            .map(|p| PopularityResultChar {
                name: p.0.clone(),
                value: p.1,
            })
            .collect(),
        per_character: results
            .per_character
            .iter()
            .map(|p| PopularityResultChar {
                name: p.0.clone(),
                value: p.1,
            })
            .collect(),
        per_player_total: results.per_player_total,
        per_character_total: results.per_character_total,
        last_update: results.last_update,
    }))
}

#[derive(Serialize)]
struct MatchupResponse {
    last_update: String,
    data_all: Vec<MatchupCharResponse>,
    data_vanq: Vec<MatchupCharResponse>,
}
#[derive(Serialize)]
struct MatchupCharResponse {
    char_name: String,
    char_short: String,
    matchups: Vec<MatchupEntry>, //Wins, Total Games
}

#[derive(Serialize)]
struct MatchupEntry {
    char_name: String,
    char_short: String,
    wins: i64,
    total_games: i64,
}

async fn matchups(
    State(pools): State<AppState>,
) -> Result<Json<MatchupResponse>, (StatusCode, String)> {
    let mut redis = pools.redis_pool.get().await.unwrap();

    let matchups = match imdb::get_matchups(&mut redis).await {
        Ok(matchups) => matchups,
        Err(e) => {
            return Err((StatusCode::NOT_FOUND, e));
        }
    };

    let data_all = match matchups.matchups.get("matchup") {
        Some(data) => data,
        None => {
            return Err((StatusCode::NOT_FOUND, "Matchup not found".to_string()));
        }
    };

    let data_vanq = match matchups.matchups.get("matchup_vanq") {
        Some(data) => data,
        None => {
            return Err((StatusCode::NOT_FOUND, "Matchup vanq not found".to_string()));
        }
    };

    let last_update = matchups.last_update;

    let data_all: Vec<MatchupCharResponse> = data_all
        .iter()
        .map(|m| MatchupCharResponse {
            char_name: m.char_name.clone(),
            char_short: m.char_short.clone(),
            matchups: m
                .matchups
                .iter()
                .map(|entry| MatchupEntry {
                    char_name: entry.char_name.clone(),
                    char_short: entry.char_short.clone(),
                    wins: entry.wins,
                    total_games: entry.total_games,
                })
                .collect(),
        })
        .collect();

    let data_vanq: Vec<MatchupCharResponse> = data_vanq
        .iter()
        .map(|m| MatchupCharResponse {
            char_name: m.char_name.clone(),
            char_short: m.char_short.clone(),
            matchups: m
                .matchups
                .iter()
                .map(|entry| MatchupEntry {
                    char_name: entry.char_name.clone(),
                    char_short: entry.char_short.clone(),
                    wins: entry.wins,
                    total_games: entry.total_games,
                })
                .collect(),
        })
        .collect();

    Ok(Json(MatchupResponse {
        last_update,
        data_all,
        data_vanq,
    }))
}

#[derive(Serialize)]
struct Supporter {
    #[serde(serialize_with = "serialize_i64_as_string")]
    id: i64,
    name: String,
    tags: Vec<TagResponse>,
}
async fn supporters(
    State(pools): State<AppState>,
) -> Result<Json<Vec<Supporter>>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let supporters: Vec<(i64, String)> = match db::get_supporters(&mut db).await {
        Ok(supporters) => supporters,
        Err(e) => {
            return Err((StatusCode::NOT_FOUND, e));
        }
    };

    //Get tags
    let mut player_ids = HashSet::new();
    for suppoter in &supporters {
        player_ids.insert(suppoter.0);
    }
    let player_tags = match db::get_tags_from_player_list(player_ids, &mut db).await {
        Ok(tags) => tags,
        Err(_) => HashMap::new(),
    };

    Ok(Json(
        supporters
            .iter()
            .map(|(id, name)| Supporter {
                id: *id,
                name: name.clone(),
                tags: player_tags
                    .get(id)
                    .unwrap_or(&vec![])
                    .iter()
                    .map(|(tag, style)| TagResponse {
                        tag: tag.clone(),
                        style: style.clone(),
                    })
                    .collect(),
            })
            .collect(),
    ))
}

#[derive(Serialize)]
struct DistributionResponse {
    timestamp: String,
    data: DistributionEntry,
}
#[derive(Serialize)]
struct DistributionEntry {
    one_month_players: i64,
    distribution_rating: Vec<crate::pull::DistributionResult>,
}
async fn distribution(
    State(pools): State<AppState>,
) -> Result<Json<DistributionResponse>, (StatusCode, String)> {
    let mut redis = pools.redis_pool.get().await.unwrap();

    let (ts, distrubition_entry) = match imdb::get_distribution(&mut redis).await {
        Ok(data) => data,
        Err(e) => {
            return Err((StatusCode::NOT_FOUND, e));
        }
    };

    Ok(Json(DistributionResponse {
        timestamp: ts,
        data: distrubition_entry,
    }))
}

async fn health(State(pools): State<AppState>) -> Result<String, (StatusCode, String)> {
    let mut redis = pools.redis_pool.get().await.unwrap();
    let now = chrono::Utc::now().timestamp();

    let last_update_daily = imdb::get_last_update_daily(&mut redis).await.unwrap();

    // If the daily task ran very recently (within 10 min), latest_game_time may be
    // temporarily absent — treat as graceful/running state, not an error.
    let daily_ran_recently = now - last_update_daily.and_utc().timestamp() < 600;

    let latest_game_time = match imdb::get_latest_game_time(&mut redis).await {
        Ok(t) => Some(t),
        Err(_) => {
            if daily_ran_recently || now - 86400 > last_update_daily.and_utc().timestamp() {
                return Ok(
                    "Daily Update Running. Replays are still being collected and will show up shortly."
                        .to_string(),
                );
            }
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                "latest_game_time does not exist!".to_string(),
            ));
        }
    };

    if now - 120 > latest_game_time.unwrap().and_utc().timestamp() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "No New (2m) Replays!".to_string(),
        ));
    }

    if now - 86400 > last_update_daily.and_utc().timestamp() {
        return Ok(
            "Daily Update Running. Replays are still being collected and will show up shortly."
                .to_string(),
        );
    }

    Ok("OK".to_string())
}

async fn comment(Path(player_id): Path<i64>, State(pools): State<AppState>) -> impl IntoResponse {
    //If token.txt does not exist, return 503
    if !std::fs::exists("token.txt").unwrap_or(false) {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "GGST is not connected, patch?".to_string(),
        ));
    }

    let mut db = pools.db_pool.get().await.unwrap();
    let mut redis = pools.redis_pool.get().await.unwrap();

    let exists = match crate::db::player_exists(&mut db, player_id).await {
        Ok(e) => e,
        Err(e) => return Err((StatusCode::INTERNAL_SERVER_ERROR, e)),
    };

    if !exists {
        return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
    }

    let comment = match crate::imdb::get_free_comment(player_id, &mut redis).await {
        Ok(comment) => comment,
        Err(_) => match crate::ggst_api::get_player_comment(player_id.to_string()).await {
            Ok(comment) => {
                let _ = crate::imdb::set_free_comment(player_id, &comment, &mut redis).await;
                comment
            }
            Err(e) => return Err((StatusCode::SERVICE_UNAVAILABLE, e)),
        },
    };

    Ok(comment)
}

async fn avatar(Path(player_id): Path<i64>, State(pools): State<AppState>) -> impl IntoResponse {
    //If token.txt does not exist, return 503
    if !std::fs::exists("token.txt").unwrap_or(false) {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "GGST is not connected, patch?".to_string(),
        ));
    }

    let mut db = pools.db_pool.get().await.unwrap();
    let mut redis = pools.redis_pool.get().await.unwrap();

    let exists = match crate::db::player_exists(&mut db, player_id).await {
        Ok(e) => e,
        Err(e) => return Err((StatusCode::INTERNAL_SERVER_ERROR, e)),
    };

    if !exists {
        return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
    }

    let png = match crate::imdb::get_avatar(player_id, &mut redis).await {
        Ok(avatar) => avatar,
        Err(_) => match crate::ggst_api::get_player_avatar(player_id.to_string()).await {
            Ok(png) => {
                let _ = crate::imdb::set_avatar(player_id, &png, &mut redis).await;
                png
            }
            Err(e) => return Err((StatusCode::SERVICE_UNAVAILABLE, e)),
        },
    };

    let output = crate::handlers::avatar::handle_get_avatar(png).await;

    // Create response headers
    let mut headers = HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, HeaderValue::from_static("image/png"));

    Ok((headers, output))
}

fn init_tracing(prefix: &str) -> WorkerGuard {
    // Create a rolling file appender
    let file_appender = tracing_appender::rolling::RollingFileAppender::new(
        tracing_appender::rolling::Rotation::DAILY,
        "./logs",
        prefix,
    );
    let (file_writer, guard) = tracing_appender::non_blocking(file_appender);

    // Create a stdout layer
    let stdout_layer = tracing_subscriber::fmt::layer()
        .with_writer(std::io::stdout)
        .with_ansi(true)
        .with_span_events(tracing_subscriber::fmt::format::FmtSpan::CLOSE);

    // Create a file layer
    let file_layer = tracing_subscriber::fmt::layer()
        .with_writer(file_writer)
        .with_ansi(false)
        .with_span_events(tracing_subscriber::fmt::format::FmtSpan::CLOSE);

    let env_filter;

    if cfg!(debug_assertions) {
        env_filter = tracing_subscriber::EnvFilter::new("debug");
    } else {
        env_filter = tracing_subscriber::EnvFilter::new("info");
    }

    // Combine the layers
    let subscriber = tracing_subscriber::registry()
        .with(env_filter)
        .with(stdout_layer)
        .with(file_layer);

    // Set the subscriber as the global default
    tracing::subscriber::set_global_default(subscriber).expect("Unable to set global subscriber");

    guard
}

#[tokio::main(flavor = "multi_thread", worker_threads = 5)]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().expect("Failed to read .env file");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(vec![
            Method::GET,
            Method::POST,
            Method::PATCH,
            Method::PUT,
            Method::DELETE,
            Method::HEAD,
            Method::OPTIONS,
        ])
        .allow_headers(vec![ACCEPT, AUTHORIZATION, CONTENT_TYPE, ORIGIN]);

    // set up connection pool
    let config = AsyncDieselConnectionManager::<diesel_async::AsyncPgConnection>::new(
        std::env::var("DATABASE_URL").expect("DATABASE_URL"),
    );

    //Postgres
    let pool = bb8::Pool::builder().build(config).await?;

    //Redis
    let manager =
        RedisConnectionManager::new(std::env::var("REDIS_URL").expect("REDIS_URL")).unwrap();
    let redis_pool = bb8::Pool::builder().build(manager).await.unwrap();

    let state = AppState {
        db_pool: pool,
        redis_pool,
    };

    let args = std::env::args().skip(1).collect::<Vec<_>>();
    match args.get(0).map(|r| r.deref()) {
        //This runs the timed jobs: grab replay, update ratings, update ranking, etc.
        Some("pull") => {
            let _guard = init_tracing("pull");

            // We have these declared here too so that we can change the connection pool settings

            // set up connection pool
            let config = AsyncDieselConnectionManager::<diesel_async::AsyncPgConnection>::new(
                std::env::var("DATABASE_URL").expect("DATABASE_URL"),
            );

            //Postgres - reduce max size to 4
            let pool = bb8::Pool::builder().max_size(4).build(config).await?;

            //Redis
            let manager =
                RedisConnectionManager::new(std::env::var("REDIS_URL").expect("REDIS_URL"))
                    .unwrap();
            let redis_pool = bb8::Pool::builder().build(manager).await.unwrap();

            let state = AppState {
                db_pool: pool,
                redis_pool,
            };

            pull::pull_and_update_continuous(state).await;
        }
        Some("hourly") => {
            tracing_subscriber::fmt()
                .with_max_level(tracing::Level::INFO)
                .init();
            pull::do_hourly_update_once(state).await
        }
        Some("daily") => {
            tracing_subscriber::fmt()
                .with_max_level(tracing::Level::INFO)
                .init();
            pull::do_daily_update_once(state).await
        }
        _ => {
            // No args, run the web server
            let _guard = init_tracing("web");

            let app = Router::new()
                .route("/api/player/:id", get(player))
                .route(
                    "/api/player/:player_id/:char_id/history",
                    get(player_history),
                )
                .route("/api/top_legend", get(top_legend))
                .route("/api/top", get(top))
                .route("/api/top_char/:char_id", get(top_char))
                .route("/api/characters", get(characters))
                .route("/api/player/search", get(player_search))
                .route("/api/rating_sync/:player_id", get(rating_sync))
                .route("/api/settings/:key", get(settings))
                .route("/api/alias/:player_id", get(alias))
                .route("/api/ratings/:player_id/:char_id/:duration", get(ratings))
                .route("/api/stats", get(stats))
                .route("/api/popularity", get(popularity))
                .route("/api/matchups", get(matchups))
                .route(
                    "/api/matchups/:player_id/:char_id/:duration",
                    get(player_matchups),
                )
                .route("/api/supporters", get(supporters))
                .route("/api/distribution", get(distribution))
                .route("/api/health", get(health))
                .route("/api/avatar/:player_id", get(avatar))
                .route("/api/comment/:player_id", get(comment))
                .with_state(state);

            let app = if cfg!(debug_assertions) {
                app.layer(cors)
            } else {
                app
            };

            let listener = tokio::net::TcpListener::bind(std::env::var("LISTEN_ADDR").expect("LISTEN_ADDR")).await?;
            axum::serve(listener, app).await?;
        }
    }

    Ok(())
}
