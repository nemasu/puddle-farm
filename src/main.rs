extern crate simplelog;

use log::LevelFilter;
use models::{CharacterRank, GlobalRank, Player, PlayerRating};
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
}

#[derive(Serialize)]
struct PlayerResponsePlayer  {
    rating: f32,
    deviation: f32,
    char_short: String,
    character: String,
}
#[get("/api/player/<player_id>")]
async fn player(mut db: Connection<Db>, player_id: &str) -> Json<PlayerResponse> {
    
    let id = match i64::from_str_radix(player_id, 10) {
        Ok(id) => id,
        Err(_) => {
            return Json(PlayerResponse {ratings: vec![], id: 0, name: "".to_string()});
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
        return Json(PlayerResponse {ratings: vec![], id: 0, name: "".to_string()});
    }

    let ratings: Vec<PlayerResponsePlayer> = player_char.iter().map(|p| {
        PlayerResponsePlayer {
            rating: p.1.value,
            deviation: p.1.deviation,
            char_short: CHAR_NAMES[ p.1.char_id as usize].0.to_string(),
            character: CHAR_NAMES[ p.1.char_id as usize].1.to_string(),
        }
    }).collect();

    Json(PlayerResponse {
        id: player_char[0].0.id,
        name: player_char[0].0.name.clone(),
        ratings,
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


pub async fn run() {
    let routes = routes![
        player,
        player_games,
        top_all,
        top_char,
        characters,
        player_search,
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
