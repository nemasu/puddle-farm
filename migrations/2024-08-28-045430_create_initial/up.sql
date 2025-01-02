CREATE TABLE players  (
    id BIGINT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    platform SMALLINT NOT NULL
);

CREATE TABLE player_names (
    id BIGINT NOT NULL REFERENCES players(id),
    name TEXT NOT NULL,
    PRIMARY KEY(id, name)
);

CREATE TABLE player_ratings (
    id BIGINT NOT NULL REFERENCES players(id),
    char_id SMALLINT NOT NULL,
    wins INTEGER NOT NULL,
    losses INTEGER NOT NULL,
    value REAL NOT NULL,
    deviation REAL NOT NULL,
    last_decay TIMESTAMP NOT NULL,
    PRIMARY KEY(id, char_id)
);

CREATE TABLE games (
    timestamp TIMESTAMP NOT NULL,
    id_a BIGINT NOT NULL REFERENCES players(id),
    name_a TEXT NOT NULL,
    char_a SMALLINT NOT NULL,
    platform_a SMALLINT NOT NULL,
    id_b BIGINT NOT NULL REFERENCES players(id),
    name_b TEXT NOT NULL,
    char_b SMALLINT NOT NULL,
    platform_b SMALLINT NOT NULL,
    winner SMALLINT NOT NULL,
    game_floor SMALLINT NOT NULL,
    value_a REAL,
    deviation_a REAL,
    value_b REAL,
    deviation_b REAL,
    PRIMARY KEY (timestamp, id_a, id_b)
);
CREATE INDEX games_id_char_a ON games(id_a, char_a);
CREATE INDEX games_id_char_b ON games(id_b, char_b);

CREATE INDEX games_value_deviation_a ON games(value_a, deviation_a);
CREATE INDEX games_value_deviation_b ON games(value_b, deviation_b);

CREATE INDEX games_timestamps ON games(timestamp, real_timestamp);

CREATE TABLE global_ranks (
    rank INT NOT NULL PRIMARY KEY,
    id BIGINT NOT NULL REFERENCES players(id),
    char_id SMALLINT NOT NULL
);

CREATE TABLE character_ranks (
    id BIGINT NOT NULL REFERENCES players(id),
    char_id SMALLINT NOT NULL,
    rank INT NOT NULL,
    PRIMARY KEY (rank, char_id)
);