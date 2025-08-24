use std::collections::HashMap;

use serde::Serialize;

use crate::{models::{Player, PlayerRating}, CHAR_NAMES};

use super::common::TagResponse;

#[derive(Serialize)]
pub struct PlayerResponse {
    id: i64,
    name: String,
    ratings: Vec<PlayerResponsePlayer>,
    platform: String,
    top_global: i32,
    tags: Vec<TagResponse>,
}

#[derive(Serialize)]
struct PlayerResponsePlayer {
    rating: i64,
    char_short: String,
    character: String,
    match_count: i32,
    top_char: i32,
    top_defeated: TopDefeated,
    top_rating: TopRating,
}

#[derive(Serialize, Clone)]
pub struct TopDefeated {
    pub timestamp: String,
    pub id: i64,
    pub name: String,
    pub char_short: String,
    pub value: i64,
}

#[derive(Serialize, Clone)]
pub struct TopRating {
    pub timestamp: String,
    pub value: i64,
}

pub async fn handle_get_player(
    player_char: Vec<(Player, PlayerRating)>,
    match_counts: HashMap<i16, i32>,
    top_chars: HashMap<i16, i32>,
    top_defeated: HashMap<i16, TopDefeated>,
    top_rating: HashMap<i16, TopRating>,
    top_global: i32,
    tags: Vec<(String, String)>,
) -> Result<PlayerResponse, String> {
    let ratings: Vec<PlayerResponsePlayer> = player_char
        .iter()
        .map(|p| PlayerResponsePlayer {
            rating: p.1.value,
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
                    value: 0,
                })
                .clone(),
            top_rating: top_rating
                .get(&p.1.char_id)
                .unwrap_or(&TopRating {
                    timestamp: "N/A".to_string(),
                    value: 0,
                })
                .clone(),
        })
        .collect();

    Ok(PlayerResponse {
        id: player_char[0].0.id,
        name: player_char[0].0.name.clone(),
        ratings,
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
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn get_player_empty_top_defeated() {
        let (player_char, match_counts, top_chars, _top_defeated, top_rating, top_global, tags) =
            get_test_player_data();

        let top_defeated = HashMap::new();

        let response = handle_get_player(
            player_char,
            match_counts,
            top_chars,
            top_defeated,
            top_rating,
            top_global,
            tags,
        )
        .await
        .unwrap();

        assert_eq!(response.ratings[0].top_defeated.name, "N/A");
        assert_eq!(response.ratings[0].top_defeated.id, 0);
    }

    #[tokio::test]
    async fn get_player_empty_top_rating() {
        let (player_char, match_counts, top_chars, top_defeated, _top_rating, top_global, tags) =
            get_test_player_data();

        let top_rating = HashMap::new();

        let response = handle_get_player(
            player_char,
            match_counts,
            top_chars,
            top_defeated,
            top_rating,
            top_global,
            tags,
        )
        .await
        .unwrap();

        assert_eq!(response.ratings[0].top_rating.timestamp, "N/A");
        assert_eq!(response.ratings[0].top_rating.value, 0);
    }

    #[tokio::test]
    async fn get_player_platform_ps() {
        let (mut player_char, match_counts, top_chars, top_defeated, top_rating, top_global, tags) =
            get_test_player_data();

        player_char[0].0.platform = 1;

        let response = handle_get_player(
            player_char,
            match_counts,
            top_chars,
            top_defeated,
            top_rating,
            top_global,
            tags,
        )
        .await
        .unwrap();

        assert_eq!(response.platform, "PS");
    }

    #[tokio::test]
    async fn get_player_platform_xb() {
        let (mut player_char, match_counts, top_chars, top_defeated, top_rating, top_global, tags) =
            get_test_player_data();

        player_char[0].0.platform = 2;

        let response = handle_get_player(
            player_char,
            match_counts,
            top_chars,
            top_defeated,
            top_rating,
            top_global,
            tags,
        )
        .await
        .unwrap();

        assert_eq!(response.platform, "XB");
    }

    #[tokio::test]
    async fn get_player_platform_pc() {
        let (mut player_char, match_counts, top_chars, top_defeated, top_rating, top_global, tags) =
            get_test_player_data();

        player_char[0].0.platform = 3;

        let response = handle_get_player(
            player_char,
            match_counts,
            top_chars,
            top_defeated,
            top_rating,
            top_global,
            tags,
        )
        .await
        .unwrap();

        assert_eq!(response.platform, "PC");
    }

    fn get_test_player_data() -> (
        Vec<(Player, PlayerRating)>,
        HashMap<i16, i32>,
        HashMap<i16, i32>,
        HashMap<i16, TopDefeated>,
        HashMap<i16, TopRating>,
        i32,
        Vec<(String, String)>,
    ) {
        let player_char = vec![(
            Player {
                id: 1,
                name: "Test".to_string(),
                platform: 1,
                api_key: None,
                rcode_check_code: None,
            },
            PlayerRating {
                char_id: 0,
                value: 1000,
                id: 1,
            },
        )];
        let mut match_counts = HashMap::new();
        match_counts.insert(0, 10);

        let mut top_chars = HashMap::new();
        top_chars.insert(0, 0);

        let top_defeated = HashMap::new();
        let top_rating = HashMap::new();
        let top_global = 0;
        let tags = vec![];

        (
            player_char,
            match_counts,
            top_chars,
            top_defeated,
            top_rating,
            top_global,
            tags,
        )
    }
}
