use std::collections::HashMap;

use serde::Serialize;

use crate::{
    models::{Player, PlayerRating, Status},
    CHAR_NAMES,
};

use super::common::TagResponse;

#[derive(Serialize)]
pub struct PlayerResponse {
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
pub struct TopDefeated {
    pub timestamp: String,
    pub id: i64,
    pub name: String,
    pub char_short: String,
    pub value: f32,
    pub deviation: f32,
}

#[derive(Serialize, Clone)]
pub struct TopRating {
    pub timestamp: String,
    pub value: f32,
    pub deviation: f32,
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
    let status = player_char[0].0.status.clone().unwrap().to_string();

    //If the player is not public, then return an appropriate response
    match player_char[0].0.status {
        Some(Status::Cheater) => {
            return Ok(PlayerResponse::cheater());
        }
        Some(Status::Private) => {
            return Ok(PlayerResponse::private());
        }
        _ => {}
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

    Ok(PlayerResponse {
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
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono;

    #[tokio::test]
    async fn get_player_hidden() {
        let (mut player_char, match_counts, top_chars, top_defeated, top_rating, top_global, tags) =
            get_test_player_data();

        player_char[0].0.status = Some(Status::Private);

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

        assert_eq!(response.name, "Hidden");
    }

    #[tokio::test]
    async fn get_player_cheater() {
        let (mut player_char, match_counts, top_chars, top_defeated, top_rating, top_global, tags) =
            get_test_player_data();

        player_char[0].0.status = Some(Status::Cheater);

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

        assert_eq!(response.name, "Cheater");
    }

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
        assert_eq!(response.ratings[0].top_rating.value, 0.0);
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
                status: Some(Status::Public),
                api_key: None,
                rcode_check_code: None,
            },
            PlayerRating {
                char_id: 0,
                value: 1000.0,
                deviation: 100.0,
                id: 1,
                wins: 1,
                losses: 2,
                last_decay: chrono::DateTime::from_timestamp(0, 0).unwrap().naive_utc(),
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
