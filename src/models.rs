#![allow(unused)]
#![allow(clippy::all)]

use rocket_db_pools::diesel::{QueryResult, PgPool, prelude::*};
use crate::schema::{games, player_names, players, player_ratings, character_ranks, global_ranks, constants};

use chrono::NaiveDateTime;
#[derive(Selectable, Insertable, Queryable, Identifiable)]
#[diesel(primary_key(rank, char_id))]
pub struct CharacterRank {
    pub id: i64,
    pub char_id: i16,
    pub rank: i32,
}

#[derive(Selectable, Insertable, Queryable, Identifiable)]
#[diesel(primary_key(key))]
pub struct Constant {
    pub key: String,
    pub value: String,
}

#[derive(Selectable, Insertable, Queryable, Identifiable)]
#[diesel(primary_key(timestamp, id_a, id_b))]
pub struct Game {
    pub timestamp: NaiveDateTime,
    pub id_a: i64,
    pub name_a: String,
    pub char_a: i16,
    pub platform_a: i16,
    pub id_b: i64,
    pub name_b: String,
    pub char_b: i16,
    pub platform_b: i16,
    pub winner: i16,
    pub game_floor: i16,
    pub value_a: Option<f32>,
    pub deviation_a: Option<f32>,
    pub value_b: Option<f32>,
    pub deviation_b: Option<f32>,
    pub win_chance: Option<f32>,
}

#[derive(Selectable, Insertable, Queryable, Identifiable)]
#[diesel(primary_key(rank))]
pub struct GlobalRank {
    pub rank: i32,
    pub id: i64,
    pub char_id: i16,
}

#[derive(Selectable, Insertable, Queryable, Identifiable)]
#[diesel(primary_key(id, name))]
pub struct PlayerName {
    pub id: i64,
    pub name: String,
}

#[derive(Selectable, Insertable, Queryable, Identifiable)]
#[diesel(primary_key(id, char_id))]
pub struct PlayerRating {
    pub id: i64,
    pub char_id: i16,
    pub wins: i32,
    pub losses: i32,
    pub value: f32,
    pub deviation: f32,
    pub last_decay: NaiveDateTime,
    pub top_rating_value: Option<f32>,
    pub top_rating_deviation: Option<f32>,
    pub top_rating_timestamp: Option<NaiveDateTime>,
    pub top_defeated_id: Option<i64>,
    pub top_defeated_char_id: Option<i16>,
    pub top_defeated_name: Option<String>,
    pub top_defeated_value: Option<f32>,
    pub top_defeated_deviation: Option<f32>,
    pub top_defeated_timestamp: Option<NaiveDateTime>,
}

#[derive(Selectable, Insertable, Queryable)]
pub struct Player {
    pub id: i64,
    pub name: String,
    pub platform: i16,
}

