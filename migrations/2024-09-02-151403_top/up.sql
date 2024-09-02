CREATE TABLE global_ranks (
    rank INT NOT NULL PRIMARY KEY,
    id BIGINT NOT NULL,
    char_id SMALLINT NOT NULL
);

CREATE TABLE character_ranks (
    rank INT NOT NULL,
    id BIGINT NOT NULL,
    char_id SMALLINT NOT NULL,
    PRIMARY KEY (rank, char_id)
);

CREATE TABLE constants (
    key TEXT NOT NULL PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO constants (key, value) VALUES ('last_ranking_period', '1725291382');