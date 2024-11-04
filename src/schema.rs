// @generated automatically by Diesel CLI.

pub mod sql_types {
    #[derive(diesel::query_builder::QueryId, Clone, diesel::sql_types::SqlType)]
    #[diesel(postgres_type(name = "status"))]
    pub struct Status;
}

diesel::table! {
    character_ranks (rank, char_id) {
        id -> Int8,
        char_id -> Int2,
        rank -> Int4,
    }
}

diesel::table! {
    constants (key) {
        key -> Text,
        value -> Text,
    }
}

diesel::table! {
    games (timestamp, id_a, id_b) {
        timestamp -> Timestamp,
        id_a -> Int8,
        name_a -> Text,
        char_a -> Int2,
        platform_a -> Int2,
        id_b -> Int8,
        name_b -> Text,
        char_b -> Int2,
        platform_b -> Int2,
        winner -> Int2,
        game_floor -> Int2,
        value_a -> Nullable<Float4>,
        deviation_a -> Nullable<Float4>,
        value_b -> Nullable<Float4>,
        deviation_b -> Nullable<Float4>,
        win_chance -> Nullable<Float4>,
    }
}

diesel::table! {
    global_ranks (rank) {
        rank -> Int4,
        id -> Int8,
        char_id -> Int2,
    }
}

diesel::table! {
    player_names (id, name) {
        id -> Int8,
        name -> Text,
    }
}

diesel::table! {
    player_ratings (id, char_id) {
        id -> Int8,
        char_id -> Int2,
        wins -> Int4,
        losses -> Int4,
        value -> Float4,
        deviation -> Float4,
        last_decay -> Timestamp,
    }
}

diesel::table! {
    use diesel::sql_types::*;
    use super::sql_types::Status;

    players (id) {
        id -> Int8,
        name -> Text,
        platform -> Int2,
        status -> Nullable<Status>,
        api_key -> Nullable<Varchar>,
        rcode_check_code -> Nullable<Varchar>,
    }
}

diesel::joinable!(character_ranks -> players (id));
diesel::joinable!(global_ranks -> players (id));
diesel::joinable!(player_names -> players (id));
diesel::joinable!(player_ratings -> players (id));

diesel::allow_tables_to_appear_in_same_query!(
    character_ranks,
    constants,
    games,
    global_ranks,
    player_names,
    player_ratings,
    players,
);
