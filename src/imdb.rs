use std::collections::HashMap;

use bb8_redis::redis;
use chrono::NaiveDateTime;

use crate::{DistributionEntry, CHAR_NAMES};

async fn get_string(key: &str, redis: &mut crate::RedisConnection<'_>) -> Result<String, String> {
    match redis::cmd("GET").arg(key).query_async(&mut **redis).await {
        Ok(v) => Ok(v),
        Err(_) => Err(format!("Key {} not found", key)),
    }
}

async fn get_int(key: &str, redis: &mut crate::RedisConnection<'_>) -> Result<i64, String> {
    match redis::cmd("GET").arg(key).query_async(&mut **redis).await {
        Ok(v) => Ok(v),
        Err(_) => Err(format!("Key {} not found", key)),
    }
}

pub struct Stats {
    pub timestamp: String,
    pub total_games: i64,
    pub one_month_games: i64,
    pub one_week_games: i64,
    pub one_day_games: i64,
    pub one_hour_games: i64,
    pub total_players: i64,
    pub one_month_players: i64,
    pub one_week_players: i64,
    pub one_day_players: i64,
    pub one_hour_players: i64,
}
pub async fn get_stats(redis: &mut crate::RedisConnection<'_>) -> Result<Stats, String> {
    let timestamp = match get_string("last_update_hourly", redis).await {
        Ok(ts) => ts,
        Err(_) => {
            return Err("Stats (last_update_hourly) not found".to_string());
        }
    };

    let total_games = get_int("total_games", redis).await?;
    let one_month_games = get_int("one_month_games", redis).await?;
    let one_week_games = get_int("one_week_games", redis).await?;
    let one_day_games = get_int("one_day_games", redis).await?;
    let one_hour_games = get_int("one_hour_games", redis).await?;
    let total_players = get_int("total_players", redis).await?;
    let one_month_players = get_int("one_month_players", redis).await?;
    let one_week_players = get_int("one_week_players", redis).await?;
    let one_day_players = get_int("one_day_players", redis).await?;
    let one_hour_players = get_int("one_hour_players", redis).await?;

    Ok(Stats {
        timestamp,
        total_games,
        one_month_games,
        one_week_games,
        one_day_games,
        one_hour_games,
        total_players,
        one_month_players,
        one_week_players,
        one_day_players,
        one_hour_players,
    })
}

pub struct Popularity {
    pub per_player: Vec<(String, i64)>,
    pub per_character: Vec<(String, i64)>,
    pub per_player_total: i64,
    pub per_character_total: i64,
    pub last_update: String,
}
pub async fn get_popularity(redis: &mut crate::RedisConnection<'_>) -> Result<Popularity, String> {
    let mut per_player: Vec<(String, i64)> = vec![];

    for e in CHAR_NAMES.iter() {
        let key = format!("popularity_per_player_{}", e.0);

        let value: i64 = match get_int(&key, redis).await {
            Ok(v) => v,
            Err(_) => {
                return Err("Popularity not found".to_string());
            }
        };

        per_player.push((e.1.to_string(), value));
    }

    let mut per_character: Vec<(String, i64)> = vec![];

    for e in CHAR_NAMES.iter() {
        let key = format!("popularity_per_character_{}", e.0);
        let value: i64 = get_int(&key, redis).await?;
        per_character.push((e.1.to_string(), value));
    }

    let per_player_total = get_int("popularity_per_player_total", redis).await?;
    let per_character_total = get_int("one_month_games", redis).await?;
    let last_update = get_string("last_update_daily", redis).await?;

    Ok(Popularity {
        per_player,
        per_character,
        per_player_total,
        per_character_total,
        last_update,
    })
}

pub struct MatchupChar {
    pub char_name: String,
    pub char_short: String,
    pub matchups: Vec<MatchupEntry>, //Wins, Total Games
}

pub struct MatchupEntry {
    pub char_name: String,
    pub char_short: String,
    pub wins: i64,
    pub total_games: i64,
}

async fn get_matchup(
    prefix: &str,
    redis: &mut crate::RedisConnection<'_>,
) -> Result<Vec<MatchupChar>, String> {
    let mut matchups = vec![];

    for c in 0..CHAR_NAMES.len() {
        let key = format!("{}_{}", prefix, c);

        let value: String = match get_string(&key, redis).await {
            Ok(v) => v,
            Err(_) => {
                return Err("Matchup not found".to_string());
            }
        };

        let matchups_data: Vec<crate::pull::Matchup> = serde_json::from_str(&value).unwrap();
        let char_name = CHAR_NAMES[c].1.to_string();
        let char_short = CHAR_NAMES[c].0.to_string();

        let matchup = MatchupChar {
            char_name,
            char_short,
            matchups: matchups_data
                .iter()
                .enumerate()
                .map(|(i, m)| MatchupEntry {
                    char_name: CHAR_NAMES[i].1.to_string(),
                    char_short: CHAR_NAMES[i].0.to_string(),
                    wins: m.wins,
                    total_games: m.total_games,
                })
                .collect(),
        };
        matchups.push(matchup);
    }
    Ok(matchups)
}

pub struct Matchups {
    pub last_update: String,
    pub matchups: HashMap<String, Vec<MatchupChar>>,
}
pub async fn get_matchups(redis: &mut crate::RedisConnection<'_>) -> Result<Matchups, String> {
    let prefixes = vec!["matchup", "matchup_1700"];
    let mut matchups: HashMap<String, Vec<MatchupChar>> = HashMap::new();

    for prefix in prefixes {
        let matchup_char = get_matchup(prefix, redis).await?;
        matchups.insert(prefix.to_string(), matchup_char);
    }

    let last_update = get_string("last_update_daily", redis).await?;

    Ok(Matchups {
        last_update,
        matchups,
    })
}

pub async fn get_distribution(
    redis: &mut crate::RedisConnection<'_>,
) -> Result<(String, DistributionEntry), String> {
    let distribution_floor = match get_string("distribution_floor", redis).await {
        Ok(df) => df,
        Err(_) => {
            return Err("Distribution not found".to_string());
        }
    };

    let distribution_rating = get_string("distribution_rating", redis).await?;

    //Deserialize distribution_floor
    let distribution_floor: Vec<Vec<i64>> = serde_json::from_str(&distribution_floor).unwrap();

    //Deserialize distribution_rating
    let distribution_rating: Vec<crate::pull::DistributionResult> =
        serde_json::from_str(&distribution_rating).unwrap();

    //Get one_month_players
    let one_month_players = get_int("one_month_players", redis).await?;

    let timestamp = get_string("last_update_daily", redis).await?;

    Ok((
        timestamp,
        DistributionEntry {
            distribution_floor,
            distribution_rating,
            one_month_players,
        },
    ))
}

pub async fn get_latest_game_time(
    redis: &mut crate::RedisConnection<'_>,
) -> Result<NaiveDateTime, String> {
    let latest_game_time = match get_string("latest_game_time", redis).await {
        Ok(lgt) => lgt,
        Err(_) => {
            return Err("Failed to get latest_game_time".to_string());
        }
    };

    let latest_game_time =
        NaiveDateTime::parse_from_str(&latest_game_time, "%Y-%m-%d %H:%M:%S").unwrap();

    Ok(latest_game_time)
}

pub async fn set_latest_game_time(
    timestamp: NaiveDateTime,
    redis: &mut crate::RedisConnection<'_>,
) -> Result<(), String> {
    match redis::cmd("SET")
        .arg("latest_game_time")
        .arg(timestamp.to_string())
        .arg("EX")
        .arg("30")
        .query_async::<String>(&mut **redis)
        .await
    {
        Ok(_) => Ok(()),
        Err(_) => Err("Failed to set latest_game_time".to_string()),
    }
}

pub async fn clear_latest_game_time(redis: &mut crate::RedisConnection<'_>) -> Result<(), String> {
    match redis::cmd("DEL")
        .arg("latest_game_time")
        .query_async::<i64>(&mut **redis)
        .await
    {
        Ok(_) => Ok(()),
        Err(_) => Err("Failed to clear latest_game_time".to_string()),
    }
}

pub async fn get_last_update_daily(
    redis: &mut crate::RedisConnection<'_>,
) -> Result<NaiveDateTime, String> {
    let last_update_daily = match get_string("last_update_daily", redis).await {
        Ok(lud) => lud,
        Err(_) => {
            return Err("Failed to get last_update_daily".to_string());
        }
    };

    let last_update_daily =
        NaiveDateTime::parse_from_str(&last_update_daily, "%Y-%m-%d %H:%M:%S").unwrap();

    Ok(last_update_daily)
}

pub async fn get_avatar(id: i64, redis: &mut crate::RedisConnection<'_>) -> Result<String, String> {
    let key = format!("avatar_{}", id);

    match get_string(&key, redis).await {
        Ok(avatar) => Ok(avatar),
        Err(_) => Err("Failed to get avatar".to_string()),
    }
}

pub async fn set_avatar(
    id: i64,
    avatar: &str,
    redis: &mut crate::RedisConnection<'_>,
) -> Result<(), String> {
    let key = format!("avatar_{}", id);

    match redis::cmd("SET")
        .arg(&key)
        .arg(avatar)
        .arg("EX")
        .arg("86400")
        .query_async::<String>(&mut **redis)
        .await
    {
        Ok(_) => Ok(()),
        Err(_) => Err("Failed to set avatar".to_string()),
    }
}
