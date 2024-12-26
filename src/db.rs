use std::collections::{HashMap, HashSet};

use crate::models::{self, CharacterRank, Player, PlayerRating};
use crate::models::{GlobalRank, Status};
use crate::pull::Matchup;
use crate::{schema, CHAR_NAMES};
use diesel::sql_types::{BigInt, Float, Integer, Nullable, Timestamp};
use diesel::{prelude::*, update};
use diesel_async::RunQueryDsl;

pub async fn get_player_status(id: i64, db: &mut crate::Connection<'_>) -> Result<Status, String> {
    match schema::players::table
        .select(schema::players::status)
        .filter(schema::players::id.eq(id))
        .first::<Option<Status>>(db)
        .await
    {
        Ok(status) => {
            if let Some(status) = status {
                Ok(status)
            } else {
                Err("Player not found".to_string())
            }
        }
        Err(_) => Err("Error getting player status".to_string()),
    }
}

async fn get_player_char_and_rating(
    id: i64,
    db: &mut crate::Connection<'_>,
) -> Result<Vec<(Player, PlayerRating)>, String> {
    let player_char: Vec<(Player, PlayerRating)> = schema::players::table
        .inner_join(schema::player_ratings::table)
        .filter(schema::players::id.eq(id))
        .select((Player::as_select(), PlayerRating::as_select()))
        .order((schema::player_ratings::value - schema::player_ratings::deviation).desc())
        .load(db)
        .await
        .expect("Error loading player");

    if player_char.len() == 0 {
        return Err("Player not found".to_string());
    }

    Ok(player_char.clone())
}

//TODO Use Redis for this?
async fn get_global_rank(id: i64, db: &mut crate::Connection<'_>) -> Result<i32, String> {
    match schema::global_ranks::table
        .filter(schema::global_ranks::id.eq(id))
        .select(schema::global_ranks::rank)
        .first::<i32>(db)
        .await
    {
        Ok(rank) => Ok(rank),
        Err(_) => Err("Rank not found".to_string()),
    }
}

async fn get_match_count(
    id: i64,
    char_id: i16,
    db: &mut crate::Connection<'_>,
) -> Result<i64, String> {
    match schema::games::table
        .filter(
            schema::games::id_a
                .eq(id)
                .and(schema::games::char_a.eq(char_id)),
        )
        .or_filter(
            schema::games::id_b
                .eq(id)
                .and(schema::games::char_b.eq(char_id)),
        )
        .count()
        .get_result::<i64>(db)
        .await
    {
        Ok(count) => Ok(count),
        Err(_) => Err("Match count not found".to_string()),
    }
}

//TODO Use Redis for this?
async fn get_top_char(
    id: i64,
    char_id: i16,
    db: &mut crate::Connection<'_>,
) -> Result<i32, String> {
    match schema::character_ranks::table
        .filter(schema::character_ranks::char_id.eq(char_id))
        .filter(schema::character_ranks::id.eq(id))
        .select(schema::character_ranks::rank)
        .first::<i32>(db)
        .await
    {
        Ok(rank) => Ok(rank),
        Err(_) => Err("Rank not found".to_string()),
    }
}

async fn get_top_defeated(
    id: i64,
    char_id: i16,
    db: &mut crate::Connection<'_>,
) -> Result<
    Vec<(
        chrono::NaiveDateTime,
        i64,
        String,
        i16,
        Option<f32>,
        Option<f32>,
        Option<f32>,
    )>,
    String,
> {
    match schema::games::table
        .select((
            schema::games::timestamp,
            schema::games::id_b,
            schema::games::name_b,
            schema::games::char_b,
            schema::games::value_b,
            schema::games::deviation_b,
            schema::games::value_b - schema::games::deviation_b,
        ))
        .filter(
            schema::games::id_a
                .eq(id)
                .and(schema::games::char_a.eq(char_id))
                .and(schema::games::winner.eq(1))
                .and(schema::games::deviation_b.lt(30.0)),
        )
        .order((schema::games::value_b - schema::games::deviation_b).desc())
        .limit(1)
        .union(
            schema::games::table
                .select((
                    schema::games::timestamp,
                    schema::games::id_a,
                    schema::games::name_a,
                    schema::games::char_a,
                    schema::games::value_a,
                    schema::games::deviation_a,
                    schema::games::value_a - schema::games::deviation_a,
                ))
                .order((schema::games::value_a - schema::games::deviation_a).desc())
                .limit(1)
                .filter(
                    schema::games::id_b
                        .eq(id)
                        .and(schema::games::char_b.eq(char_id))
                        .and(schema::games::winner.eq(2))
                        .and(schema::games::deviation_a.lt(30.0)),
                ),
        )
        //TODO use this instead when positional_order_by + limit is released
        //.positional_order_by(OrderColumn::from(6).desc())
        //.limit(1)
        .load::<(
            chrono::NaiveDateTime,
            i64,
            String,
            i16,
            Option<f32>,
            Option<f32>,
            Option<f32>,
        )>(db)
        .await
    {
        Ok(top_defeated) => Ok(top_defeated),
        Err(_) => Err("Top defeated not found".to_string()),
    }
}

async fn get_top_rating(
    id: i64,
    char_id: i16,
    db: &mut crate::Connection<'_>,
) -> Result<Vec<(chrono::NaiveDateTime, Option<f32>, Option<f32>, Option<f32>)>, String> {
    match schema::games::table
        .select((
            schema::games::timestamp,
            schema::games::value_a,
            schema::games::deviation_a,
            schema::games::value_a - schema::games::deviation_a,
        ))
        .filter(
            schema::games::id_a
                .eq(id)
                .and(schema::games::char_a.eq(char_id))
                .and(schema::games::deviation_a.lt(30.0)),
        )
        .order((schema::games::value_a - schema::games::deviation_a).desc())
        .limit(1)
        .union(
            schema::games::table
                .select((
                    schema::games::timestamp,
                    schema::games::value_b,
                    schema::games::deviation_b,
                    schema::games::value_b - schema::games::deviation_b,
                ))
                .filter(
                    schema::games::id_b
                        .eq(id)
                        .and(schema::games::char_b.eq(char_id))
                        .and(schema::games::deviation_b.lt(30.0)),
                )
                .order((schema::games::value_b - schema::games::deviation_b).desc())
                .limit(1),
        )
        //TODO use this instead when positional_order_by + limit is released
        //.positional_order_by(OrderColumn::from(6).desc())
        //.limit(1)
        .load::<(chrono::NaiveDateTime, Option<f32>, Option<f32>, Option<f32>)>(db)
        .await
    {
        Ok(top_rating) => Ok(top_rating),
        Err(_) => Err("Top rating not found".to_string()),
    }
}

async fn get_tags(
    id: i64,
    db: &mut crate::Connection<'_>,
) -> Result<Vec<(String, String)>, String> {
    match schema::tags::table
        .select((schema::tags::tag, schema::tags::style))
        .filter(schema::tags::player_id.eq(id))
        .load::<(String, String)>(db)
        .await
    {
        Ok(tags) => Ok(tags),
        Err(_) => Err("Tags not found".to_string()),
    }
}

pub async fn get_tags_from_player_list(
    ids: HashSet<i64>,
    db: &mut crate::Connection<'_>,
) -> Result<HashMap<i64, Vec<(String, String)>>, String> {
    let tags = match schema::tags::table
        .select((
            schema::tags::player_id,
            schema::tags::tag,
            schema::tags::style,
        ))
        .filter(schema::tags::player_id.eq_any(ids))
        .load::<(i64, String, String)>(db)
        .await
    {
        Ok(tags) => tags,
        Err(_) => return Err("Tags not found".to_string()),
    };

    let mut result = HashMap::new();
    for (id, tag, style) in tags {
        if !result.contains_key(&id) {
            result.insert(id, Vec::new());
        }
        result.get_mut(&id).unwrap().push((tag, style));
    }

    Ok(result)
}

pub async fn get_player_response_data(
    id: i64,
    db: &mut crate::Connection<'_>,
) -> Result<
    (
        Vec<(Player, PlayerRating)>,
        HashMap<i16, i32>,
        HashMap<i16, i32>,
        HashMap<i16, crate::handlers::player::TopDefeated>,
        HashMap<i16, crate::handlers::player::TopRating>,
        i32,
        Vec<(String, String)>,
    ),
    String,
> {
    let player_char = match get_player_char_and_rating(id, db).await {
        Ok(player_char) => player_char,
        Err(_) => {
            return Err("Player not found".to_string());
        }
    };

    let mut match_counts = HashMap::new();
    let mut top_chars = HashMap::new();
    let mut top_defeated = HashMap::new();
    let mut top_rating = HashMap::new();

    let top_global = match get_global_rank(id, db).await {
        Ok(rank) => rank,
        Err(_) => 0,
    };

    for (player, rating) in player_char.iter() {
        let match_count = match get_match_count(player.id, rating.char_id, db).await {
            Ok(count) => count,
            Err(e) => return Err(e),
        };
        match_counts.insert(rating.char_id, match_count as i32);

        let top_char = match get_top_char(id, rating.char_id, db).await {
            Ok(rank) => rank,
            Err(_) => 0,
        };
        top_chars.insert(rating.char_id, top_char);

        let top_defeated_res: Vec<(
            chrono::NaiveDateTime,
            i64,
            String,
            i16,
            Option<f32>,
            Option<f32>,
            Option<f32>,
        )> = match get_top_defeated(id, rating.char_id, db).await {
            Ok(res) => res,
            Err(e) => return Err(e),
        };

        if top_defeated_res.len() > 0 {
            let mut highest_index = 0;

            if top_defeated_res.len() > 1 {
                if top_defeated_res[0].6.unwrap() < top_defeated_res[1].6.unwrap() {
                    highest_index = 1;
                }
            }

            top_defeated.insert(
                rating.char_id,
                crate::handlers::player::TopDefeated {
                    timestamp: top_defeated_res[highest_index].0.to_string(),
                    id: top_defeated_res[highest_index].1,
                    name: top_defeated_res[highest_index].2.clone(),
                    char_short: CHAR_NAMES[top_defeated_res[highest_index].3 as usize]
                        .0
                        .to_string(),
                    value: top_defeated_res[highest_index].4.unwrap_or(0.0),
                    deviation: top_defeated_res[highest_index].5.unwrap_or(0.0),
                },
            );
        }

        let top_rating_res: Vec<(chrono::NaiveDateTime, Option<f32>, Option<f32>, Option<f32>)> =
            match get_top_rating(id, rating.char_id, db).await {
                Ok(res) => res,
                Err(e) => return Err(e),
            };

        if top_rating_res.len() > 0 {
            let mut highest_index = 0;

            if top_rating_res.len() > 1 {
                if top_rating_res[0].3.unwrap() <= top_rating_res[1].3.unwrap() {
                    highest_index = 1;
                }
            }

            top_rating.insert(
                rating.char_id,
                crate::handlers::player::TopRating {
                    timestamp: top_rating_res[highest_index].0.to_string(),
                    value: top_rating_res[highest_index].1.unwrap(),
                    deviation: top_rating_res[highest_index].2.unwrap(),
                },
            );
        }
    }

    let tags = match get_tags(id, db).await {
        Ok(tags) => tags,
        Err(e) => return Err(e),
    };

    Ok((
        player_char,
        match_counts,
        top_chars,
        top_defeated,
        top_rating,
        top_global,
        tags,
    ))
}

pub async fn get_games(
    id: i64,
    char_id: i16,
    count: i64,
    offset: i64,
    db: &mut crate::Connection<'_>,
) -> Result<Vec<models::Game>, String> {
    if get_player_status(id, db).await? != Status::Public {
        return Err("Player not found".to_string());
    }

    match schema::games::table
        .filter(
            (schema::games::id_a
                .eq(id)
                .and(schema::games::char_a.eq(char_id)))
            .or(schema::games::id_b
                .eq(id)
                .and(schema::games::char_b.eq(char_id))),
        )
        .filter(schema::games::value_a.is_not_null())
        .order(
            crate::pull::coalesce(schema::games::real_timestamp, schema::games::timestamp).desc(),
        )
        .limit(count)
        .offset(offset)
        .load(db)
        .await
    {
        Ok(games) => Ok(games),
        Err(_) => Err("Games not found".to_string()),
    }
}

pub async fn get_top_players(
    count: i64,
    offset: i64,
    db: &mut crate::Connection<'_>,
) -> Result<Vec<(GlobalRank, Player, PlayerRating)>, String> {
    match schema::global_ranks::table
        .inner_join(schema::players::table.on(schema::players::id.eq(schema::global_ranks::id)))
        .inner_join(
            schema::player_ratings::table
                .on(schema::player_ratings::id.eq(schema::global_ranks::id)),
        )
        .select((
            GlobalRank::as_select(),
            Player::as_select(),
            PlayerRating::as_select(),
        ))
        .filter(schema::global_ranks::char_id.eq(schema::player_ratings::char_id))
        .order(schema::global_ranks::rank.asc())
        .limit(count)
        .offset(offset)
        .load(db)
        .await
    {
        Ok(games) => Ok(games),
        Err(_) => Err("Games not found".to_string()),
    }
}

pub async fn get_top_for_char(
    char_id: i16,
    count: i64,
    offset: i64,
    db: &mut crate::Connection<'_>,
) -> Result<Vec<(CharacterRank, Player, PlayerRating)>, String> {
    match schema::character_ranks::table
        .inner_join(schema::players::table)
        .inner_join(
            schema::player_ratings::table.on(schema::players::id.eq(schema::player_ratings::id)),
        )
        .select((
            CharacterRank::as_select(),
            Player::as_select(),
            PlayerRating::as_select(),
        ))
        .filter(schema::character_ranks::char_id.eq(char_id))
        .filter(schema::player_ratings::char_id.eq(char_id))
        .order(schema::character_ranks::rank.asc())
        .limit(count)
        .offset(offset)
        .load(db)
        .await
    {
        Ok(games) => Ok(games),
        Err(_) => Err("Games not found".to_string()),
    }
}

pub async fn find_player(
    search_params: crate::handlers::search::SearchParams,
    db: &mut crate::Connection<'_>,
) -> Result<Vec<(Player, PlayerRating)>, String> {
    let count = 100;
    let offset = 0;

    let exact_like = if search_params.exact.unwrap_or(false) {
        format!("{}", search_params.search_string)
    } else {
        format!("%{}%", search_params.search_string)
    };

    match schema::players::table
        .inner_join(
            schema::player_ratings::table.on(schema::player_ratings::id.eq(schema::players::id)),
        )
        .select((Player::as_select(), PlayerRating::as_select()))
        .filter(schema::players::name.ilike(exact_like))
        .filter(schema::players::status.eq(Status::Public))
        .limit(count)
        .offset(offset)
        .load(db)
        .await
    {
        Ok(player) => Ok(player),
        Err(_) => Err("Player not found".to_string()),
    }
}

pub async fn set_claim_code(
    id: i64,
    code: &str,
    db: &mut crate::Connection<'_>,
) -> Result<bool, String> {
    match update(schema::players::table.filter(schema::players::id.eq(id)))
        .set(schema::players::rcode_check_code.eq(code))
        .execute(db)
        .await
    {
        Ok(updated) => {
            if updated > 0 {
                Ok(true)
            } else {
                Ok(false)
            }
        }
        Err(_) => Err("Error setting claim code".to_string()),
    }
}

pub async fn get_claim_code(id: i64, db: &mut crate::Connection<'_>) -> Result<String, String> {
    match schema::players::table
        .select(schema::players::rcode_check_code)
        .filter(schema::players::id.eq(id))
        .first::<Option<String>>(db)
        .await
    {
        Ok(code) => {
            if let Some(code) = code {
                Ok(code)
            } else {
                Err("Claim code not found".to_string())
            }
        }
        Err(_) => Err("Error getting claim code".to_string()),
    }
}

pub async fn get_player_api_key(id: i64, db: &mut crate::Connection<'_>) -> Result<String, String> {
    Ok(match schema::players::table
        .select(schema::players::api_key)
        .filter(schema::players::id.eq(id))
        .first::<Option<String>>(db)
        .await
    {
        Ok(key) => match key {
            Some(key) => Some(key),
            None => {
                let key = uuid::Uuid::new_v4().to_string();
                let updated_row_count =
                    match update(schema::players::table.filter(schema::players::id.eq(id)))
                        .set(schema::players::api_key.eq(key.clone()))
                        .execute(db)
                        .await
                    {
                        Ok(updated_row_count) => updated_row_count,
                        Err(_) => panic!("Error updating player"),
                    };

                if updated_row_count == 0 {
                    return Err("Player not found".to_string());
                }
                Some(key)
            }
        },
        Err(_) => panic!("Error updating player"),
    }
    .unwrap())
}

pub async fn get_player_status_using_key(
    key: String,
    db: &mut crate::Connection<'_>,
) -> Result<Status, String> {
    Ok(
        match schema::players::table
            .select(schema::players::status)
            .filter(schema::players::api_key.eq(key.clone()))
            .first::<Option<Status>>(db)
            .await
        {
            Ok(status) => match status {
                Some(status) => status,
                None => return Err("Player not found".to_string()),
            },
            Err(_) => return Err("Error getting player status".to_string()),
        },
    )
}

pub async fn set_player_status_using_key(
    key: String,
    status: crate::models::Status,
    db: &mut crate::Connection<'_>,
) -> Result<bool, String> {
    match update(schema::players::table.filter(schema::players::api_key.eq(key)))
        .set(schema::players::status.eq(status))
        .execute(db)
        .await
    {
        Ok(updated) => {
            if updated > 0 {
                Ok(true)
            } else {
                Ok(false)
            }
        }
        Err(_) => Err("Error setting player status".to_string()),
    }
}

pub async fn get_player_id_and_name_using_key(
    key: String,
    db: &mut crate::Connection<'_>,
) -> Result<(i64, String), String> {
    Ok(
        match schema::players::table
            .select((schema::players::id, schema::players::name))
            .filter(schema::players::api_key.eq(key.clone()))
            .first::<(i64, String)>(db)
            .await
        {
            Ok(id_name) => id_name,
            Err(_) => return Err("Player not found".to_string()),
        },
    )
}

pub async fn get_aliases(id: i64, db: &mut crate::Connection<'_>) -> Result<Vec<String>, String> {
    match schema::player_names::table
        .select(schema::player_names::name)
        .filter(schema::player_names::id.eq(id))
        .order(schema::player_names::name.asc())
        .load::<String>(db)
        .await
    {
        Ok(aliases) => Ok(aliases),
        Err(_) => Err("Aliases not found".to_string()),
    }
}

#[derive(QueryableByName, Queryable)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct RatingResult {
    #[diesel(sql_type = Timestamp)]
    pub timestamp: chrono::NaiveDateTime,
    #[diesel(sql_type = Nullable<Float>)]
    pub value: Option<f32>,
}
pub async fn get_ratings(
    id: i64,
    char_id: i16,
    db: &mut crate::Connection<'_>,
) -> Result<Vec<RatingResult>, String> {
    //TODO when positional_order_by + limit is released, change this to ORM query.
    let results = diesel::sql_query(
        "
        (SELECT timestamp, value_a value
        FROM games
        WHERE id_a = $1
        AND char_a = $2
        AND value_a != 0
        AND value_a IS NOT NULL
        UNION
        SELECT timestamp, value_b value
        FROM games
        WHERE id_b = $1
        AND char_b = $2
        AND value_b != 0
        AND value_b IS NOT NULL)
        ORDER BY timestamp desc
        LIMIT $3;
    ",
    );
    match results
        .bind::<diesel::sql_types::BigInt, _>(i64::try_from(id).unwrap())
        .bind::<diesel::sql_types::Integer, _>(i32::try_from(char_id).unwrap())
        .bind::<diesel::sql_types::Integer, _>(i32::try_from(100).unwrap())
        .get_results::<RatingResult>(db)
        .await
    {
        Ok(results) => Ok(results),
        Err(_) => return Err("Ratings not found".to_string()),
    }
}

pub async fn get_matchups(
    id: i64,
    char_id: i16,
    db: &mut crate::Connection<'_>,
) -> Result<Vec<Matchup>, String> {
    let results = diesel::sql_query(
        "
    SELECT 
        opponent_char,
        SUM(CASE 
            WHEN (position = 'a' AND winner = 1) OR (position = 'b' AND winner = 2)
            THEN 1 
            ELSE 0 
        END) as wins,
        COUNT(*) as total_games
    FROM (
        SELECT 
            char_b as opponent_char, 
            winner,
            'a' as position
        FROM games
        WHERE char_a = $1
        AND id_a = $2
        --AND timestamp > now() - interval '3 month'
        UNION ALL
        SELECT 
            char_a as opponent_char, 
            winner,
            'b' as position
        FROM games
        WHERE char_b = $1
        AND id_b = $2
        --AND timestamp > now() - interval '3 month'
    ) as combined_results
    GROUP BY opponent_char
    ORDER BY opponent_char;
    ",
    );
    match results
        .bind::<Integer, _>(i32::try_from(char_id).unwrap())
        .bind::<BigInt, _>(i64::try_from(id).unwrap())
        .get_results::<crate::pull::Matchup>(db)
        .await
    {
        Ok(results) => Ok(results),
        Err(_) => return Err("Matchups not found".to_string()),
    }
}

pub async fn get_supporters(db: &mut crate::Connection<'_>) -> Result<Vec<(i64, String)>, String> {
    match schema::tags::table
        .inner_join(schema::players::table.on(schema::tags::player_id.eq(schema::players::id)))
        .select((schema::tags::player_id, schema::players::name))
        .filter(schema::tags::tag.eq("VIP"))
        .load::<(i64, String)>(db)
        .await
    {
        Ok(supporters) => Ok(supporters),
        Err(_) => Err("Supporters not found".to_string()),
    }
}

pub async fn get_latest_game_time(
    db: &mut crate::Connection<'_>,
) -> Result<chrono::NaiveDateTime, String> {
    let latest_game_time = match schema::games::table
        .select(crate::pull::coalesce(
            schema::games::real_timestamp,
            schema::games::timestamp,
        ))
        .order(
            crate::pull::coalesce(schema::games::real_timestamp, schema::games::timestamp).desc(),
        )
        .filter(
            crate::pull::coalesce(schema::games::real_timestamp, schema::games::timestamp)
                .gt(chrono::Utc::now().naive_utc() - chrono::Duration::minutes(5)),
        )
        .limit(1)
        .first::<chrono::NaiveDateTime>(db)
        .await
    {
        Ok(game_time) => game_time,
        Err(_) => return Err("Latest game not found".to_string()),
    };

    Ok(latest_game_time)
}
