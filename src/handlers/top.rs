use serde::{Serialize, Serializer};

fn serialize_i64_as_string<S: Serializer>(v: &i64, s: S) -> Result<S::Ok, S::Error> {
    s.serialize_str(&v.to_string())
}

#[derive(Serialize)]
pub struct RankResponse {
    pub ranks: Vec<PlayerRankResponse>,
    pub last_update: Option<String>,
}

#[derive(Serialize)]
pub struct TagResponse {
    pub tag: String,
    pub style: String,
}

#[derive(Serialize)]
pub struct PlayerRankResponse {
    pub rank: i64,
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub id: i64,
    pub name: String,
    pub rating: i64,
    pub char_short: String,
    pub char_long: String,
    pub is_legend: bool,
    pub tags: Vec<TagResponse>,
}
