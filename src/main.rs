use axum::extract::{Path, Query};
use axum::http::header::{self, ACCEPT, AUTHORIZATION, CONTENT_TYPE, ORIGIN};
use axum::http::{HeaderMap, HeaderValue, Method};
use axum::response::IntoResponse;
use axum::{extract::State, http::StatusCode, response::Json, routing::get, Router};
use bb8::PooledConnection;
use diesel_async::{pooled_connection::AsyncDieselConnectionManager, AsyncPgConnection};
use handlers::common::{Pagination, TagResponse};
use models::{CharacterRank, GlobalRank, Player, PlayerRating, Status};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::ops::Deref;
use std::vec;
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, warn};
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::layer::SubscriberExt;
//use diesel::query_dsl::positional_order_dsl::{OrderColumn, PositionalOrderDsl, IntoOrderColumn};

use bb8_redis::{bb8, RedisConnectionManager};

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
mod rating;
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
];

async fn player(
    State(pools): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<crate::handlers::player::PlayerResponse>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let (player_char, match_counts, top_chars, top_defeated, top_rating, top_global, tags) =
        match db::get_player_response_data(id, &mut db).await {
            Ok(response) => response,
            Err(e) => return Err((StatusCode::NOT_FOUND, e)),
        };

    match handlers::player::handle_get_player(
        player_char,
        match_counts,
        top_chars,
        top_defeated,
        top_rating,
        top_global,
        tags,
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

    match handlers::player_history::handle_get_player_history(player_id, games, player_tags).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => Err((StatusCode::NOT_FOUND, e)),
    }
}

async fn top(
    State(pools): State<AppState>,
    Query(pagination): Query<Pagination>,
) -> Result<Json<crate::handlers::top::RankResponse>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let count = pagination.count.unwrap_or(100) as i64;
    let offset = pagination.offset.unwrap_or(0) as i64;

    let data: Vec<(GlobalRank, Player, PlayerRating)> =
        match db::get_top_players(count, offset, &mut db).await {
            Ok(games) => games,
            Err(e) => return Err((StatusCode::NOT_FOUND, e)),
        };

    //Get tags
    let mut player_ids = HashSet::new();
    for d in &data {
        player_ids.insert(d.1.id);
    }
    let player_tags = match db::get_tags_from_player_list(player_ids, &mut db).await {
        Ok(tags) => tags,
        Err(_) => HashMap::new(),
    };

    match handlers::top::get_top(data, player_tags).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => Err((StatusCode::NOT_FOUND, e)),
    }
}

async fn top_char(
    State(pools): State<AppState>,
    Path(char_id): Path<String>,
    Query(pagination): Query<Pagination>,
) -> Result<Json<handlers::top::RankResponse>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let count = pagination.count.unwrap_or(100) as i64;
    let offset = pagination.offset.unwrap_or(0) as i64;

    let char_id = match CHAR_NAMES.iter().position(|(c, _)| *c == char_id) {
        Some(id) => id as i16,
        None => {
            return Err((StatusCode::NOT_FOUND, "Character not found".to_string()));
        }
    };

    let data: Vec<(CharacterRank, Player, PlayerRating)> =
        match db::get_top_for_char(char_id, count, offset, &mut db).await {
            Ok(games) => games,
            Err(e) => return Err((StatusCode::NOT_FOUND, e)),
        };

    //Get tags
    let mut player_ids = HashSet::new();
    for d in &data {
        player_ids.insert(d.1.id);
    }
    let player_tags = match db::get_tags_from_player_list(player_ids, &mut db).await {
        Ok(tags) => tags,
        Err(_) => HashMap::new(),
    };

    match handlers::top::get_top_char(data, player_tags).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => Err((StatusCode::NOT_FOUND, e)),
    }
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

fn generate_code() -> String {
    use rand::Rng;
    const CHARSET: &[u8] = b"ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789";
    const STR_LEN: usize = 8;
    let mut rng = rand::thread_rng();

    let password: String = (0..STR_LEN)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect();
    password
}

async fn claim(
    State(pools): State<AppState>,
    Path(player_id): Path<i64>,
) -> Result<Json<String>, (StatusCode, String)> {
    if !std::fs::exists("token.txt").unwrap_or(false) {
        return Err((
            StatusCode::NOT_FOUND,
            "GGST is not connected, patch?".to_string(),
        ));
    }

    let mut db = pools.db_pool.get().await.unwrap();

    let rcode_check_code = generate_code();

    let updated_row_count = match db::set_claim_code(player_id, &rcode_check_code, &mut db).await {
        Ok(updated_row_count) => updated_row_count,
        Err(e) => return Err((StatusCode::NOT_FOUND, e)),
    };

    if !updated_row_count {
        return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
    }

    Ok(Json(rcode_check_code))
}

async fn claim_poll(
    State(pools): State<AppState>,
    Path(player_id): Path<i64>,
) -> Result<Json<String>, (StatusCode, String)> {
    if !std::fs::exists("token.txt").unwrap_or(false) {
        return Err((
            StatusCode::NOT_FOUND,
            "GGST is not connected, patch?".to_string(),
        ));
    }

    let mut db = pools.db_pool.get().await.unwrap();

    let code = match db::get_claim_code(player_id, &mut db).await {
        Ok(code) => code,
        Err(_) => {
            return Err((StatusCode::NOT_FOUND, "Error looking up code".to_string()));
        }
    };

    let json = ggst_api::get_player_stats(player_id.to_string()).await;
    let lookup = format!("PublicComment\":\"{code}");

    let found = match json {
        Ok(json) => json.contains(&lookup),
        Err(er) => {
            error!("error {}", er);
            false
        }
    };

    if found {
        let player_api_key = match db::get_player_api_key(player_id, &mut db).await {
            Ok(key) => key,
            Err(e) => {
                return Err((StatusCode::NOT_FOUND, e));
            }
        };
        return Ok(Json(player_api_key));
    }

    Ok(Json("false".to_string()))
}

async fn toggle_private(
    State(pools): State<AppState>,
    Path(key): Path<String>,
) -> Result<Json<String>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let status = match db::get_player_status_using_key(key.clone(), &mut db).await {
        Ok(status) => match status {
            Status::Public => Status::Private,
            Status::Private => Status::Public,
            Status::Cheater => Status::Cheater,
        },
        Err(_) => {
            return Ok(Json("Invalid Key".to_string()));
        }
    };

    let updated_row_count = match db::set_player_status_using_key(key, status, &mut db).await {
        Ok(updated_row_count) => updated_row_count,
        Err(_) => {
            return Ok(Json("Invalid Key".to_string()));
        }
    };

    if !updated_row_count {
        return Ok(Json("Invalid Key".to_string()));
    }

    Ok(Json("true".to_string()))
}

#[derive(Serialize)]
struct SettingsResponse {
    id: i64,
    name: String,
    status: String,
}
async fn settings(
    State(pools): State<AppState>,
    Path(key): Path<String>,
) -> Result<Json<SettingsResponse>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let status = match db::get_player_status_using_key(key.clone(), &mut db).await {
        Ok(status) => match status {
            Status::Public => "Not Hidden",
            Status::Private => "Hidden",
            Status::Cheater => "Cheater! :O",
        },
        Err(_) => {
            return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
        }
    };

    let player_rating = match db::get_player_id_and_name_using_key(key, &mut db).await {
        Ok(player_rating) => player_rating,
        Err(_) => {
            return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
        }
    };

    Ok(Json(SettingsResponse {
        id: player_rating.0,
        name: player_rating.1,
        status: status.to_string(),
    }))
}

async fn alias(
    State(pools): State<AppState>,
    Path(player_id): Path<i64>,
) -> Result<Json<Vec<String>>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    //If player is not Public, return empty
    match db::get_player_status(player_id, &mut db).await {
        Ok(_) => {}
        Err(_) => {
            return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
        }
    };

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
    rating: f32,
}
async fn ratings(
    State(pools): State<AppState>,
    Path((player_id, char_id, duration)): Path<(i64, String, i32)>,
) -> Result<Json<Vec<RatingsResponse>>, (StatusCode, String)> {
    let char_id = match CHAR_NAMES.iter().position(|(c, _)| *c == char_id) {
        Some(id) => id as i16,
        None => {
            return Err((StatusCode::NOT_FOUND, "Character not found".to_string()));
        }
    };

    let mut db = pools.db_pool.get().await.unwrap();

    let results = match db::get_ratings(player_id, char_id, duration, &mut db).await {
        Ok(results) => results,
        Err(e) => {
            return Err((StatusCode::NOT_FOUND, e));
        }
    };

    let ratings = results
        .iter()
        .map(|p| RatingsResponse {
            timestamp: p.timestamp.to_string(),
            rating: p.value.unwrap_or(0.0),
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
    data_1700: Vec<MatchupCharResponse>,
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

    let data_1700 = match matchups.matchups.get("matchup_1700") {
        Some(data) => data,
        None => {
            return Err((StatusCode::NOT_FOUND, "Matchup 1700 not found".to_string()));
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

    let data_1700: Vec<MatchupCharResponse> = data_1700
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
        data_1700,
    }))
}

#[derive(Serialize)]
struct Supporter {
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
    distribution_floor: Vec<Vec<i64>>,
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

    let latest_game_time = match imdb::get_latest_game_time(&mut redis).await {
        Ok(latest_game_time) => Some(latest_game_time),
        Err(_) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                "latest_game_time does not exist!".to_string(),
            ))
        }
    };

    let now = chrono::Utc::now().timestamp();

    if now - 120 > latest_game_time.unwrap().and_utc().timestamp() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "No New (2m) Replays!".to_string(),
        ));
    }

    let last_update_daily = imdb::get_last_update_daily(&mut redis).await.unwrap();
    if now - 86400 > last_update_daily.and_utc().timestamp() {
        return Ok(
            "Daily Update Running. Replays are still being collected and will show up shortly."
                .to_string(),
        );
    }

    Ok("OK".to_string())
}

#[derive(Deserialize)]
struct CalcRatingRequest {
    rating_a: f64,
    drift_a: f64,
    rating_b: f64,
    drift_b: f64,
    a_wins: bool,
}

#[derive(Serialize)]
struct CalcRatingResponse {
    rating_a_new: f64,
    drift_a_new: f64,
    rating_b_new: f64,
    drift_b_new: f64,
    win_prob: f64,
}
async fn calc_rating(
    ratings: Query<CalcRatingRequest>,
) -> Result<Json<CalcRatingResponse>, (StatusCode, String)> {
    if ratings.drift_a < 1.0 || ratings.drift_b < 1.0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Drift must be greater than 1".to_string(),
        ));
    }

    let (rating_a_new, drift_a_new, rating_b_new, drift_b_new, win_prob) =
        crate::rating::update_mean_and_variance(
            ratings.rating_a,
            ratings.drift_a,
            ratings.rating_b,
            ratings.drift_b,
            ratings.a_wins,
        );

    Ok(Json(CalcRatingResponse {
        rating_a_new,
        drift_a_new,
        rating_b_new,
        drift_b_new,
        win_prob,
    }))
}

async fn avatar(Path(player_id): Path<i64>, State(pools): State<AppState>) -> impl IntoResponse {
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

            let mut app = Router::new()
                .route("/api/player/:id", get(player))
                .route(
                    "/api/player/:player_id/:char_id/history",
                    get(player_history),
                )
                .route("/api/top", get(top))
                .route("/api/top_char/:char_id", get(top_char))
                .route("/api/characters", get(characters))
                .route("/api/player/search", get(player_search))
                .route("/api/claim/:player_id", get(claim))
                .route("/api/claim/poll/:player_id", get(claim_poll))
                .route("/api/settings/:key", get(settings))
                .route("/api/toggle_private/:key", get(toggle_private))
                .route("/api/alias/:player_id", get(alias))
                .route("/api/ratings/:player_id/:char_id/:duration", get(ratings))
                .route("/api/stats", get(stats))
                .route("/api/popularity", get(popularity))
                .route("/api/matchups", get(matchups))
                .route("/api/matchups/:player_id/:char_id/:duration", get(player_matchups))
                .route("/api/supporters", get(supporters))
                .route("/api/distribution", get(distribution))
                .route("/api/health", get(health))
                .route("/api/calc_rating", get(calc_rating))
                .route("/api/avatar/:player_id", get(avatar))
                .with_state(state);

            if cfg!(debug_assertions) {
                //Cors only used for development
                warn!("CORS enabled.");
                app = app.layer(cors);
            }

            let listener = tokio::net::TcpListener::bind("0.0.0.0:8001").await?;
            axum::serve(listener, app).await?;
        }
    }

    Ok(())
}
