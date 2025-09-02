use serde_json::Value;
use crate::{CHAR_NAMES, db};

pub async fn parse_player_stats_and_update_ratings(
    player_id: i64,
    json_data: &str,
    db: &mut crate::Connection<'_>,
) -> Result<Vec<(i16, i64)>, String> {
    let parsed: Value = match serde_json::from_str(json_data) {
        Ok(parsed) => parsed,
        Err(e) => return Err(format!("Failed to parse JSON: {}", e)),
    };

    let mut updated_ratings = Vec::new();

    for (char_index, (char_code, _char_name)) in CHAR_NAMES.iter().enumerate() {
        let json_char_code = get_json_char_code(char_code);
        let master_rating_key = format!("{}_MasterRatingPt", json_char_code);
        let rank_match_rating_key = format!("{}_RankMatchRatingPt", json_char_code);
        
        let rating = if let Some(master_rating_value) = parsed.get(&master_rating_key) {
            if let Some(master_rating) = master_rating_value.as_i64() {
                if master_rating > 0 {
                    Some(master_rating + 10000000)
                } else {
                    // Check RankMatchRatingPt if MasterRatingPt is 0
                    parsed.get(&rank_match_rating_key)
                        .and_then(|v| v.as_i64())
                        .filter(|&r| r > 0)
                }
            } else {
                // Check RankMatchRatingPt if MasterRatingPt is not a valid number
                parsed.get(&rank_match_rating_key)
                    .and_then(|v| v.as_i64())
                    .filter(|&r| r > 0)
            }
        } else {
            // Check RankMatchRatingPt if MasterRatingPt doesn't exist
            parsed.get(&rank_match_rating_key)
                .and_then(|v| v.as_i64())
                .filter(|&r| r > 0)
        };
        
        if let Some(rating_value) = rating {
            let char_id = char_index as i16;
            match db::set_player_rating(player_id, char_id, rating_value, db).await {
                Ok(()) => {
                    updated_ratings.push((char_id, rating_value));
                },
                Err(e) => return Err(format!("Failed to update rating for character {}: {}", char_code, e)),
            }
        }
    }

    Ok(updated_ratings)
}

fn get_json_char_code(char_code: &str) -> String {
    match char_code {
        "SO" => "SOL".to_string(),
        "KY" => "KYK".to_string(),
        "MA" => "MAY".to_string(),
        "AX" => "AXL".to_string(),
        "CH" => "CHP".to_string(),
        "PO" => "POT".to_string(),
        "FA" => "FAU".to_string(),
        "MI" => "MLL".to_string(),
        "ZA" => "ZAT".to_string(),
        "RA" => "RAM".to_string(),
        "LE" => "LEO".to_string(),
        "NA" => "NAG".to_string(),
        "GI" => "GIO".to_string(),
        "AN" => "ANJ".to_string(),
        "IN" => "INO".to_string(),
        "GO" => "GLD".to_string(),
        "JC" => "JKO".to_string(),
        "HA" => "COS".to_string(),
        "BA" => "BKN".to_string(),
        "TE" => "TST".to_string(),
        "BI" => "BGT".to_string(),
        "SI" => "SIN".to_string(),
        "BE" => "BED".to_string(),
        "AS" => "ASK".to_string(),
        "JN" => "JHN".to_string(),
        "EL" => "ELP".to_string(),
        "AB" => "ABA".to_string(),
        "SL" => "SLY".to_string(),
        "DI" => "DZY".to_string(),
        "VE" => "VEN".to_string(),
        "UN" => "UNI".to_string(),
        "LU" => "LUC".to_string(),
        _ => char_code.to_string(),
    }
}