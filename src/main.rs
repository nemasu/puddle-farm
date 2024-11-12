use axum::extract::{Path, Query};
use axum::http::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, ORIGIN};
use axum::http::Method;
use axum::{extract::State, http::StatusCode, response::Json, routing::get, Router};
use chrono::Duration;
use diesel::{prelude::*, update};
use diesel_async::{
    pooled_connection::AsyncDieselConnectionManager, AsyncPgConnection, RunQueryDsl,
};
use models::{CharacterRank, GlobalRank, Player, PlayerRating, Status};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ops::Deref;
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, debug, warn};
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::layer::SubscriberExt;
//use diesel::query_dsl::positional_order_dsl::{OrderColumn, PositionalOrderDsl, IntoOrderColumn};

use bb8_memcached::{bb8, MemcacheConnectionManager};

type Pool = bb8::Pool<AsyncDieselConnectionManager<AsyncPgConnection>>;
type MemcachedPool = bb8::Pool<MemcacheConnectionManager>;

#[derive(Clone)]
struct AppState {
    db_pool: Pool,
    memcached_pool: MemcachedPool,
}

mod ggst_api;
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
];

#[derive(Serialize)]
struct PlayerResponse {
    id: i64,
    name: String,
    ratings: Vec<PlayerResponsePlayer>,
    platform: String,
    status: String,
    top_global: i32,
}
impl PlayerResponse {
    fn private() -> PlayerResponse {
        PlayerResponse {
            ratings: vec![],
            id: 0,
            name: "Hidden".to_string(),
            status: "Unknown".to_string(),
            platform: "???".to_string(),
            top_global: 0,
        }
    }

    fn cheater() -> PlayerResponse {
        PlayerResponse {
            ratings: vec![],
            id: 0,
            name: "Cheater".to_string(),
            status: "Unknown".to_string(),
            platform: "???".to_string(),
            top_global: 0,
        }
    }
}

#[derive(Serialize)]
struct PlayerResponsePlayer {
    rating: f32,
    deviation: f32,
    char_short: String,
    character: String,
    match_count: i32,
    top_char: i32,
    top_defeated: TopDefeated,
    top_rating: TopRating,
}

#[derive(Serialize, Clone)]
struct TopDefeated {
    timestamp: String,
    id: i64,
    name: String,
    char_short: String,
    value: f32,
    deviation: f32,
}

#[derive(Serialize, Clone)]
struct TopRating {
    timestamp: String,
    value: f32,
    deviation: f32,
}
async fn player(
    State(pools): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<PlayerResponse>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let player_char: Vec<(Player, PlayerRating)> = schema::players::table
        .inner_join(schema::player_ratings::table)
        .filter(schema::players::id.eq(id))
        .select((Player::as_select(), PlayerRating::as_select()))
        .load(&mut db)
        .await
        .expect("Error loading player");

    if player_char.len() == 0 {
        return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
    }

    let status = player_char[0].0.status.clone().unwrap().to_string();

    //If the player is not public, then return an appropriate response
    match player_char[0].0.status {
        Some(Status::Cheater) => {
            return Ok(Json(PlayerResponse::cheater()));
        }
        Some(Status::Private) => {
            return Ok(Json(PlayerResponse::private()));
        }
        _ => {}
    }

    let mut match_counts = HashMap::new();
    let mut top_chars = HashMap::new();
    let mut top_defeated = HashMap::new();
    let mut top_rating = HashMap::new();

    let top_global = match schema::global_ranks::table
        .filter(schema::global_ranks::id.eq(id))
        .select(schema::global_ranks::rank)
        .first::<i32>(&mut db)
        .await
    {
        Ok(rank) => rank,
        Err(_) => 0,
    };

    for (player, rating) in player_char.iter() {
        let match_count = schema::games::table
            .filter(
                schema::games::id_a
                    .eq(player.id)
                    .and(schema::games::char_a.eq(rating.char_id)),
            )
            .or_filter(
                schema::games::id_b
                    .eq(player.id)
                    .and(schema::games::char_b.eq(rating.char_id)),
            )
            .count()
            .get_result::<i64>(&mut db)
            .await
            .expect("Error loading games");

        match_counts.insert(rating.char_id, match_count as i32);

        let top_char = match schema::character_ranks::table
            .filter(schema::character_ranks::char_id.eq(rating.char_id))
            .filter(schema::character_ranks::id.eq(player.id))
            .select(schema::character_ranks::rank)
            .first::<i32>(&mut db)
            .await
        {
            Ok(rank) => rank,
            Err(_) => 0,
        };

        top_chars.insert(rating.char_id, top_char);

        let top_defeated_res: Vec<(
            chrono::NaiveDateTime,
            i64,
            String,
            i16,
            Option<f32>,
            Option<f32>,
            Option<f32>,
        )> = schema::games::table
            .select((
                schema::games::timestamp,
                schema::games::id_b,
                schema::games::name_b,
                schema::games::char_b,
                schema::games::value_b,
                schema::games::deviation_b,
                schema::games::value_b - schema::games::deviation_b,
            ))
            .filter(
                schema::games::id_a
                    .eq(id)
                    .and(schema::games::char_a.eq(rating.char_id))
                    .and(schema::games::winner.eq(1))
                    .and(schema::games::deviation_b.lt(30.0)),
            )
            .order((schema::games::value_b - schema::games::deviation_b).desc())
            .limit(1)
            .union(
                schema::games::table
                    .select((
                        schema::games::timestamp,
                        schema::games::id_a,
                        schema::games::name_a,
                        schema::games::char_a,
                        schema::games::value_a,
                        schema::games::deviation_a,
                        schema::games::value_a - schema::games::deviation_a,
                    ))
                    .order((schema::games::value_a - schema::games::deviation_a).desc())
                    .limit(1)
                    .filter(
                        schema::games::id_b
                            .eq(id)
                            .and(schema::games::char_b.eq(rating.char_id))
                            .and(schema::games::winner.eq(2))
                            .and(schema::games::deviation_a.lt(30.0)),
                    ),
            )
            //TODO use this instead when positional_order_by + limit is released
            //.positional_order_by(OrderColumn::from(6).desc())
            //.limit(1)
            .load::<(
                chrono::NaiveDateTime,
                i64,
                String,
                i16,
                Option<f32>,
                Option<f32>,
                Option<f32>,
            )>(&mut db)
            .await
            .expect("Error loading games");

        if top_defeated_res.len() > 1 {
            let mut highest_index = 0;
            if top_defeated_res[0].6.unwrap() < top_defeated_res[1].6.unwrap() {
                highest_index = 1;
            }

            top_defeated.insert(
                rating.char_id,
                TopDefeated {
                    timestamp: top_defeated_res[highest_index].0.to_string(),
                    id: top_defeated_res[highest_index].1,
                    name: top_defeated_res[highest_index].2.clone(),
                    char_short: CHAR_NAMES[top_defeated_res[highest_index].3 as usize]
                        .0
                        .to_string(),
                    value: top_defeated_res[highest_index].4.unwrap_or(0.0),
                    deviation: top_defeated_res[highest_index].5.unwrap_or(0.0),
                },
            );
        }

        let top_rating_res: Vec<(chrono::NaiveDateTime, Option<f32>, Option<f32>, Option<f32>)> =
            schema::games::table
                .select((
                    schema::games::timestamp,
                    schema::games::value_a,
                    schema::games::deviation_a,
                    schema::games::value_a - schema::games::deviation_a,
                ))
                .filter(
                    schema::games::id_a
                        .eq(id)
                        .and(schema::games::char_a.eq(rating.char_id))
                        .and(schema::games::deviation_a.lt(30.0)),
                )
                .order((schema::games::value_a - schema::games::deviation_a).desc())
                .limit(1)
                .union(
                    schema::games::table
                        .select((
                            schema::games::timestamp,
                            schema::games::value_b,
                            schema::games::deviation_b,
                            schema::games::value_b - schema::games::deviation_b,
                        ))
                        .filter(
                            schema::games::id_b
                                .eq(id)
                                .and(schema::games::char_b.eq(rating.char_id))
                                .and(schema::games::deviation_b.lt(30.0)),
                        )
                        .order((schema::games::value_b - schema::games::deviation_b).desc())
                        .limit(1),
                )
                //TODO use this instead when positional_order_by + limit is released
                //.positional_order_by(OrderColumn::from(6).desc())
                //.limit(1)
                .load::<(chrono::NaiveDateTime, Option<f32>, Option<f32>, Option<f32>)>(&mut db)
                .await
                .expect("Error loading games");

        if top_rating_res.len() > 1 {
            let mut highest_index = 0;
            if top_rating_res[0].3.unwrap() < top_rating_res[1].3.unwrap() {
                highest_index = 1;
            }

            top_rating.insert(
                rating.char_id,
                TopRating {
                    timestamp: top_rating_res[highest_index].0.to_string(),
                    value: top_rating_res[highest_index].1.unwrap(),
                    deviation: top_rating_res[highest_index].2.unwrap(),
                },
            );
        }
    }

    let ratings: Vec<PlayerResponsePlayer> = player_char
        .iter()
        .map(|p| PlayerResponsePlayer {
            rating: p.1.value,
            deviation: p.1.deviation,
            char_short: CHAR_NAMES[p.1.char_id as usize].0.to_string(),
            character: CHAR_NAMES[p.1.char_id as usize].1.to_string(),
            match_count: match_counts.get(&p.1.char_id).unwrap().clone(),
            top_char: top_chars.get(&p.1.char_id).unwrap().clone(),
            top_defeated: top_defeated
                .get(&p.1.char_id)
                .unwrap_or(&TopDefeated {
                    timestamp: "N/A".to_string(),
                    id: 0,
                    name: "N/A".to_string(),
                    char_short: "N/A".to_string(),
                    value: 0.0,
                    deviation: 0.0,
                })
                .clone(),
            top_rating: top_rating
                .get(&p.1.char_id)
                .unwrap_or(&TopRating {
                    timestamp: "N/A".to_string(),
                    value: 0.0,
                    deviation: 0.0,
                })
                .clone(),
        })
        .collect();

    Ok(Json(PlayerResponse {
        id: player_char[0].0.id,
        name: player_char[0].0.name.clone(),
        ratings,
        status: status.clone(),
        platform: match player_char[0].0.platform {
            1 => "PS".to_string(),
            2 => "XB".to_string(),
            3 => "PC".to_string(),
            _ => "???".to_string(),
        },
        top_global,
    }))
}

#[derive(Serialize)]
pub struct PlayerGamesResponse {
    history: Vec<PlayerSet>,
}
#[derive(Serialize)]
struct PlayerSet {
    timestamp: String,
    own_rating_value: f32,
    own_rating_deviation: f32,
    floor: String,
    opponent_name: String,
    opponent_platform: &'static str,
    opponent_vip: Option<&'static str>,
    opponent_cheater: Option<&'static str>,
    opponent_hidden: Option<&'static str>,
    opponent_id: String,
    opponent_character: &'static str,
    opponent_character_short: &'static str,
    opponent_rating_value: f32,
    opponent_rating_deviation: f32,
    result_win: bool,
    odds: f32,
}
#[derive(Deserialize)]
struct Pagination {
    count: Option<usize>,
    offset: Option<usize>,
}
async fn player_history(
    State(pools): State<AppState>,
    Path((player_id, char_id)): Path<(i64, String)>,
    Query(pagination): Query<Pagination>,
) -> Result<Json<PlayerGamesResponse>, (StatusCode, String)> {
    let char_id = match CHAR_NAMES.iter().position(|(c, _)| *c == char_id) {
        Some(id) => id as i16,
        None => {
            return Err((StatusCode::NOT_FOUND, "Character not found".to_string()));
        }
    };

    let mut db = pools.db_pool.get().await.unwrap();

    //Return empty if player's status is not Public
    match schema::players::table
        .select(schema::players::status)
        .filter(schema::players::id.eq(player_id))
        .first::<Option<Status>>(&mut db)
        .await
    {
        Ok(Some(status)) => {
            if status != Status::Public {
                return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
            }
        }
        _ => {
            return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
        }
    }

    let count = pagination.count.unwrap_or(100) as i64;
    let offset = pagination.offset.unwrap_or(0) as i64;

    let games: Vec<models::Game> = schema::games::table
        .filter(
            (schema::games::id_a
                .eq(player_id)
                .and(schema::games::char_a.eq(char_id as i16)))
            .or(schema::games::id_b
                .eq(player_id)
                .and(schema::games::char_b.eq(char_id as i16))),
        )
        .order(schema::games::timestamp.desc())
        .limit(count)
        .offset(offset)
        .load(&mut db)
        .await
        .expect("Error loading games");

    let mut response: PlayerGamesResponse = PlayerGamesResponse { history: vec![] };

    for game in games {
        let own_rating_value = if game.id_a == player_id {
            game.value_a.unwrap()
        } else {
            game.value_b.unwrap()
        };
        let own_rating_deviation = if game.id_a == player_id {
            game.deviation_a.unwrap()
        } else {
            game.deviation_b.unwrap()
        };
        let opponent_id = if game.id_a == player_id {
            game.id_b
        } else {
            game.id_a
        };
        let opponent_name = if game.id_a == player_id {
            game.name_b.clone()
        } else {
            game.name_a.clone()
        };
        let opponent_platform = if game.id_a == player_id {
            game.platform_b
        } else {
            game.platform_a
        };
        let opponent_vip = None;
        let opponent_cheater = None;
        let opponent_hidden = None;
        let opponent_character = if game.id_a == player_id {
            CHAR_NAMES[game.char_b as usize].1
        } else {
            CHAR_NAMES[game.char_a as usize].1
        };
        let opponent_character_short = if game.id_a == player_id {
            CHAR_NAMES[game.char_b as usize].0
        } else {
            CHAR_NAMES[game.char_a as usize].0
        };
        let opponent_rating_value = if game.id_a == player_id {
            game.value_b.unwrap()
        } else {
            game.value_a.unwrap()
        };
        let opponent_rating_deviation = if game.id_a == player_id {
            game.deviation_b.unwrap()
        } else {
            game.deviation_a.unwrap()
        };
        let timestamp = game.timestamp.to_string();
        let floor = game.game_floor.to_string();
        let result_win = if game.id_a == player_id && game.winner == 1
            || game.id_b == player_id && game.winner == 2
        {
            true
        } else {
            false
        };
        let odds = if game.id_a == player_id {
            game.win_chance.unwrap_or(0.0)
        } else {
            1.0 - game.win_chance.unwrap_or(0.0)
        };

        response.history.push(PlayerSet {
            timestamp,
            own_rating_value: own_rating_value,
            own_rating_deviation: own_rating_deviation,
            floor,
            opponent_name,
            opponent_platform: match opponent_platform {
                1 => "PS",
                2 => "XB",
                3 => "PC",
                _ => "??",
            },
            opponent_vip,
            opponent_cheater,
            opponent_hidden,
            opponent_id: opponent_id.to_string(),
            opponent_character,
            opponent_character_short,
            opponent_rating_value: opponent_rating_value,
            opponent_rating_deviation: opponent_rating_deviation,
            result_win,
            odds,
        });
    }
    Ok(Json(response))
}

#[derive(Serialize)]
struct RankResponse {
    ranks: Vec<PlayerRankResponse>,
}

#[derive(Serialize)]
struct PlayerRankResponse {
    rank: i32,
    id: i64,
    name: String,
    rating: f32,
    deviation: f32,
    char_short: String,
    char_long: String,
}
async fn top(
    State(pools): State<AppState>,
    Query(pagination): Query<Pagination>,
) -> Json<RankResponse> {
    let mut db = pools.db_pool.get().await.unwrap();

    let count = pagination.count.unwrap_or(100) as i64;
    let offset = pagination.offset.unwrap_or(0) as i64;

    let games: Vec<(GlobalRank, Player, PlayerRating)> = schema::global_ranks::table
        .inner_join(schema::players::table.on(schema::players::id.eq(schema::global_ranks::id)))
        .inner_join(
            schema::player_ratings::table
                .on(schema::player_ratings::id.eq(schema::global_ranks::id)),
        )
        .select((
            GlobalRank::as_select(),
            Player::as_select(),
            PlayerRating::as_select(),
        ))
        .filter(schema::global_ranks::char_id.eq(schema::player_ratings::char_id))
        .order(schema::global_ranks::rank.asc())
        .limit(count)
        .offset(offset)
        .load(&mut db)
        .await
        .expect("Error loading games");

    //Create response from games
    let ranks: Vec<PlayerRankResponse> = games
        .iter()
        .map(|p| PlayerRankResponse {
            rank: p.0.rank,
            id: p.1.id,
            name: p.1.name.clone(),
            rating: p.2.value,
            deviation: p.2.deviation,
            char_short: CHAR_NAMES[p.0.char_id as usize].0.to_string(),
            char_long: CHAR_NAMES[p.0.char_id as usize].1.to_string(),
        })
        .collect();

    Json(RankResponse { ranks })
}

async fn top_char(
    State(pools): State<AppState>,
    Path(char_id): Path<String>,
    Query(pagination): Query<Pagination>,
) -> Result<Json<RankResponse>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let count = pagination.count.unwrap_or(100) as i64;
    let offset = pagination.offset.unwrap_or(0) as i64;

    let char_id = match CHAR_NAMES.iter().position(|(c, _)| *c == char_id) {
        Some(id) => id as i16,
        None => {
            return Err((StatusCode::NOT_FOUND, "Character not found".to_string()));
        }
    };

    let games: Vec<(CharacterRank, Player, PlayerRating)> = schema::character_ranks::table
        .inner_join(schema::players::table)
        .inner_join(
            schema::player_ratings::table.on(schema::players::id.eq(schema::player_ratings::id)),
        )
        .select((
            CharacterRank::as_select(),
            Player::as_select(),
            PlayerRating::as_select(),
        ))
        .filter(schema::character_ranks::char_id.eq(char_id))
        .filter(schema::player_ratings::char_id.eq(char_id))
        .order(schema::character_ranks::rank.asc())
        .limit(count)
        .offset(offset)
        .load(&mut db)
        .await
        .expect("Error loading games");

    let mut rank: i32 = offset as i32 + 1;
    let ranks: Vec<PlayerRankResponse> = games
        .iter()
        .map(|p| {
            let rank_response = PlayerRankResponse {
                rank: rank,
                id: p.1.id,
                name: p.1.name.clone(),
                rating: p.2.value,
                deviation: p.2.deviation,
                char_short: CHAR_NAMES[p.0.char_id as usize].0.to_string(),
                char_long: CHAR_NAMES[p.0.char_id as usize].1.to_string(),
            };
            rank += 1;
            rank_response
        })
        .collect();

    Ok(Json(RankResponse { ranks }))
}

async fn characters() -> Result<Json<Vec<(&'static str, &'static str)>>, (StatusCode, String)> {
    Ok(Json(CHAR_NAMES.to_vec()))
}

#[derive(Serialize)]
struct SearchResponse {
    results: Vec<PlayerSearchResponse>,
}
#[derive(Serialize)]
struct PlayerSearchResponse {
    id: i64,
    name: String,
    rating: f32,
    deviation: f32,
    char_short: String,
    char_long: String,
}
#[derive(Deserialize)]
struct SearchParams {
    search_string: String,
    exact: Option<bool>,
}
async fn player_search(
    State(pools): State<AppState>,
    Query(search_params): Query<SearchParams>,
) -> Result<Json<SearchResponse>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let count = 100;
    let offset = 0;

    let exact_like = if search_params.exact.unwrap_or(false) {
        format!("{}", search_params.search_string)
    } else {
        format!("%{}%", search_params.search_string)
    };

    let games: Vec<(Player, PlayerRating)> = schema::players::table
        .inner_join(
            schema::player_ratings::table.on(schema::player_ratings::id.eq(schema::players::id)),
        )
        .select((Player::as_select(), PlayerRating::as_select()))
        .filter(schema::players::name.ilike(exact_like))
        .filter(schema::players::status.eq(Status::Public))
        .limit(count)
        .offset(offset)
        .load(&mut db)
        .await
        .expect("Error loading games");

    //Create response from games
    let results: Vec<PlayerSearchResponse> = games
        .iter()
        .map(|p| PlayerSearchResponse {
            id: p.0.id,
            name: p.0.name.clone(),
            rating: p.1.value,
            deviation: p.1.deviation,
            char_short: CHAR_NAMES[p.1.char_id as usize].0.to_string(),
            char_long: CHAR_NAMES[p.1.char_id as usize].1.to_string(),
        })
        .collect();

    Ok(Json(SearchResponse { results }))
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
    let mut db = pools.db_pool.get().await.unwrap();

    let rcode_check_code = generate_code();

    let updated_row_count =
        update(schema::players::table.filter(schema::players::id.eq(player_id)))
            .set(schema::players::rcode_check_code.eq(rcode_check_code.clone()))
            .execute(&mut db)
            .await
            .expect("Error updating player");

    if updated_row_count == 0 {
        return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
    }

    Ok(Json(rcode_check_code))
}

async fn claim_poll(
    State(pools): State<AppState>,
    Path(player_id): Path<i64>,
) -> Result<Json<String>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let code = match schema::players::table
        .select(schema::players::rcode_check_code)
        .filter(schema::players::id.eq(player_id))
        .first::<Option<String>>(&mut db)
        .await
    {
        Ok(code) => code.unwrap(),
        Err(_) => {
            return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
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
        let player_api_key = match schema::players::table
            .select(schema::players::api_key)
            .filter(schema::players::id.eq(player_id))
            .first::<Option<String>>(&mut db)
            .await
        {
            Ok(key) => match key {
                Some(key) => Some(key),
                None => {
                    let key = uuid::Uuid::new_v4().to_string();
                    let updated_row_count =
                        update(schema::players::table.filter(schema::players::id.eq(player_id)))
                            .set(schema::players::api_key.eq(key.clone()))
                            .execute(&mut db)
                            .await
                            .expect("Error updating player");

                    if updated_row_count == 0 {
                        return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
                    }
                    Some(key)
                }
            },
            Err(_) => panic!("Error updating player"),
        }
        .unwrap();

        return Ok(Json(player_api_key));
    }

    Ok(Json("false".to_string()))
}

async fn toggle_private(
    State(pools): State<AppState>,
    Path(key): Path<String>,
) -> Result<Json<String>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let status = match schema::players::table
        .select(schema::players::status)
        .filter(schema::players::api_key.eq(key.clone()))
        .first::<Option<Status>>(&mut db)
        .await
    {
        Ok(Some(status)) => match status {
            Status::Public => Status::Private,
            Status::Private => Status::Public,
            Status::Cheater => Status::Cheater,
        },
        Ok(None) => {
            return Ok(Json("Invalid Key".to_string()));
        }
        Err(_) => {
            return Ok(Json("Invalid Key".to_string()));
        }
    };

    let updated_row_count = update(schema::players::table.filter(schema::players::api_key.eq(key)))
        .set(schema::players::status.eq(status))
        .execute(&mut db)
        .await
        .expect("Error updating player");

    if updated_row_count == 0 {
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

    let status = match schema::players::table
        .select(schema::players::status)
        .filter(schema::players::api_key.eq(key.clone()))
        .first::<Option<Status>>(&mut db)
        .await
    {
        Ok(Some(hidden)) => match hidden {
            Status::Public => "Not Hidden",
            Status::Private => "Hidden",
            Status::Cheater => "Cheater! :O",
        },
        Ok(None) => {
            return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
        }
        Err(_) => {
            return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
        }
    };

    let player_rating = match schema::players::table
        .inner_join(schema::player_ratings::table)
        .select((schema::players::id, schema::players::name))
        .filter(schema::players::api_key.eq(key))
        .first::<(i64, String)>(&mut db)
        .await
    {
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
    match schema::players::table
        .select(schema::players::status)
        .filter(schema::players::id.eq(player_id))
        .first::<Option<Status>>(&mut db)
        .await
    {
        Ok(Some(status)) => {
            if status != Status::Public {
                return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
            }
        }
        _ => {
            return Err((StatusCode::NOT_FOUND, "Player not found".to_string()));
        }
    }

    let alias: Vec<String> = schema::player_names::table
        .select(schema::player_names::name)
        .filter(schema::player_names::id.eq(player_id))
        .order(schema::player_names::name.asc())
        .load::<String>(&mut db)
        .await
        .expect("Error loading alias'");

    Ok(Json(alias))
}

#[derive(Serialize)]
struct RatingsResponse {
    timestamp: String,
    rating: f32,
}
use diesel::sql_types::{Float, Nullable, Timestamp};

#[derive(QueryableByName, Queryable)]
#[diesel(check_for_backend(diesel::pg::Pg))]
struct RatingResult {
    #[diesel(sql_type = Timestamp)]
    timestamp: chrono::NaiveDateTime,
    #[diesel(sql_type = Nullable<Float>)]
    value: Option<f32>,
}
async fn ratings(
    State(pools): State<AppState>,
    Path((player_id, char_id)): Path<(i64, String)>,
) -> Result<Json<Vec<RatingsResponse>>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let char_id = match CHAR_NAMES.iter().position(|(c, _)| *c == char_id) {
        Some(id) => id as i16,
        None => {
            return Err((StatusCode::NOT_FOUND, "Character not found".to_string()));
        }
    };

    //TODO when positional_order_by + limit is released, change this to ORM query.
    let results = diesel::sql_query(
        "
        (SELECT timestamp, value_a value
        FROM games
        WHERE id_a = $1 AND char_a = $2
        UNION
        SELECT timestamp, value_b value
        FROM games
        WHERE id_b = $1 AND char_b = $2)
        ORDER BY timestamp desc
        LIMIT $3;
    ",
    );
    let results = results
        .bind::<diesel::sql_types::BigInt, _>(i64::try_from(player_id).unwrap())
        .bind::<diesel::sql_types::Integer, _>(i32::try_from(char_id).unwrap())
        .bind::<diesel::sql_types::Integer, _>(i32::try_from(100).unwrap())
        .get_results::<RatingResult>(&mut db)
        .await
        .unwrap();

    let ratings = results
        .iter()
        .map(|p| RatingsResponse {
            timestamp: p.timestamp.to_string(),
            rating: p.value.unwrap_or(0.0),
        })
        .collect();

    Ok(Json(ratings))
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

#[derive(Serialize)]
struct StatsResponse {
    timestamp: String,
    total_games: i64,
    one_month_games: i64,
    one_week_games: i64,
    one_day_games: i64,
    one_hour_games: i64,
}
async fn stats(State(pools): State<AppState>) -> Result<Json<StatsResponse>, (StatusCode, String)> {
    let expiry = Duration::hours(1).num_seconds() as u32;

    let mut db = pools.db_pool.get().await.unwrap();
    let mut memcached = pools.memcached_pool.get().await.unwrap();

    let now = chrono::Utc::now().naive_utc();

    let timestamp;
    let total_games;
    let one_month_games;
    let one_week_games;
    let one_day_games;
    let one_hour_games;

    let last_update = memcached
        .get(&"last_update")
        .await
        .ok()
        .and_then(|data| String::from_utf8(data).ok())
        .unwrap_or_default();

    if last_update.is_empty() {
        debug!("Updating stats");

        // Get total game count
        total_games = schema::games::table
            .count()
            .get_result::<i64>(&mut db)
            .await
            .expect("Error loading games")
            .to_string();
        let (key, value) = ("total_games", total_games.as_bytes());
        let _ = memcached.set(&key, value, expiry).await;

        // Get one month game count
        one_month_games = schema::games::table
            .filter(
                schema::games::timestamp.gt(chrono::Utc::now().naive_utc() - Duration::days(30)),
            )
            .count()
            .get_result::<i64>(&mut db)
            .await
            .expect("Error loading games")
            .to_string();
        let (key, value) = ("one_month_games", one_month_games.as_bytes());
        let _ = memcached.set(&key, value, expiry).await;

        // Get one week game count
        one_week_games = schema::games::table
            .filter(schema::games::timestamp.gt(chrono::Utc::now().naive_utc() - Duration::days(7)))
            .count()
            .get_result::<i64>(&mut db)
            .await
            .expect("Error loading games")
            .to_string();
        let (key, value) = ("one_week_games", one_week_games.as_bytes());
        let _ = memcached.set(&key, value, expiry).await;

        // Get one day game count
        one_day_games = schema::games::table
            .filter(schema::games::timestamp.gt(chrono::Utc::now().naive_utc() - Duration::days(1)))
            .count()
            .get_result::<i64>(&mut db)
            .await
            .expect("Error loading games")
            .to_string();
        let (key, value) = ("one_day_games", one_day_games.as_bytes());
        let _ = memcached.set(&key, value, expiry).await;

        // Get one hour game count
        one_hour_games = schema::games::table
            .filter(
                schema::games::timestamp.gt(chrono::Utc::now().naive_utc() - Duration::hours(1)),
            )
            .count()
            .get_result::<i64>(&mut db)
            .await
            .expect("Error loading games")
            .to_string();
        let (key, value) = ("one_hour_games", one_hour_games.as_bytes());
        let _ = memcached.set(&key, value, expiry).await;

        // Set timestamp
        timestamp = chrono::DateTime::from_timestamp(now.and_utc().timestamp(), 0).unwrap().naive_utc().to_string();
        let (key, value) = ("last_update", timestamp.as_bytes());
        let _ = memcached.set(&key, value, expiry).await;
    } else {
        debug!("Using cached stats");

        total_games = memcached
            .get(&"total_games")
            .await
            .ok()
            .and_then(|data| String::from_utf8(data).ok())
            .unwrap_or_default();
        one_month_games = memcached
            .get(&"one_month_games")
            .await
            .ok()
            .and_then(|data| String::from_utf8(data).ok())
            .unwrap_or_default();
        one_week_games = memcached
            .get(&"one_week_games")
            .await
            .ok()
            .and_then(|data| String::from_utf8(data).ok())
            .unwrap_or_default();
        one_day_games = memcached
            .get(&"one_day_games")
            .await
            .ok()
            .and_then(|data| String::from_utf8(data).ok())
            .unwrap_or_default();
        one_hour_games = memcached
            .get(&"one_hour_games")
            .await
            .ok()
            .and_then(|data| String::from_utf8(data).ok())
            .unwrap_or_default();

        timestamp = last_update;
    }
    
    Ok(Json(StatsResponse {
        timestamp,
        total_games: total_games.parse().unwrap(),
        one_month_games: one_month_games.parse().unwrap(),
        one_week_games: one_week_games.parse().unwrap(),
        one_day_games: one_day_games.parse().unwrap(),
        one_hour_games: one_hour_games.parse().unwrap(),
    }))
}

#[tokio::main]
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

    let pool = bb8::Pool::builder().build(config).await?;

    let args = std::env::args().skip(1).collect::<Vec<_>>();
    match args.get(0).map(|r| r.deref()) {
        //This runs the timed jobs: grab replay, update ratings, update ranking, etc.
        Some("pull") => {
            let _guard = init_tracing("pull");
            pull::pull_and_update_continuous(pool).await;
        }
        //This skips checking last_rank_update, but it does set it.
        Some("hourly") => pull::do_hourly_update_once(pool).await,
        _ => {
            // No args, run the web server
            let _guard = init_tracing("web");

            let memcached_manager =
                MemcacheConnectionManager::new(std::env::var("MEMCACHED_URL").expect("MEMCACHED_URL")).unwrap();
            let memcached_pool = bb8::Pool::builder().build(memcached_manager).await?;

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
                .route("/api/ratings/:player_id/:char_id", get(ratings))
                .route("/api/stats", get(stats))
                .with_state(AppState {
                    db_pool: pool,
                    memcached_pool,
                });

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
