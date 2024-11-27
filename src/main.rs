use axum::extract::{Path, Query};
use axum::http::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, ORIGIN};
use axum::http::Method;
use axum::{extract::State, http::StatusCode, response::Json, routing::get, Router};
use diesel::sql_types::{BigInt, Float, Integer, Nullable, Timestamp};
use diesel::{prelude::*, update};
use diesel_async::{
    pooled_connection::AsyncDieselConnectionManager, AsyncPgConnection, RunQueryDsl,
};
use models::{CharacterRank, GlobalRank, Player, PlayerRating, Status};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ops::Deref;
use std::vec;
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, warn};
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::layer::SubscriberExt;
//use diesel::query_dsl::positional_order_dsl::{OrderColumn, PositionalOrderDsl, IntoOrderColumn};

use bb8_redis::{bb8, redis, RedisConnectionManager};

type Pool = bb8::Pool<AsyncDieselConnectionManager<AsyncPgConnection>>;
type RedisPool = bb8::Pool<RedisConnectionManager>;

#[derive(Clone)]
struct AppState {
    db_pool: Pool,
    redis_pool: RedisPool,
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
    tags: Vec<TagResponse>,
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
            tags: vec![],
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
            tags: vec![],
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

    //TODO Use Redis for this?
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

        //TODO Use Redis for this?
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

    let tags = schema::tags::table
        .select((schema::tags::tag, schema::tags::style))
        .filter(schema::tags::player_id.eq(id))
        .load::<(String, String)>(&mut db)
        .await
        .expect("Error loading tags");

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
        tags: tags
            .iter()
            .map(|(tag, style)| TagResponse {
                tag: tag.clone(),
                style: style.clone(),
            })
            .collect(),
    }))
}

#[derive(Serialize)]
pub struct PlayerGamesResponse {
    history: Vec<PlayerSet>,
    tags: HashMap<String, Vec<TagResponse>>, //player_id to tags
}
#[derive(Serialize, Clone)]
pub struct TagResponse {
    tag: String,
    style: String,
}
#[derive(Serialize)]
struct PlayerSet {
    timestamp: String,
    own_rating_value: f32,
    own_rating_deviation: f32,
    floor: String,
    opponent_name: String,
    opponent_platform: &'static str,
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
        .filter(schema::games::value_a.is_not_null())
        .order(
            crate::pull::coalesce(schema::games::real_timestamp, schema::games::timestamp).desc(),
        )
        .limit(count)
        .offset(offset)
        .load(&mut db)
        .await
        .expect("Error loading games");

    let mut response: PlayerGamesResponse = PlayerGamesResponse {
        history: vec![],
        tags: HashMap::new(),
    };

    for game in games {
        let tags: Vec<(String, String)> = schema::tags::table
            .select((schema::tags::tag, schema::tags::style))
            .filter(schema::tags::player_id.eq(if game.id_a == player_id {
                game.id_b
            } else {
                game.id_a
            }))
            .load(&mut db)
            .await
            .expect("Error loading tags");

        let is_hidden = game.value_a == Some(0.0);

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

        let opponent_id = if is_hidden {
            0
        } else if game.id_a == player_id {
            game.id_b
        } else {
            game.id_a
        };

        let opponent_name = if is_hidden {
            "Hidden".to_string()
        } else if game.id_a == player_id {
            game.name_b.clone()
        } else {
            game.name_a.clone()
        };

        let opponent_platform = if game.id_a == player_id {
            game.platform_b
        } else {
            game.platform_a
        };

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

        let timestamp = match game.real_timestamp {
            Some(ts) => ts.to_string(),
            None => game.timestamp.to_string(),
        };

        let floor = game.game_floor.to_string();

        let result_win = if game.id_a == player_id && game.winner == 1
            || game.id_b == player_id && game.winner == 2
        {
            true
        } else {
            false
        };

        let odds = if is_hidden {
            0.0
        } else if game.id_a == player_id {
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
            opponent_id: opponent_id.to_string(),
            opponent_character,
            opponent_character_short,
            opponent_rating_value: opponent_rating_value,
            opponent_rating_deviation: opponent_rating_deviation,
            result_win,
            odds,
        });

        if opponent_id != 0 {
            let tags: Vec<TagResponse> = tags
                .iter()
                .filter_map(|(tag, style)| {
                    if !style.is_empty() {
                        Some(TagResponse {
                            tag: tag.clone(),
                            style: style.clone(),
                        })
                    } else {
                        None
                    }
                })
                .collect();

            if tags.len() > 0 {
                response.tags.insert(opponent_id.to_string(), tags);
            }
        }
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
    tags: Vec<TagResponse>,
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

    //Get tags
    let mut all_tags: HashMap<String, Vec<TagResponse>> = HashMap::new();
    for game in games.iter() {
        let tags: Vec<(String, String)> = schema::tags::table
            .select((schema::tags::tag, schema::tags::style))
            .filter(schema::tags::player_id.eq(game.1.id))
            .load(&mut db)
            .await
            .expect("Error loading tags");

        let tags: Vec<TagResponse> = tags
            .iter()
            .filter_map(|(tag, style)| {
                if !style.is_empty() {
                    Some(TagResponse {
                        tag: tag.clone(),
                        style: style.clone(),
                    })
                } else {
                    None
                }
            })
            .collect();

        if tags.len() > 0 {
            all_tags.insert(game.1.id.to_string(), tags);
        }
    }

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
            tags: all_tags.get(&p.1.id.to_string()).unwrap_or(&vec![]).clone(),
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

    //Get tags
    let mut all_tags: HashMap<String, Vec<TagResponse>> = HashMap::new();
    for game in games.iter() {
        let tags: Vec<(String, String)> = schema::tags::table
            .select((schema::tags::tag, schema::tags::style))
            .filter(schema::tags::player_id.eq(game.1.id))
            .load(&mut db)
            .await
            .expect("Error loading tags");

        let tags: Vec<TagResponse> = tags
            .iter()
            .filter_map(|(tag, style)| {
                if !style.is_empty() {
                    Some(TagResponse {
                        tag: tag.clone(),
                        style: style.clone(),
                    })
                } else {
                    None
                }
            })
            .collect();

        if tags.len() > 0 {
            all_tags.insert(game.1.id.to_string(), tags);
        }
    }

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
                tags: all_tags.get(&p.1.id.to_string()).unwrap_or(&vec![]).clone(),
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
        Ok(code) => {
            match code {
                Some(code) => code,
                None => {
                    return Err((StatusCode::NOT_FOUND, "Code not found".to_string()));
                }
            }
        },
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
        WHERE id_a = $1
        AND char_a = $2
        AND value_a != 0
        AND value_a IS NOT NULL
        UNION
        SELECT timestamp, value_b value
        FROM games
        WHERE id_b = $1
        AND char_b = $2
        AND value_b != 0
        AND value_b IS NOT NULL)
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

async fn player_matchups(
    State(pools): State<AppState>,
    Path((player_id, char_id)): Path<(i64, String)>,
) -> Result<Json<MatchupCharResponse>, (StatusCode, String)> {
    let mut db = pools.db_pool.get().await.unwrap();

    let char_id = match CHAR_NAMES.iter().position(|(c, _)| *c == char_id) {
        Some(id) => id as i16,
        None => {
            return Err((StatusCode::NOT_FOUND, "Character not found".to_string()));
        }
    };

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
            AND id_a = $2
            --AND timestamp > now() - interval '3 month'
            UNION ALL
            SELECT 
                char_a as opponent_char, 
                winner,
                'b' as position
            FROM games
            WHERE char_b = $1
            AND id_b = $2
            --AND timestamp > now() - interval '3 month'
        ) as combined_results
        GROUP BY opponent_char
        ORDER BY opponent_char;
        ",
    );
    let char_matchup = results
        .bind::<Integer, _>(i32::try_from(char_id).unwrap())
        .bind::<BigInt, _>(i64::try_from(player_id).unwrap())
        .get_results::<crate::pull::Matchup>(&mut db)
        .await
        .unwrap();

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
    total_players: i64,
    one_month_players: i64,
    one_week_players: i64,
    one_day_players: i64,
    one_hour_players: i64,
}
async fn stats(State(pools): State<AppState>) -> Result<Json<StatsResponse>, (StatusCode, String)> {
    let mut redis = pools.redis_pool.get().await.unwrap();

    let timestamp = match redis::cmd("GET")
        .arg("last_update_hourly")
        .query_async::<String>(&mut *redis)
        .await
    {
        Ok(ts) => ts,
        Err(_) => {
            return Err((StatusCode::NOT_FOUND, "Stats not found".to_string()));
        }
    };

    let total_games = redis::cmd("GET")
        .arg("total_games")
        .query_async::<i64>(&mut *redis)
        .await
        .expect("Error getting total_games");

    let one_month_games = redis::cmd("GET")
        .arg("one_month_games")
        .query_async::<i64>(&mut *redis)
        .await
        .expect("Error getting one_month_games");

    let one_week_games = redis::cmd("GET")
        .arg("one_week_games")
        .query_async::<i64>(&mut *redis)
        .await
        .expect("Error getting one_week_games");

    let one_day_games = redis::cmd("GET")
        .arg("one_day_games")
        .query_async::<i64>(&mut *redis)
        .await
        .expect("Error getting one_day_games");

    let one_hour_games = redis::cmd("GET")
        .arg("one_hour_games")
        .query_async::<i64>(&mut *redis)
        .await
        .expect("Error getting one_hour_games");

    let total_players = redis::cmd("GET")
        .arg("total_players")
        .query_async::<i64>(&mut *redis)
        .await
        .expect("Error getting total_players");

    let one_month_players = redis::cmd("GET")
        .arg("one_month_players")
        .query_async::<i64>(&mut *redis)
        .await
        .expect("Error getting one_month_players");

    let one_week_players = redis::cmd("GET")
        .arg("one_week_players")
        .query_async::<i64>(&mut *redis)
        .await
        .expect("Error getting one_week_players");

    let one_day_players = redis::cmd("GET")
        .arg("one_day_players")
        .query_async::<i64>(&mut *redis)
        .await
        .expect("Error getting one_day_players");

    let one_hour_players = redis::cmd("GET")
        .arg("one_hour_players")
        .query_async::<i64>(&mut *redis)
        .await
        .expect("Error getting one_hour_players");

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

    let mut per_player: Vec<(String, i64)> = vec![];

    for e in CHAR_NAMES.iter() {
        let key = format!("popularity_per_player_{}", e.0);

        let value: i64 = match redis::cmd("GET").arg(key).query_async(&mut *redis).await {
            Ok(v) => v,
            Err(_) => {
                return Err((StatusCode::NOT_FOUND, "Popularity not found".to_string()));
            }
        };

        per_player.push((e.1.to_string(), value));
    }

    let mut per_character: Vec<(String, i64)> = vec![];

    for e in CHAR_NAMES.iter() {
        let key = format!("popularity_per_character_{}", e.0);
        let value: i64 = redis::cmd("GET")
            .arg(key)
            .query_async(&mut *redis)
            .await
            .expect("Error getting popularity");
        per_character.push((e.1.to_string(), value));
    }

    let popularity_per_player_total = redis::cmd("GET")
        .arg("popularity_per_player_total")
        .query_async::<i64>(&mut *redis)
        .await
        .expect("Error getting popularity_total");

    let one_month_games = redis::cmd("GET")
        .arg("one_month_games")
        .query_async::<i64>(&mut *redis)
        .await
        .expect("Error getting popularity_total");

    let last_update = redis::cmd("GET")
        .arg("last_update_daily")
        .query_async::<String>(&mut *redis)
        .await
        .expect("Error getting last_update_daily");

    Ok(Json(PopularityResult {
        per_player: per_player
            .iter()
            .map(|p| PopularityResultChar {
                name: p.0.clone(),
                value: p.1,
            })
            .collect(),
        per_character: per_character
            .iter()
            .map(|p| PopularityResultChar {
                name: p.0.clone(),
                value: p.1,
            })
            .collect(),
        per_player_total: popularity_per_player_total,
        per_character_total: one_month_games,
        last_update,
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

    let mut matchups_all = vec![];
    let mut matchups_1700 = vec![];

    for c in 0..CHAR_NAMES.len() {
        let key = format!("matchup_{}", c);

        let value: String = match redis::cmd("GET").arg(key).query_async(&mut *redis).await {
            Ok(v) => v,
            Err(_) => {
                return Err((StatusCode::NOT_FOUND, "Matchup not found".to_string()));
            }
        };

        let matchups_data: Vec<crate::pull::Matchup> = serde_json::from_str(&value).unwrap();
        let char_name = CHAR_NAMES[c].1.to_string();
        let char_short = CHAR_NAMES[c].0.to_string();

        let matchup = MatchupCharResponse {
            char_name,
            char_short,
            matchups: matchups_data
                .iter()
                .enumerate()
                .map(|(i, m)| MatchupEntry {
                    char_name: CHAR_NAMES[i].1.to_string(),
                    char_short: CHAR_NAMES[i].0.to_string(),
                    wins: m.wins,
                    total_games: m.total_games,
                })
                .collect(),
        };

        matchups_all.push(matchup);
    }

    for c in 0..CHAR_NAMES.len() {
      let key = format!("matchup_1700_{}", c);

      let value: String = match redis::cmd("GET").arg(key).query_async(&mut *redis).await {
          Ok(v) => v,
          Err(_) => {
              return Err((StatusCode::NOT_FOUND, "Matchup not found".to_string()));
          }
      };

      let matchups_data: Vec<crate::pull::Matchup> = serde_json::from_str(&value).unwrap();
      let char_name = CHAR_NAMES[c].1.to_string();
      let char_short = CHAR_NAMES[c].0.to_string();

      let matchup = MatchupCharResponse {
          char_name,
          char_short,
          matchups: matchups_data
              .iter()
              .enumerate()
              .map(|(i, m)| MatchupEntry {
                  char_name: CHAR_NAMES[i].1.to_string(),
                  char_short: CHAR_NAMES[i].0.to_string(),
                  wins: m.wins,
                  total_games: m.total_games,
              })
              .collect(),
      };

      matchups_1700.push(matchup);
  }

    let last_update = redis::cmd("GET")
        .arg("last_update_daily")
        .query_async::<String>(&mut *redis)
        .await
        .expect("Error getting last_update_daily");

    Ok(Json(MatchupResponse {
        last_update,
        data_all: matchups_all,
        data_1700: matchups_1700,
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

    let supporters: Vec<(i64, String)> = schema::tags::table
        .inner_join(schema::players::table.on(schema::tags::player_id.eq(schema::players::id)))
        .select((schema::tags::player_id, schema::players::name))
        .filter(schema::tags::tag.eq("VIP"))
        .load::<(i64, String)>(&mut db)
        .await
        .expect("Error loading supporters");

    let tags = schema::tags::table
        .select((
            schema::tags::player_id,
            schema::tags::tag,
            schema::tags::style,
        ))
        .order(schema::tags::tag.desc())
        .load::<(i64, String, String)>(&mut db)
        .await
        .expect("Error loading tags");

    Ok(Json(
        supporters
            .iter()
            .map(|(id, name)| Supporter {
                id: *id,
                name: name.clone(),
                tags: tags
                    .iter()
                    .filter(|(tag_id, _, _)| tag_id == id)
                    .map(|(_, tag, style)| TagResponse {
                        tag: tag.clone(),
                        style: style.clone(),
                    })
                    .collect(),
            })
            .collect(),
    ))
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
                .route("/api/ratings/:player_id/:char_id", get(ratings))
                .route("/api/stats", get(stats))
                .route("/api/popularity", get(popularity))
                .route("/api/matchups", get(matchups))
                .route("/api/matchups/:player_id/:char_id", get(player_matchups))
                .route("/api/supporters", get(supporters))
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
