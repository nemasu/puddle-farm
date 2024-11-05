extern crate simplelog;

use diesel::update;
use log::LevelFilter;
use models::{CharacterRank, GlobalRank, Player, PlayerRating, Status};
use rocket::fairing::{Fairing, Info, Kind};
use rocket::http::Header;
use rocket::{Request, Response};
use schema::players::api_key;
use simplelog::{ColorChoice, CombinedLogger, Config, TermLogger, TerminalMode, WriteLogger};

use std::collections::HashMap;
use std::fs::File;

use uuid::Uuid;

//use diesel::query_dsl::positional_order_dsl::{OrderColumn, PositionalOrderDsl, IntoOrderColumn};

#[macro_use] extern crate rocket;

use std::ops::Deref;

use rocket_db_pools::{Database, Connection};
use rocket_db_pools::diesel::{PgPool, prelude::*};

use rocket::serde::{json::Json, Serialize};

mod schema;
mod pull;
mod ggst_api;
mod requests;
mod responses;
mod models;

#[derive(Database)]
#[database("ratings")]
struct Db(PgPool);

use dotenv::dotenv;

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
struct RankResponse  {
    ranks: Vec<PlayerRankResponse>,
}

#[derive(Serialize)]
struct PlayerRankResponse  {
    rank: i32,
    id: i64,
    name: String,
    rating: f32,
    deviation: f32,
    char_short: String,
    char_long: String,
}
#[get("/api/top?<count>&<offset>")]
async fn top_all(mut db: Connection<Db>,
    count: Option<i64>,
    offset: Option<i64>,) -> Json<RankResponse> {
    
    let count = count.unwrap_or(100);
    let offset = offset.unwrap_or(0);

    let games: Vec<(GlobalRank, Player, PlayerRating)> = schema::global_ranks::table
        .inner_join(schema::players::table.on(schema::players::id.eq(schema::global_ranks::id)))
        .inner_join(schema::player_ratings::table.on(schema::player_ratings::id.eq(schema::global_ranks::id)))
        .select((GlobalRank::as_select(), Player::as_select(), PlayerRating::as_select()))
        .filter(schema::global_ranks::char_id.eq(schema::player_ratings::char_id))
        .order(schema::global_ranks::rank.asc())
        .limit(count)
        .offset(offset)
        .load(&mut db)
        .await
        .expect("Error loading games");
    
    //Create response from games
    let ranks: Vec<PlayerRankResponse> = games.iter().map(|p| {
        PlayerRankResponse {
            rank: p.0.rank,
            id: p.1.id,
            name: p.1.name.clone(),
            rating: p.2.value,
            deviation: p.2.deviation,
            char_short: CHAR_NAMES[ p.0.char_id as usize].0.to_string(),
            char_long: CHAR_NAMES[ p.0.char_id as usize].1.to_string(),
        }
    }).collect();
    
    Json(RankResponse { ranks })
}

#[get("/api/top_char?<char_id>&<count>&<offset>")]
async fn top_char(mut db: Connection<Db>,
    char_id: &str,
    count: Option<i64>,
    offset: Option<i64>,) -> Json<RankResponse> {

    let count = count.unwrap_or(100);
    let offset = offset.unwrap_or(0);

    let char_id = match CHAR_NAMES.iter().position(|(c, _)| *c == char_id) {
        Some(id) => {
            id as i16
        },
        None => {
            return Json(RankResponse { ranks: vec![] });
        }
    };

    let games: Vec<(CharacterRank, Player, PlayerRating)> = schema::character_ranks::table
        .inner_join(schema::players::table)
        .inner_join(schema::player_ratings::table.on(schema::players::id.eq(schema::player_ratings::id)))
        .select((CharacterRank::as_select(), Player::as_select(), PlayerRating::as_select()))
        .filter(schema::character_ranks::char_id.eq(char_id))
        .filter(schema::player_ratings::char_id.eq(char_id))
        .order(schema::character_ranks::rank.asc())
        .limit(count)
        .offset(offset)
        .load(&mut db)
        .await
        .expect("Error loading games");
    

    let mut rank: i32 = offset as i32 + 1;
    let ranks: Vec<PlayerRankResponse> = games.iter().map(|p| {
        let rank_response = PlayerRankResponse {
            rank: rank,
            id: p.1.id,
            name: p.1.name.clone(),
            rating: p.2.value,
            deviation: p.2.deviation,
            char_short: CHAR_NAMES[ p.0.char_id as usize].0.to_string(),
            char_long: CHAR_NAMES[ p.0.char_id as usize].1.to_string(),
        };
        rank += 1;
        rank_response
    }).collect();
    
    Json(RankResponse { ranks })
    
}

#[get("/api/characters")]
async fn characters() -> Json<Vec<(&'static str, &'static str)>> {
    Json(CHAR_NAMES.to_vec())
}

#[derive(Serialize)]
struct PlayerResponse  {
    id: i64,
    name: String,
    ratings: Vec<PlayerResponsePlayer>,
    platform: String,
    status: String,
    top_global: i32,
}

impl PlayerResponse {
    fn empty() -> PlayerResponse {
        PlayerResponse {
            ratings: vec![],
            id: 0,
            name: "Player not found".to_string(),
            status: "Unknown".to_string(),
            platform: "???".to_string(),
            top_global: 0,
        }
    }

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
struct PlayerResponsePlayer  {
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

#[get("/api/player/<player_id>")]
async fn player(mut db: Connection<Db>, player_id: &str) -> Json<PlayerResponse> {
    
    let id = match i64::from_str_radix(player_id, 10) {
        Ok(id) => id,
        Err(_) => {
            return Json(PlayerResponse::empty());
        }
    };

    let player_char: Vec<(Player, PlayerRating)> = schema::players::table
        .inner_join(schema::player_ratings::table)
        .filter(schema::players::id.eq(id))
        .select((Player::as_select(), PlayerRating::as_select()))
        .load(&mut db)
        .await
        .expect("Error loading player");

    if player_char.len() == 0 {
        return Json(PlayerResponse::empty());
    }

    let status = player_char[0].0.status.clone().unwrap().to_string();

    
    //If the player is not public, then return an appropriate response 
    match player_char[0].0.status {
        Some(Status::Cheater) => { return Json(PlayerResponse::cheater()); },
        Some(Status::Private) => { return Json(PlayerResponse::private()); },
        _ => {},
    }

    let mut match_counts = HashMap::new();
    let mut top_chars = HashMap::new();
    let mut top_defeated = HashMap::new();
    let mut top_rating = HashMap::new();

    let top_global = match schema::global_ranks::table
    .filter(schema::global_ranks::id.eq(id))
    .select(schema::global_ranks::rank)
    .first::<i32>(&mut db)
    .await {
        Ok(rank) => rank,
        Err(_) => 0,
    };

    for (player, rating) in player_char.iter() {
        let match_count = schema::games::table
            .filter(schema::games::id_a.eq(player.id).and(schema::games::char_a.eq(rating.char_id)))
            .or_filter(schema::games::id_b.eq(player.id).and(schema::games::char_b.eq(rating.char_id)))
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
            .await {
                Ok(rank) => rank,
                Err(_) => 0,
            };
            

        top_chars.insert(rating.char_id, top_char);

        let top_defeated_res: Vec<(chrono::NaiveDateTime, i64, String, i16, Option<f32>, Option<f32>, Option<f32>)> =
            schema::games::table
                .select(
                    (schema::games::timestamp,
                        schema::games::id_b,
                        schema::games::name_b,
                        schema::games::char_b,
                        schema::games::value_b,
                        schema::games::deviation_b,
                        schema::games::value_b - schema::games::deviation_b)
                    )
                .filter(
                    schema::games::id_a.eq(id)
                        .and(schema::games::char_a.eq(rating.char_id))
                        .and(schema::games::winner.eq(1))
                        .and(schema::games::deviation_b.lt(30.0))
                    )
                    .order((schema::games::value_b - schema::games::deviation_b).desc())
                    .limit(1)
                .union(
                    schema::games::table.select(
                        (schema::games::timestamp,
                            schema::games::id_a,
                            schema::games::name_a,
                            schema::games::char_a,
                            schema::games::value_a,
                            schema::games::deviation_a,
                            schema::games::value_a - schema::games::deviation_a)
                        )
                        .order((schema::games::value_a - schema::games::deviation_a).desc())
                        .limit(1)
                    .filter(
                        schema::games::id_b.eq(id)
                        .and(schema::games::char_b.eq(rating.char_id))
                        .and(schema::games::winner.eq(2))
                        .and(schema::games::deviation_a.lt(30.0))
                    )
                )
                //HELP: This doesn't work, limit(1) is causing a compile error, why?
                //.positional_order_by(OrderColumn::from(6).desc())
                //.limit(1)
                .load::<(chrono::NaiveDateTime, i64, String, i16, Option<f32>, Option<f32>, Option<f32>)>(&mut db)
                .await
                .expect("Error loading games");

        if top_defeated_res.len() > 1 {

            //HELP: Shouldn't need to do this (see above), but limit doesn't work.
            let mut highest_index = 0;
            if top_defeated_res[0].6.unwrap() < top_defeated_res[1].6.unwrap() {
                highest_index = 1;
            }

            top_defeated.insert(rating.char_id, TopDefeated{
                timestamp: top_defeated_res[highest_index].0.to_string(),
                id: top_defeated_res[highest_index].1,
                name: top_defeated_res[highest_index].2.clone(),
                char_short: CHAR_NAMES[ top_defeated_res[highest_index].3 as usize].0.to_string(),
                value: top_defeated_res[highest_index].4.unwrap_or(0.0),
                deviation: top_defeated_res[highest_index].5.unwrap_or(0.0),
            });
        }

        let top_rating_res: Vec<(chrono::NaiveDateTime, Option<f32>, Option<f32>, Option<f32>)> =
            schema::games::table
                .select(
                    (schema::games::timestamp,
                        schema::games::value_a,
                        schema::games::deviation_a,
                        schema::games::value_a - schema::games::deviation_a
                    )
                )
                .filter(
                    schema::games::id_a.eq(id)
                        .and(schema::games::char_a.eq(rating.char_id))
                    )
                .order((schema::games::value_a - schema::games::deviation_a).desc())
                .limit(1)
                .union(
                    schema::games::table.select(
                        (schema::games::timestamp,
                            schema::games::value_b,
                            schema::games::deviation_b,
                            schema::games::value_b - schema::games::deviation_b)
                        )
                    .filter(
                        schema::games::id_b.eq(id)
                        .and(schema::games::char_b.eq(rating.char_id))
                    )
                    .order((schema::games::value_b - schema::games::deviation_b).desc())
                    .limit(1)
                )
                //HELP: This doesn't work, limit(1) is causing a compile error, why?
                //.positional_order_by(OrderColumn::from(6).desc())
                //.limit(1)
                .load::<(chrono::NaiveDateTime, Option<f32>, Option<f32>, Option<f32>)>(&mut db)
                .await
                .expect("Error loading games");

        if top_rating_res.len() > 1 {

            //HELP: Shouldn't need to do this (see above), but limit doesn't work.
            let mut highest_index = 0;
            if top_rating_res[0].3.unwrap() < top_rating_res[1].3.unwrap() {
                highest_index = 1;
            }

            top_rating.insert(rating.char_id, TopRating{
                timestamp: top_rating_res[highest_index].0.to_string(),
                value: top_rating_res[highest_index].1.unwrap(),
                deviation: top_rating_res[highest_index].2.unwrap(),
            });
        }
    }

    let ratings: Vec<PlayerResponsePlayer> = player_char.iter().map(|p| {
        PlayerResponsePlayer {
            rating: p.1.value,
            deviation: p.1.deviation,
            char_short: CHAR_NAMES[ p.1.char_id as usize].0.to_string(),
            character: CHAR_NAMES[ p.1.char_id as usize].1.to_string(),
            match_count: match_counts.get(&p.1.char_id).unwrap().clone(),
            top_char: top_chars.get(&p.1.char_id).unwrap().clone(),
            top_defeated: top_defeated.get(&p.1.char_id).unwrap_or(&TopDefeated{
                timestamp: "N/A".to_string(),
                id: 0,
                name: "N/A".to_string(),
                char_short: "N/A".to_string(),
                value: 0.0,
                deviation: 0.0,
            }).clone(),
            top_rating: top_rating.get(&p.1.char_id).unwrap_or(&TopRating{
                timestamp: "N/A".to_string(),
                value: 0.0,
                deviation: 0.0,
            }).clone(),
        }
    }).collect();

    Json(PlayerResponse {
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
    })
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
#[get("/api/player/<player_id>/<char_id>/history?<count>&<offset>")]
async fn player_games(mut db: Connection<Db>,
    player_id: &str,
    char_id: &str,
    count: Option<i64>,
    offset: Option<i64>, ) -> Json<PlayerGamesResponse> {

        if let Ok(id) = i64::from_str_radix(player_id, 10) {
            let char_id = match CHAR_NAMES.iter().position(|(c, _)| *c == char_id) {
                Some(id) => {
                    id as i16
                },
                None => {
                    return Json(PlayerGamesResponse {
                        history: vec![],
                    });
                }
            };
            
            //Return empty if player's status is not Public
            match schema::players::table
                .select(schema::players::status)
                .filter(schema::players::id.eq(id))
                .first::<Option<Status>>(&mut db)
                .await {
                    Ok(Some(status)) => {
                        if status != Status::Public {
                            return Json(PlayerGamesResponse {
                                history: vec![],
                            });
                        }
                    },
                    _ => {
                        return Json(PlayerGamesResponse {
                            history: vec![],
                        });
                    }
                }
                
            let count = count.unwrap_or(100);
            let offset = offset.unwrap_or(0);
    
            let games: Vec<models::Game> = schema::games::table
                .filter((schema::games::id_a.eq(id).and(schema::games::char_a.eq(char_id as i16)))
                    .or(schema::games::id_b.eq(id).and(schema::games::char_b.eq(char_id as i16))))
                .order(schema::games::timestamp.desc())
                .limit(count)
                .offset(offset)
                .load(&mut db)
                .await
                .expect("Error loading games");

            let mut response: PlayerGamesResponse = PlayerGamesResponse {
                history: vec![],
            };

            for game in games {
                let own_rating_value = if game.id_a == id { game.value_a.unwrap() } else { game.value_b.unwrap() };
                let own_rating_deviation = if game.id_a == id { game.deviation_a.unwrap() } else { game.deviation_b.unwrap() };
                let opponent_id = if game.id_a == id { game.id_b } else { game.id_a };
                let opponent_name = if game.id_a == id { game.name_b.clone() } else { game.name_a.clone() };
                let opponent_platform = if game.id_a == id { game.platform_b } else { game.platform_a };
                let opponent_vip = None;
                let opponent_cheater = None;
                let opponent_hidden = None;
                let opponent_character = if game.id_a == id { CHAR_NAMES[game.char_b as usize].1 } else { CHAR_NAMES[game.char_a as usize].1 };
                let opponent_character_short = if game.id_a == id { CHAR_NAMES[game.char_b as usize].0 } else { CHAR_NAMES[game.char_a as usize].0 };
                let opponent_rating_value = if game.id_a == id { game.value_b.unwrap() } else { game.value_a.unwrap() };
                let opponent_rating_deviation = if game.id_a == id { game.deviation_b.unwrap() } else { game.deviation_a.unwrap() };
                let timestamp = game.timestamp.to_string();
                let floor = game.game_floor.to_string();
                let result_win = if game.id_a == id && game.winner == 1 || game.id_b == id && game.winner == 2 { true } else { false };
                let odds = if game.id_a == id {game.win_chance.unwrap_or(0.0)} else {1.0 - game.win_chance.unwrap_or(0.0)};

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
            Json(response)
                
        } else {
            Json(PlayerGamesResponse {
                history: vec![],
            })
        }
}

#[derive(Serialize)]
struct SearchResponse  {
    results: Vec<PlayerSearchResponse>,
}

#[derive(Serialize)]
struct PlayerSearchResponse  {
    id: i64,
    name: String,
    rating: f32,
    deviation: f32,
    char_short: String,
    char_long: String,
}
#[get("/api/player/search?<search_string>&<exact>")]
async fn player_search(mut db: Connection<Db>,
    search_string: &str,
    exact: Option<bool>,
    ) -> Json<SearchResponse> {

        let count = 100;
        let offset = 0;

        let exact_like = if exact.unwrap_or(false) { format!("{}", search_string) } else { format!("%{}%", search_string) };

        let games: Vec<(Player, PlayerRating)> = schema::players::table
            .inner_join(schema::player_ratings::table.on(schema::player_ratings::id.eq(schema::players::id)))
            .select((Player::as_select(), PlayerRating::as_select()))
            .filter(schema::players::name.ilike(exact_like))
            .filter(schema::players::status.eq(Status::Public))
            .limit(count)
            .offset(offset)
            .load(&mut db)
            .await
            .expect("Error loading games");
        
        //Create response from games
        let results: Vec<PlayerSearchResponse> = games.iter().map(|p| {
            PlayerSearchResponse {
                id: p.0.id,
                name: p.0.name.clone(),
                rating: p.1.value,
                deviation: p.1.deviation,
                char_short: CHAR_NAMES[ p.1.char_id as usize].0.to_string(),
                char_long: CHAR_NAMES[ p.1.char_id as usize].1.to_string(),
            }
        }).collect();
        
        Json(SearchResponse { results })

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

#[get("/api/claim/<player_id>")]
async fn start_player_claim(mut db: Connection<Db>, player_id: &str) -> Json<String> {
    let id = match i64::from_str_radix(player_id, 10) {
        Ok(id) => id,
        Err(_) => {
            return Json("Invalid ID".to_string());
        }
    };

    let rcode_check_code = generate_code();

    let updated_row_count = update(schema::players::table.filter(schema::players::id.eq(id)))
        .set(schema::players::rcode_check_code.eq(rcode_check_code.clone()))
        .execute(&mut db)
        .await
        .expect("Error updating player");

    if updated_row_count == 0 {
        return Json("Invalid ID".to_string());
    }

    Json(rcode_check_code)
}

#[get("/api/claim/poll/<player_id>")]
async fn poll_player_claim(mut db: Connection<Db>, player_id: &str) -> Json<String> {
    let id = match i64::from_str_radix(player_id, 10) {
        Ok(id) => id,
        Err(_) => {
            return Json("Invalid ID".to_string());
        }
    };

    let code = match schema::players::table
        .select(schema::players::rcode_check_code)
        .filter(schema::players::id.eq(id))
        .first::<Option<String>>(&mut db)
        .await {
            Ok(code) => code.unwrap(),
            Err(_) => {
                return Json("Invalid ID".to_string());
            }
        };
    
    let json = ggst_api::get_player_stats(id.to_string()).await;
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
            .select(api_key)
            .filter(schema::players::id.eq(id))
            .first::<Option<String>>(&mut db)
            .await {
                Ok(key) => {
                    match key {
                        Some(key) => Some(key),
                        None => {
                            let key = Uuid::new_v4().to_string();
                            let updated_row_count = update(schema::players::table.filter(schema::players::id.eq(id)))
                                .set(api_key.eq(key.clone()))
                                .execute(&mut db)
                                .await
                                .expect("Error updating player");

                            if updated_row_count == 0 {
                                return Json("Invalid ID".to_string());
                            }
                            Some(key)
                        },
                    }
                },
                Err(_) => panic!("Error updating player"),
            }.unwrap();

        return Json(player_api_key);
    }

    Json("false".to_string())
}


#[get("/api/toggle_private/<key>")]
async fn toggle_private(mut db: Connection<Db>, key: &str) -> Json<String> {
    let status = match schema::players::table
        .select(schema::players::status)
        .filter(api_key.eq(key))
        .first::<Option<Status>>(&mut db)
        .await {
            Ok(Some(status)) => {
                match status {
                    Status::Public => Status::Private,
                    Status::Private => Status::Public,
                    Status::Cheater => Status::Cheater,
                }

            },
            Ok(None) => {
                return Json("Invalid Key".to_string());
            }
            Err(_) => {
                return Json("Invalid Key".to_string());
            }
        };

    let updated_row_count = update(schema::players::table.filter(api_key.eq(key)))
        .set(schema::players::status.eq(status))
        .execute(&mut db)
        .await
        .expect("Error updating player");

    if updated_row_count == 0 {
        return Json("Invalid Key".to_string());
    }

    Json("true".to_string())
}

#[derive(Serialize)]
struct SettingsResponse  {
    id: i64,
    name: String,
    status: String,
}
#[get("/api/settings/<key>")]
async fn get_settings_data(mut db: Connection<Db>, key: &str) -> Json<SettingsResponse> {
    let status = match schema::players::table
        .select(schema::players::status)
        .filter(api_key.eq(key))
        .first::<Option<Status>>(&mut db)
        .await {
            Ok(Some(hidden)) => {
                match hidden {
                    Status::Public => "Not Hidden",
                    Status::Private => "Hidden",
                    Status::Cheater => "Cheater! :O",
                }
            },
            Ok(None) => {
                return Json(SettingsResponse { id: 0, name: "".to_string(), status: "".to_string() });
            }
            Err(_) => {
                return Json(SettingsResponse { id: 0, name: "".to_string(), status: "".to_string() });
            }
        };

        let player_rating = match schema::players::table
            .inner_join(schema::player_ratings::table)
            .select((schema::players::id, schema::players::name))
            .filter(api_key.eq(key))
            .first::<(i64, String)>(&mut db)
            .await {
                Ok(player_rating) => player_rating,
                Err(_) => {
                    return Json(SettingsResponse { id: 0, name: "".to_string(), status: "".to_string() });
                }
            };

    Json(SettingsResponse {
        id: player_rating.0,
        name: player_rating.1,
        status: status.to_string(),
    })
}

#[get("/api/alias/<player_id>")]
async fn get_alias(mut db: Connection<Db>, player_id: &str) -> Json<Vec<String>> {

    let id = match i64::from_str_radix(player_id, 10) {
        Ok(id) => id,
        Err(_) => {
            return Json(vec![]);
        }
    };

    //If player is not Public, return empty
    match schema::players::table
        .select(schema::players::status)
        .filter(schema::players::id.eq(id))
        .first::<Option<Status>>(&mut db)
        .await {
            Ok(Some(status)) => {
                if status != Status::Public {
                    return Json(vec![]);
                }
            },
            _ => {
                return Json(vec![]);
            }
        }

    let alias: Vec<String> = schema::player_names::table
        .select(schema::player_names::name)
        .filter(schema::player_names::id.eq(id))
        .order(schema::player_names::name.asc())
        .load::<String>(&mut db)
        .await
        .expect("Error loading alias'");

    Json(alias)
}

#[derive(Serialize)] 
struct RatingsResponse {
    timestamp: String,
    rating: f32,
}
use diesel::sql_types::{Float, Timestamp, Nullable};

#[derive(QueryableByName, Queryable)]
#[diesel(check_for_backend(diesel::pg::Pg))]
struct RatingResult {
    #[diesel(sql_type = Timestamp)]
    timestamp: chrono::NaiveDateTime,
    #[diesel(sql_type = Nullable<Float>)]
    value: Option<f32>,
}
#[get("/api/ratings/<player_id>/<char_id>")]
async fn get_ratings(mut db: Connection<Db>, player_id: &str, char_id: &str) -> Json<Vec<RatingsResponse>> {
    
    let id = match i64::from_str_radix(player_id, 10) {
        Ok(id) => id,
        Err(_) => {
            return Json(vec![]);
        }
    };

    let char_id = match CHAR_NAMES.iter().position(|(c, _)| *c == char_id) {
        Some(id) => {
            id as i16
        },
        None => {
            return Json(vec![RatingsResponse { timestamp: "N/A".to_string(), rating: 0.0 }]);
        }
    };

    //HELP: positional_order_by + limit does not work, so we need to use SQL for this.
    let results = diesel::sql_query("
        (SELECT timestamp, value_a value
        FROM games
        WHERE id_a = $1 AND char_a = $2
        UNION
        SELECT timestamp, value_b value
        FROM games
        WHERE id_b = $1 AND char_b = $2)
        ORDER BY timestamp desc
        LIMIT $3;
    ");
    let results = results
        .bind::<diesel::sql_types::BigInt, _>(i64::try_from(id).unwrap())
        .bind::<diesel::sql_types::Integer, _>(i32::try_from(char_id).unwrap())
        .bind::<diesel::sql_types::Integer, _>(i32::try_from(100).unwrap())
        .get_results::<RatingResult>(&mut db).await.unwrap();

    let ratings = results.iter().map(|p| {
        RatingsResponse {
            timestamp: p.timestamp.to_string(),
            rating: p.value.unwrap_or(0.0),
        }
    }).collect();

    Json(ratings)
}


#[rocket::main]
async fn main() {
    dotenv().expect("dotenv failed");
    
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    match args.get(0).map(|r| r.deref()) {
        //This runs the timed jobs: grab replay, update ratings, update ranking, etc.
        Some("pull") => {

            CombinedLogger::init(
                vec![
                    TermLogger::new(LevelFilter::Info, Config::default(), TerminalMode::Mixed, ColorChoice::Auto),
                    WriteLogger::new(LevelFilter::Info, Config::default(), File::create("pull.log").unwrap()),
                ]
            ).unwrap();

            pull::pull_and_update_continuous().await;
        },
        //This skips checking last_rank_update, but it does set it.
        Some("hourly") => {

            CombinedLogger::init(
                vec![
                    TermLogger::new(LevelFilter::Info, Config::default(), TerminalMode::Mixed, ColorChoice::Auto),
                    WriteLogger::new(LevelFilter::Info, Config::default(), File::create("hourly.log").unwrap()),
                ]
            ).unwrap();

            pull::do_hourly_update_once().await
        },
        _ => {

            CombinedLogger::init(
                vec![
                    TermLogger::new(LevelFilter::Info, Config::default(), TerminalMode::Mixed, ColorChoice::Auto),
                    WriteLogger::new(LevelFilter::Info, Config::default(), File::create("output.log").unwrap()),
                ]
            ).unwrap();

            run().await;
        }
    }
}

pub struct Cors;
#[rocket::async_trait]
impl Fairing for Cors {
    fn info(&self) -> Info {
        Info {
            name: "Cross-Origin-Resource-Sharing Fairing",
            kind: Kind::Response,
        }
    }

    async fn on_response<'r>(&self, _request: &'r Request<'_>, response: &mut Response<'r>) {
        response.set_header(Header::new("Access-Control-Allow-Origin", "*"));
        response.set_header(Header::new(
            "Access-Control-Allow-Methods",
            "POST, PATCH, PUT, DELETE, HEAD, OPTIONS, GET",
        ));
        response.set_header(Header::new("Access-Control-Allow-Headers", "*"));
        response.set_header(Header::new("Access-Control-Allow-Credentials", "true"));
    }
}

pub async fn run() {
    let routes = routes![
        player,
        player_games,
        top_all,
        top_char,
        characters,
        player_search,
        start_player_claim,
        poll_player_claim,
        toggle_private,
        get_settings_data,
        get_alias,
        get_ratings,
    ];

    if cfg!(debug_assertions) {//Cors only used for development
        rocket::build()
            .attach(Db::init())
            .attach(Cors)
            //.register("/", catchers![catch_404, catch_500, catch_503])
            .mount("/", routes)
            .ignite()
            .await
            .unwrap()
            .launch()
            .await
            .unwrap();
    } else {
        rocket::build()
            .attach(Db::init())
            //.register("/", catchers![catch_404, catch_500, catch_503])
            .mount("/", routes)
            .ignite()
            .await
            .unwrap()
            .launch()
            .await
            .unwrap();
        }
}