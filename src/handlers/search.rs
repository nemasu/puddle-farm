use serde::{Deserialize, Serialize};

use crate::{
    models::{Player, PlayerRating},
    CHAR_NAMES,
};

#[derive(Serialize)]
pub struct SearchResponse {
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
pub struct SearchParams {
    pub search_string: String,
    pub exact: Option<bool>,
}

pub async fn player_search(data: Vec<(Player, PlayerRating)>) -> Result<SearchResponse, String> {
    let results = data
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

    Ok(SearchResponse { results })
}
