CREATE TABLE players  (
    id BIGINT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    platform SMALLINT NOT NULL
);

CREATE TABLE player_names (
    id BIGINT NOT NULL,
    name TEXT NOT NULL,
    PRIMARY KEY(id, name)
);

CREATE TABLE player_ratings (
    id BIGINT NOT NULL,
    char_id SMALLINT NOT NULL,
    wins INTEGER NOT NULL,
    losses INTEGER NOT NULL,
    value REAL NOT NULL,
    deviation REAL NOT NULL,
    last_decay TIMESTAMP NOT NULL,

    top_rating_value REAL,
    top_rating_deviation REAL,
    top_rating_timestamp TIMESTAMP,

    top_defeated_id BIGINT,
    top_defeated_char_id SMALLINT,
    top_defeated_name TEXT,
    top_defeated_value REAL,
    top_defeated_deviation REAL,
    top_defeated_timestamp TIMESTAMP,

    PRIMARY KEY(id, char_id)
);

CREATE TABLE games (
    timestamp TIMESTAMP NOT NULL,
    id_a BIGINT NOT NULL,
    name_a TEXT NOT NULL,
    char_a SMALLINT NOT NULL,
    platform_a SMALLINT NOT NULL,
    id_b BIGINT NOT NULL,
    name_b TEXT NOT NULL,
    char_b SMALLINT NOT NULL,
    platform_b SMALLINT NOT NULL,
    winner SMALLINT NOT NULL,
    game_floor SMALLINT NOT NULL,
    PRIMARY KEY (timestamp, id_a, id_b)
);