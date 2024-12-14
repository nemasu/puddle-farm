use std::collections::HashMap;

use serde::Serialize;

use crate::{models, CHAR_NAMES};

use super::common::TagResponse;

#[derive(Serialize)]
pub struct PlayerGamesResponse {
    history: Vec<PlayerSet>,
    tags: HashMap<String, Vec<TagResponse>>, //player_id to tags
}

#[derive(Serialize)]
struct PlayerSet {
    timestamp: String,
    own_rating_value: f32,
    own_rating_deviation: f32,
    floor: String,
    opponent_name: String,
    opponent_platform: &'static str,
    opponent_id: i64,
    opponent_character: &'static str,
    opponent_character_short: &'static str,
    opponent_rating_value: f32,
    opponent_rating_deviation: f32,
    result_win: bool,
    odds: f32,
}

pub async fn handle_get_player_history(
    player_id: i64,
    games: Vec<models::Game>,
    player_tags: HashMap<i64, Vec<(String, String)>>,
) -> Result<PlayerGamesResponse, String> {
    let mut response: PlayerGamesResponse = PlayerGamesResponse {
        history: vec![],
        tags: HashMap::new(),
    };

    for game in games {
        let is_hidden = game.value_a == Some(0.0);

        let own_rating_value = if game.id_a == player_id {
            game.value_a.unwrap()
        } else {
            game.value_b.unwrap()
        };

        let own_rating_deviation = if game.id_a == player_id {
            game.deviation_a.unwrap()
        } else {
            game.deviation_b.unwrap()
        };

        let opponent_id = if is_hidden {
            0
        } else if game.id_a == player_id {
            game.id_b
        } else {
            game.id_a
        };

        let opponent_name = if is_hidden {
            "Hidden".to_string()
        } else if game.id_a == player_id {
            game.name_b.clone()
        } else {
            game.name_a.clone()
        };

        let opponent_platform = if game.id_a == player_id {
            game.platform_b
        } else {
            game.platform_a
        };

        let opponent_character = if game.id_a == player_id {
            CHAR_NAMES[game.char_b as usize].1
        } else {
            CHAR_NAMES[game.char_a as usize].1
        };

        let opponent_character_short = if game.id_a == player_id {
            CHAR_NAMES[game.char_b as usize].0
        } else {
            CHAR_NAMES[game.char_a as usize].0
        };

        let opponent_rating_value = if game.id_a == player_id {
            game.value_b.unwrap()
        } else {
            game.value_a.unwrap()
        };

        let opponent_rating_deviation = if game.id_a == player_id {
            game.deviation_b.unwrap()
        } else {
            game.deviation_a.unwrap()
        };

        let timestamp = match game.real_timestamp {
            Some(ts) => ts.to_string(),
            None => game.timestamp.to_string(),
        };

        let floor = game.game_floor.to_string();

        let result_win = if game.id_a == player_id && game.winner == 1
            || game.id_b == player_id && game.winner == 2
        {
            true
        } else {
            false
        };

        let odds = if is_hidden {
            0.0
        } else if game.id_a == player_id {
            game.win_chance.unwrap_or(0.0)
        } else {
            1.0 - game.win_chance.unwrap_or(0.0)
        };

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
            opponent_id: opponent_id,
            opponent_character,
            opponent_character_short,
            opponent_rating_value: opponent_rating_value,
            opponent_rating_deviation: opponent_rating_deviation,
            result_win,
            odds,
        });

        if opponent_id != 0 && player_tags.contains_key(&opponent_id) {
            let tags: Vec<TagResponse> = player_tags
                .get(&opponent_id)
                .unwrap()
                .iter()
                .filter_map(|(tag, style)| {
                    if !style.is_empty() {
                        Some(TagResponse {
                            tag: tag.clone(),
                            style: style.clone(),
                        })
                    } else {
                        None
                    }
                })
                .collect();

            if tags.len() > 0 {
                response.tags.insert(opponent_id.to_string(), tags);
            }
        }
    }
    Ok(response)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono;

    #[tokio::test]
    async fn get_player_history_platform_pc() {

      let player_id = 1;
      let (mut games, player_tags) = get_test_player_history_data();
      games[0].platform_b = 3;

      let response = handle_get_player_history(player_id, games, player_tags)
      .await
      .unwrap();

      assert_eq!(response.history[0].opponent_platform, "PC");
    }

    #[tokio::test]
    async fn get_player_history_platform_xb() {

      let player_id = 1;
      let (mut games, player_tags) = get_test_player_history_data();
      games[0].platform_b = 2;

      let response = handle_get_player_history(player_id, games, player_tags)
      .await
      .unwrap();

      assert_eq!(response.history[0].opponent_platform, "XB");
    }

    #[tokio::test]
    async fn get_player_history_platform_ps() {

      let player_id = 1;
      let (mut games, player_tags) = get_test_player_history_data();
      games[0].platform_b = 1;

      let response = handle_get_player_history(player_id, games, player_tags)
      .await
      .unwrap();

      assert_eq!(response.history[0].opponent_platform, "PS");
    }

    #[tokio::test]
    async fn get_player_history_win_rate_a() {

      let player_id = 1;
      let (games, player_tags) = get_test_player_history_data();

      let response = handle_get_player_history(player_id, games, player_tags)
      .await
      .unwrap();

      assert_eq!(response.history[0].odds, 0.3);
      assert_eq!(response.history[0].result_win, true);
    }

    #[tokio::test]
    async fn get_player_history_win_rate_b() {

      let player_id = 2;
      let (games, player_tags) = get_test_player_history_data();

      let response = handle_get_player_history(player_id, games, player_tags)
      .await
      .unwrap();

      assert_eq!(response.history[0].odds, 0.7);
      assert_eq!(response.history[0].result_win, false);
    }

    #[tokio::test]
    async fn get_player_history_winner_b() {

      let player_id = 2;
      let (games, player_tags) = get_test_player_history_data();

      let response = handle_get_player_history(player_id, games, player_tags)
      .await
      .unwrap();

      assert_eq!(response.history[1].result_win, true);
    }

    #[tokio::test]
    async fn get_player_history_hidden() {

      let player_id = 1;
      let (mut games, player_tags) = get_test_player_history_data();
      games[0].value_a = Some(0.0);

      let response = handle_get_player_history(player_id, games, player_tags)
      .await
      .unwrap();

      assert_eq!(response.history[0].opponent_name, "Hidden");
      assert_eq!(response.history[0].opponent_id, 0);
    }

    fn get_test_player_history_data()
    -> (Vec<models::Game>, HashMap<i64, Vec<(String,String)>>) {
      let games = vec![
        models::Game {
          id_a: 1,
          id_b: 2,
          name_a: "Test".to_string(),
          name_b: "Test2".to_string(),
          platform_a: 1,
          platform_b: 1,
          char_a: 0,
          char_b: 0,
          value_a: Some(1000.0),
          value_b: Some(2000.0),
          deviation_a: Some(60.0),
          deviation_b: Some(40.0),
          timestamp: chrono::DateTime::from_timestamp(0, 0).unwrap().naive_utc(),
          real_timestamp: None,
          game_floor: 1,
          winner: 1,
          win_chance: Some(0.3),
        },
        models::Game {
          id_a: 1,
          id_b: 2,
          name_a: "Test".to_string(),
          name_b: "Test2".to_string(),
          platform_a: 1,
          platform_b: 1,
          char_a: 0,
          char_b: 0,
          value_a: Some(1500.0),
          value_b: Some(2000.0),
          deviation_a: Some(5.0),
          deviation_b: Some(10.0),
          timestamp: chrono::DateTime::from_timestamp(0, 0).unwrap().naive_utc(),
          real_timestamp: None,
          game_floor: 1,
          winner: 2,
          win_chance: Some(0.7),
        },
      ];

      let player_tags = HashMap::new();

      (
        games,
        player_tags
      )
    }
}
