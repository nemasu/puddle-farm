use serde_derive::{Deserialize, Serialize};
use tracing::{info, error};
use std::sync::Arc;
use steamworks::{Client, TicketForWebApiResponse};
use tokio::sync::Mutex;
use lazy_static::lazy_static;

lazy_static! {
    static ref STEAM_ID: String = dotenv::var("STEAM_ID").expect("STEAM_ID must be set.");
    static ref STEAM_HEX: String = dotenv::var("STEAM_HEX").expect("STEAM_HEX must be set.");
    static ref VERSION: String = dotenv::var("API_VERSION").expect("API_VERSION must be set.");
    static ref PLAYER_ID: String = dotenv::var("PLAYER_ID").expect("PLAYER_ID must be set.");
    pub static ref STEAM_TOKEN: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(Option::None));
}

const STEAM_APP_ID: u32 = 1384160;

#[derive(Debug, Serialize, Deserialize)]
pub struct Request<T> {
    header: RequestHeader,
    body: T,
}

#[derive(Debug, Serialize, Deserialize)]
struct RequestHeader {
    player_id: String,
    token: String,
    int1: i64,
    version: String,
    platform: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReplayRequest {
    int1: i64,
    index: usize,
    replays_per_page: usize,
    query: ReplayQuery,
    platforms: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct ReplayQuery {
    int1: i64,
    int2: i64,
    min_rank: i64,
    max_rank: i64,
    min_floor: i64,
    max_floor: i64,
    seq1: Vec<()>,
    char_1: i64,
    char_2: i64,
    winner: i64,
    int5: i64,
    int6: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlayerStatsRequest {
    player_id: String,
    int1: i64,
    int2: i64,
    int3: i64,
    int4: i64,
    int5: i64,
}

pub fn generate_player_stats_request(player_id: String) -> Request<PlayerStatsRequest> {
    Request {
        header: RequestHeader {
            player_id: PLAYER_ID.to_owned(),
            token: std::fs::read_to_string("token.txt").unwrap(),
            int1: 2,
            version: VERSION.to_owned(),
            platform: 3, //PC
        },
        body: PlayerStatsRequest {
            player_id: player_id,
            int1: 7,
            int2: -1,
            int3: 1,
            int4: -1,
            int5: -1,
        },
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlayerAvatarRequest {
    player_id: String,
    int1: i64,
}

pub fn generate_player_avatar_request(player_id: String) -> Request<PlayerAvatarRequest> {
    Request {
        header: RequestHeader {
            player_id: PLAYER_ID.to_owned(),
            token: std::fs::read_to_string("token.txt").unwrap(),
            int1: 2,
            version: VERSION.to_owned(),
            platform: 3, //PC
        },
        body: PlayerAvatarRequest {
            player_id: player_id,
            int1: 1,
        },
    }
}

pub fn generate_replay_request(
    index: usize,
    replays_per_page: usize,
    token: &str,
) -> Request<ReplayRequest> {
    Request {
        header: RequestHeader {
            player_id: PLAYER_ID.to_owned(),
            token: token.to_owned(),
            int1: 2,
            version: VERSION.to_owned(),
            platform: 3, //PC
        },
        //Matches request when filtering on Ranked Match, for all ranks (min_rank -> max_rank)
        body: ReplayRequest {
            int1: 1,
            index,
            replays_per_page,
            query: ReplayQuery {
                int1: -1,
                int2: 0,
                min_rank: 0, // No Rank
                max_rank: 22, // Currently 22 for Vanquisher 3 Vindex
                min_floor: 0,
                max_floor: 99,
                seq1: vec![],
                char_1: -1,
                char_2: -1,
                winner: 0,
                int5: 0,
                int6: 7, // Ranked Matches Only (I think)
            },
            platforms: 6, //All
        },
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    int1: i64,
    steam_id: String,
    steam_hex: String,
    int2: i64,
    steam_token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RankMatchLegendRequest {
    int1: i64,
    int2: i64,
    platforms: i64,
}

pub fn generate_rank_match_legend_request(token: &str) -> Request<RankMatchLegendRequest> {
    Request {
        header: RequestHeader {
            player_id: PLAYER_ID.to_owned(),
            token: token.to_owned(),
            int1: 2,
            version: VERSION.to_owned(),
            platform: 3,
        },
        body: RankMatchLegendRequest {
            int1: 0,
            int2: 0,
            platforms: 6,
        },
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RankMatchMrRequest {
    page: i64,
    int1: i64,
    int2: i64,
    char_id: i64,
    platforms: i64,
    int3: i64,
}

pub fn generate_rank_match_mr_request(
    token: &str,
    page: i64,
    char_id: i64,
) -> Request<RankMatchMrRequest> {
    Request {
        header: RequestHeader {
            player_id: PLAYER_ID.to_owned(),
            token: token.to_owned(),
            int1: 2,
            version: VERSION.to_owned(),
            platform: 3,
        },
        body: RankMatchMrRequest {
            page,
            int1: 0,
            int2: 0,
            char_id,
            platforms: 6,
            int3: 0,
        },
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RankMatchLpRequest {
    page: i64,
    int1: i64,
    char_id: i64,
    platforms: i64,
    int2: i64,
}

pub fn generate_rank_match_lp_request(
    token: &str,
    page: i64,
    char_id: i64,
) -> Request<RankMatchLpRequest> {
    Request {
        header: RequestHeader {
            player_id: PLAYER_ID.to_owned(),
            token: token.to_owned(),
            int1: 2,
            version: VERSION.to_owned(),
            platform: 3,
        },
        body: RankMatchLpRequest {
            page,
            int1: 0,
            char_id,
            platforms: 6,
            int2: 0,
        },
    }
}

pub async fn generate_login_request() -> Request<LoginRequest> {
    let client = Client::init_app(STEAM_APP_ID).unwrap();
    let user = client.user();

    let token = STEAM_TOKEN.clone();
    if !token.clone().try_lock().unwrap().is_some() {
        let _cb = client.register_callback(move |v: TicketForWebApiResponse| {
            //println!("Got webapi auth response: {:?}", v)
            let hex: String = v
                .ticket
                .iter()
                .map(|b| format!("{:02X}", b).to_string())
                .collect::<Vec<String>>()
                .join("");
            info!("Login steam token for strive {}", hex);
            *token.try_lock().unwrap() = Some(hex);
        });
    } else {
        info!("Already have steam token.");
    };

    user.authentication_session_ticket_for_webapi("ggst-game.guiltygear.com");

    for _ in 0..50 {
        client.run_callbacks();
        std::thread::sleep(::std::time::Duration::from_millis(100));

        let steam_token = STEAM_TOKEN.try_lock().unwrap();

        if steam_token.is_some() {
            let steam_token = steam_token.clone().unwrap();
            return Request {
                header: RequestHeader {
                    player_id: "".to_owned(),
                    token: "".to_owned(),
                    int1: 2,
                    version: VERSION.to_owned(),
                    platform: 3,
                },
                body: LoginRequest {
                    int1: 1,
                    steam_id: STEAM_ID.to_owned(),
                    steam_hex: STEAM_HEX.to_owned(),
                    int2: 256,
                    steam_token,
                },
            };
        }
    }

    error!("Timed out waiting for steam token");
    panic!();
}
