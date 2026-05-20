CREATE TABLE global_ranks (
    rank INT4 PRIMARY KEY,
    id INT8 NOT NULL,
    char_id INT2 NOT NULL
);

CREATE TABLE character_ranks (
    rank INT4 NOT NULL,
    char_id INT2 NOT NULL,
    id INT8 NOT NULL,
    PRIMARY KEY (rank, char_id)
);
