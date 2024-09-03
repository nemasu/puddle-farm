extern crate simplelog;

use log::LevelFilter;
use models::{Player, PlayerRating, GlobalRank};
use rocket::fairing::{Fairing, Info, Kind};
use rocket::http::Header;
use rocket::{Request, Response};
use simplelog::{ColorChoice, CombinedLogger, Config, TermLogger, TerminalMode, WriteLogger};

use std::fs::File;

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

mod migrate;

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
];

#[derive(Serialize)]
struct RankResponse  {
    rank: Vec<PlayerRankResponse>,
}

#[derive(Serialize)]
struct PlayerRankResponse  {
    rank: i32,
    id: i64,
    name: String,
    rating: f32,
    deviation: f32,
    char_short: String,
}
#[get("/api/top?<game_count>&<offset>")]
async fn top_all(mut db: Connection<Db>,
    game_count: Option<i64>,
    offset: Option<i64>,) -> Json<RankResponse> {
    
    let game_count = game_count.unwrap_or(100);
    let offset = offset.unwrap_or(0);

    let games: Vec<(GlobalRank, Player, PlayerRating)> = schema::global_ranks::table
        .inner_join(schema::players::table)
        .inner_join(schema::player_ratings::table.on(schema::players::id.eq(schema::player_ratings::id)))
        .select((GlobalRank::as_select(), Player::as_select(), PlayerRating::as_select()))
        .order(schema::global_ranks::rank.asc())
        .limit(game_count)
        .offset(offset)
        .load(&mut db)
        .await
        .expect("Error loading games");
    
    //Create response from games
    let rank: Vec<PlayerRankResponse> = games.iter().map(|p| {
        PlayerRankResponse {
            rank: p.0.rank,
            id: p.1.id,
            name: p.1.name.clone(),
            rating: p.2.value,
            deviation: p.2.deviation,
            char_short: CHAR_NAMES[ p.2.char_id as usize].0.to_string(),
        }
    }).collect();
    
    Json(RankResponse { rank })
}

#[get("/api/top_char?<char_id>&<game_count>&<offset>")]
async fn top_char(mut db: Connection<Db>,
    char_id: &str,
    game_count: Option<i64>,
    offset: Option<i64>,) -> Json<RankResponse> {

    let game_count = game_count.unwrap_or(100);
    let offset = offset.unwrap_or(0);

    let char_id = match CHAR_NAMES.iter().position(|(c, _)| *c == char_id) {
        Some(id) => {
            id as i16
        },
        None => {
            return Json(RankResponse { rank: vec![] });
        }
    };

    let games: Vec<(GlobalRank, Player, PlayerRating)> = schema::global_ranks::table
        .inner_join(schema::players::table)
        .inner_join(schema::player_ratings::table.on(schema::players::id.eq(schema::player_ratings::id)))
        .select((GlobalRank::as_select(), Player::as_select(), PlayerRating::as_select()))
        .filter(schema::global_ranks::char_id.eq(char_id))
        .order(schema::global_ranks::rank.asc())
        .limit(game_count)
        .offset(offset)
        .load(&mut db)
        .await
        .expect("Error loading games");
    
    let rank: Vec<PlayerRankResponse> = games.iter().map(|p| {
        PlayerRankResponse {
            rank: p.0.rank,
            id: p.1.id,
            name: p.1.name.clone(),
            rating: p.2.value,
            deviation: p.2.deviation,
            char_short: CHAR_NAMES[ p.2.char_id as usize].0.to_string(),
        }
    }).collect();
    
    Json(RankResponse { rank })
    
}

#[derive(Serialize)]
struct PlayerResponse  {
    player: Vec<PlayerResponsePlayer>,
}

#[derive(Serialize)]
struct PlayerResponsePlayer  {
    id: i64,
    name: String,
    rating: f32,
    deviation: f32,
    char_id: String,
}
#[get("/api/player/<player_id>")]
async fn player(mut db: Connection<Db>, player_id: &str) -> Json<PlayerResponse> {
    
    let id = match i64::from_str_radix(player_id, 10) {
        Ok(id) => id,
        Err(_) => {
            return Json(PlayerResponse { player: vec![] });
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
        return Json(PlayerResponse { player: vec![] });
    }

    let player: Vec<PlayerResponsePlayer> = player_char.iter().map(|p| {
        PlayerResponsePlayer {
            id: p.0.id,
            name: p.0.name.clone(),
            rating: p.1.value,
            deviation: p.1.deviation,
            char_id: CHAR_NAMES[ p.1.char_id as usize].0.to_string(),
        }
    }).collect();

    Json(PlayerResponse {
        player: player,
    })
}


#[derive(Serialize)]
struct PlayerCharResponse  {
    id: i64,
    name: String,
    rating: f32,
    deviation: f32,
}
#[get("/api/player/<player_id>/<char_id>")] 
async fn player_char(mut db: Connection<Db>, player_id: &str, char_id: &str) -> Json<PlayerCharResponse> {

    let id = match i64::from_str_radix(player_id, 10) {
        Ok(id) => id,
        Err(_) => {
            return Json(PlayerCharResponse {
                id: 0,
                name: "".to_string(),
                rating: 0.0,
                deviation: 0.0,
            });
        }
    };

    let char_id = match CHAR_NAMES.iter().position(|(c, _)| *c == char_id) {
        Some(id) => {
            id as i16
        },
        None => {
            return Json(PlayerCharResponse {
                id: 0,
                name: "".to_string(),
                rating: 0.0,
                deviation: 0.0,
            });
        }
    };

    let player_char: Vec<(Player, PlayerRating)> = schema::players::table
        .inner_join(schema::player_ratings::table)
        .filter(schema::players::id.eq(id))
        .filter(schema::player_ratings::char_id.eq(char_id))
        .select((Player::as_select(), PlayerRating::as_select()))
        .load(&mut db)
        .await
        .expect("Error loading player");

    if player_char.len() == 0 {
        return Json(PlayerCharResponse {
            id: 0,
            name: "Not found".to_string(),
            rating: 0.0,
            deviation: 0.0,
        });
    }

    let context = PlayerCharResponse {
        id: player_char[0].0.id,
        name: player_char[0].0.name.clone(),
        rating: player_char[0].1.value,
        deviation: player_char[0].1.deviation,
    };

    Json(context)
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
    expected_outcome: String,
    rating_change: String,
    rating_change_class: &'static str,
    rating_change_sequence: String,
    result_wins: i32,
    result_losses: i32,
    result_percent: f32,
}
#[get("/api/player/<player_id>/<char_id>/history?<game_count>&<offset>")]
async fn player_games(mut db: Connection<Db>,
    player_id: &str,
    char_id: &str,
    game_count: Option<i64>,
    offset: Option<i64>,) -> Json<PlayerGamesResponse> {

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
            
            let game_count = game_count.unwrap_or(100);
            let offset = offset.unwrap_or(0);
    
            log::info!("id: {}, char_id: {}, game_count: {}, offset: {}", id, char_id, game_count, offset);

            let games: Vec<models::Game> = schema::games::table
                .filter((schema::games::id_a.eq(id).and(schema::games::char_a.eq(char_id as i16)))
                    .or(schema::games::id_b.eq(id).and(schema::games::char_b.eq(char_id as i16))))
                .order(schema::games::timestamp.desc())
                .limit(game_count)
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
                let expected_outcome = "???";
                let rating_change = "0";
                let rating_change_class = "neutral";
                let rating_change_sequence = "0";
                let result_wins = if game.id_a == id && game.winner == 1 || game.id_b == id && game.winner == 2 { 1 } else { 0 };
                let result_losses = 0;
                let result_percent = 0.0;
                let timestamp = game.timestamp.to_string();
                let floor = game.game_floor.to_string();

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
                    expected_outcome: expected_outcome.to_string(),
                    rating_change: rating_change.to_string(),
                    rating_change_class,
                    rating_change_sequence: rating_change_sequence.to_string(),
                    result_wins,
                    result_losses,
                    result_percent,
                });
            }
            Json(response)
                
        } else {
            Json(PlayerGamesResponse {
                history: vec![],
            })
        }
}

pub async fn run() {
    let routes = routes![
        player,
        player_char,
        player_games,
        top_all,
        top_char
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

#[rocket::main]
async fn main() {
    dotenv().expect("dotenv failed");
    
    CombinedLogger::init(
        vec![
            TermLogger::new(LevelFilter::Info, Config::default(), TerminalMode::Mixed, ColorChoice::Auto),
            WriteLogger::new(LevelFilter::Info, Config::default(), File::create("output.log").unwrap()),
        ]
    ).unwrap();

    let args = std::env::args().skip(1).collect::<Vec<_>>();
    match args.get(0).map(|r| r.deref()) {
        //This runs the timed jobs: grab replay, update ratings, update ranking, etc.
        Some("pull") => {
            pull::pull_and_update_continuous().await;
        },
        //This migrates a halvnykterist sqlite3 database to a postgres database.
        Some("migrate") => {
            let mut count = 100000;
            if args.len() > 1 {
                count = args.get(2).unwrap().parse().unwrap();
            }
            migrate::migrate(args.get(1).unwrap(), count);
        },
        //This skips checking last_rank_update, but it does set it.
        Some("hourly") => {
            pull::do_hourly_update_once().await
        },
        _ => {
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
