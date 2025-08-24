#![allow(unused)]
#![allow(clippy::all)]

use std::io::Write;
use std::fmt::{Display, Formatter};

use diesel::{
    deserialize::{self, FromSql, FromSqlRow},
    expression::AsExpression,
    pg::{Pg, PgValue},
    serialize::{self, IsNull, Output, ToSql},
    sql_types::SqlType,
    prelude::*,
};
use crate::schema::{
    self, character_ranks, games, global_ranks, player_names, players, tags, player_ratings,
};

use chrono::NaiveDateTime;
#[derive(Selectable, Insertable, Queryable, Identifiable)]
#[diesel(primary_key(rank, char_id))]
pub struct CharacterRank {
    pub id: i64,
    pub char_id: i16,
    pub rank: i32,
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
    pub value_a: i64,
    pub value_b: i64,
    pub real_timestamp: Option<NaiveDateTime>,
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

#[derive(Selectable, Insertable, Queryable, Identifiable, Clone)]
#[diesel(primary_key(id, char_id))]
pub struct PlayerRating {
    pub id: i64,
    pub char_id: i16,
    pub value: i64,
}

#[derive(Selectable, Insertable, Queryable, Clone)]
pub struct Player {
    pub id: i64,
    pub name: String,
    pub platform: i16,
    pub api_key: Option<String>,
    pub rcode_check_code: Option<String>,
}

#[derive(Selectable, Insertable, Queryable)]
pub struct Tag {
    pub id: i32,
    pub player_id: i64,
    pub tag: String,
    pub style: String,
}