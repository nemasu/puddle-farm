use serde_derive::{Deserialize, Serialize};

#[derive(Deserialize, Debug)]
pub struct Response<T> {
    pub header: ResponseHeader,
    pub body: T,
}

#[derive(Deserialize, Debug)]
pub struct ResponseHeader {
    pub token: String,
    _int1: i64,
    _date: String,
    _version1: String,
    _version2: String,
    _version3: String,
    _string1: String,
    _string2: String,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
pub struct Login {
    _int1: i64,
    pub data: InnerLogin,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
pub struct InnerLogin {
    _string1: String,
    pub name: String,
    _steam_id: String,
    _strive_id: String,
    _platform: i64,
}

#[derive(Deserialize, Debug)]
pub struct Replays {
    _int1: i64,
    _int2: i64,
    _int3: i64,
    pub replays: Vec<Replay>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct Replay {
    _int1: u64,
    _int2: i64,
    pub floor: i64,
    pub player1_character: i64,
    pub player2_character: i64,
    pub player1: Player,
    pub player2: Player,
    pub winner: i64,
    pub timestamp: String,
    _int7: i64,
    _views: u64,
    _int8: i64,
    _likes: u64,
}

#[derive(Deserialize, Debug, Clone)]
pub struct Player {
    pub id: String,
    pub name: String,
    _string1: String,
    _string2: String,
    pub platform: i64,
    _int1: i64,
    pub rating: i64,
    _int2: i64,
}

#[derive(Deserialize, Debug, Clone)]
pub struct PlayerStats {
    _int1: i64,
    pub json: String,
    _int2: i64,
    _extra: Vec<(i64, i64)>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct PlayerAvatar {
    _int1: i64,
    pub png: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct LegendPlayer {
    pub rank: i64,
    pub dr: i64,
    pub char_id: i64,
    pub player_id: String,
    pub player_name: String,
    _str1: String,
    _str2: String,
    _int1: i64,
}

#[derive(Deserialize, Debug, Clone)]
pub struct RankMatchLegend {
    _int1: i64,
    _int2: i64,
    pub players: Vec<LegendPlayer>,
    pub from_date: String,
    pub to_date: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct MrPlayer {
    pub rank: i64,
    pub dr: i64,
    pub char_id: i64,
    pub player_id: String,
    pub player_name: String,
    _str1: String,
    _str2: String,
    _int1: i64,
    _int2: i64,
}

#[derive(Deserialize, Debug, Clone)]
pub struct RankMatchMr {
    _int1: i64,
    _int2: i64,
    _int3: i64,
    _int4: i64,
    pub players: Vec<MrPlayer>,
    _int5: f64,
    pub from_date: String,
    pub to_date: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct LpPlayer {
    pub rank: i64,
    _int1: i64,
    pub lp: i64,
    pub char_id: i64,
    pub player_id: String,
    pub player_name: String,
    _str1: String,
    _str2: String,
    _int2: i64,
    _int3: i64,
}

#[derive(Deserialize, Debug, Clone)]
pub struct RankMatchLp {
    _int1: i64,
    _int2: i64,
    _int3: i64,
    _int4: i64,
    pub players: Vec<LpPlayer>,
    _int5: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LeaderboardEntry {
    pub rank: i64,
    pub player_id: String,
    pub player_name: String,
    pub char_id: i64,
    pub rating: i64,
}

impl From<LegendPlayer> for LeaderboardEntry {
    fn from(p: LegendPlayer) -> Self {
        LeaderboardEntry {
            rank: p.rank,
            player_id: p.player_id,
            player_name: p.player_name,
            char_id: p.char_id,
            rating: p.dr + 10_000_000,
        }
    }
}

impl From<MrPlayer> for LeaderboardEntry {
    fn from(p: MrPlayer) -> Self {
        LeaderboardEntry {
            rank: p.rank,
            player_id: p.player_id,
            player_name: p.player_name,
            char_id: p.char_id,
            rating: p.dr + 10_000_000,
        }
    }
}

impl From<LpPlayer> for LeaderboardEntry {
    fn from(p: LpPlayer) -> Self {
        LeaderboardEntry {
            rank: p.rank,
            player_id: p.player_id,
            player_name: p.player_name,
            char_id: p.char_id,
            rating: p.lp,
        }
    }
}
