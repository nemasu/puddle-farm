CREATE TABLE players  (
    id BIGINT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    platform SMALLINT NOT NULL,
    api_key VARCHAR,
    rcode_check_code VARCHAR
);

CREATE TABLE player_names (
    id BIGINT NOT NULL REFERENCES players(id),
    name TEXT NOT NULL,
    PRIMARY KEY(id, name)
);

CREATE TABLE player_ratings (
    id BIGINT NOT NULL REFERENCES players(id),
    char_id SMALLINT NOT NULL,
    value BIGINT NOT NULL,
    PRIMARY KEY(id, char_id)
);

CREATE TABLE games (
    timestamp TIMESTAMP NOT NULL,
    real_timestamp TIMESTAMP,
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
    value_a BIGINT NOT NULL,
    value_b BIGINT NOT NULL,
    PRIMARY KEY (timestamp, id_a, id_b)
);
CREATE INDEX games_id_char_a ON games(id_a, char_a);
CREATE INDEX games_id_char_b ON games(id_b, char_b);
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

CREATE TABLE tags (
    id SERIAL NOT NULL,
    player_id BIGINT NOT NULL,
    tag TEXT NOT NULL,
    style TEXT NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX tags_player_id ON tags (player_id);
CREATE INDEX tags_tag ON tags (tag);