// @generated automatically by Diesel CLI.

diesel::table! {
    character_ranks (rank, char_id) {
        id -> Int8,
        char_id -> Int2,
        rank -> Int4,
    }
}

diesel::table! {
    games (timestamp, id_a, id_b) {
        timestamp -> Timestamp,
        real_timestamp -> Nullable<Timestamp>,
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
        value_a -> Int8,
        value_b -> Int8,
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
        value -> Int8,
    }
}

diesel::table! {
    players (id) {
        id -> Int8,
        name -> Text,
        platform -> Int2,
        api_key -> Nullable<Varchar>,
        rcode_check_code -> Nullable<Varchar>,
    }
}

diesel::table! {
    tags (id) {
        id -> Int4,
        player_id -> Int8,
        tag -> Text,
        style -> Text,
    }
}

diesel::joinable!(character_ranks -> players (id));
diesel::joinable!(global_ranks -> players (id));
diesel::joinable!(player_names -> players (id));
diesel::joinable!(player_ratings -> players (id));

diesel::allow_tables_to_appear_in_same_query!(
    character_ranks,
    games,
    global_ranks,
    player_names,
    player_ratings,
    players,
    tags,
);
