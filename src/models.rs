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
    self, character_ranks, games, global_ranks, player_names, player_ratings, players, tags
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
    pub value_a: Option<f32>,
    pub deviation_a: Option<f32>,
    pub value_b: Option<f32>,
    pub deviation_b: Option<f32>,
    pub win_chance: Option<f32>,
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
}

#[derive(Debug, PartialEq, FromSqlRow, AsExpression, Eq, Clone)]
#[diesel(sql_type = crate::schema::sql_types::Status)]
pub enum Status {
    Public,
    Private,
    Cheater
}

impl Display for Status {
    fn fmt(&self, f: &mut Formatter) -> std::fmt::Result {
        match *self {
            Status::Public => write!(f, "Public"),
            Status::Private => write!(f, "Private"),
            Status::Cheater => write!(f, "Cheater"),
        }
    }
}

impl ToSql<crate::schema::sql_types::Status, Pg> for Status {
    fn to_sql<'b>(&'b self, out: &mut Output<'b, '_, Pg>) -> serialize::Result {
        match *self {
            Status::Public => out.write_all(b"public")?,
            Status::Private => out.write_all(b"private")?,
            Status::Cheater => out.write_all(b"cheater")?,
        }
        Ok(IsNull::No)
    }
}

impl FromSql<crate::schema::sql_types::Status, Pg> for Status {
    fn from_sql(bytes: PgValue<'_>) -> deserialize::Result<Self> {
        match bytes.as_bytes() {
            b"public" => Ok(Status::Public),
            b"private" => Ok(Status::Private),
            b"cheater" => Ok(Status::Cheater),
            _ => Err("Unrecognized enum variant".into()),
        }
    }
}

#[derive(Selectable, Insertable, Queryable)]
pub struct Player {
    pub id: i64,
    pub name: String,
    pub platform: i16,
    pub status: Option<Status>,
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