use std::collections::{HashMap, HashSet};

use serde::Serialize;

use crate::{
    models::{CharacterRank, GlobalRank, Player, PlayerRating},
    CHAR_NAMES,
};

use super::common::TagResponse;

#[derive(Serialize)]
pub struct RankResponse {
    ranks: Vec<PlayerRankResponse>,
}

#[derive(Serialize)]
struct PlayerRankResponse {
    rank: i32,
    id: i64,
    name: String,
    rating: i64,
    char_short: String,
    char_long: String,
    tags: Vec<TagResponse>,
    is_global_top_100: bool,
}

pub async fn get_top(
    data: Vec<(GlobalRank, Player, PlayerRating)>,
    tags: HashMap<i64, Vec<(String, String)>>,
) -> Result<RankResponse, String> {
    let ranks = data
        .iter()
        .map(|p| PlayerRankResponse {
            rank: p.0.rank,
            id: p.1.id,
            name: p.1.name.clone(),
            rating: p.2.value,
            char_short: CHAR_NAMES[p.0.char_id as usize].0.to_string(),
            char_long: CHAR_NAMES[p.0.char_id as usize].1.to_string(),
            tags: tags
                .get(&p.1.id)
                .unwrap_or(&vec![])
                .iter()
                .map(|(tag, style)| TagResponse {
                    tag: tag.clone(),
                    style: style.clone(),
                })
                .collect(),
            is_global_top_100: p.0.rank <= 100,
        })
        .collect();

    Ok(RankResponse { ranks })
}

pub async fn get_top_char(
    data: Vec<(CharacterRank, Player, PlayerRating)>,
    tags: HashMap<i64, Vec<(String, String)>>,
    global_top100_ids: HashSet<(i64, i16)>,
) -> Result<RankResponse, String> {
    let ranks = data
        .iter()
        .map(|p| PlayerRankResponse {
            rank: p.0.rank,
            id: p.1.id,
            name: p.1.name.clone(),
            rating: p.2.value,
            char_short: CHAR_NAMES[p.0.char_id as usize].0.to_string(),
            char_long: CHAR_NAMES[p.0.char_id as usize].1.to_string(),
            tags: tags
                .get(&p.1.id)
                .unwrap_or(&vec![])
                .iter()
                .map(|(tag, style)| TagResponse {
                    tag: tag.clone(),
                    style: style.clone(),
                })
                .collect(),
            is_global_top_100: global_top100_ids.contains(&(p.1.id, p.0.char_id)),
        })
        .collect();

    Ok(RankResponse { ranks })
}
