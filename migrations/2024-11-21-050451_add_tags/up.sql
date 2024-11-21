CREATE TABLE tags (
    id SERIAL NOT NULL,
    player_id BIGINT NOT NULL,
    tag TEXT NOT NULL,
    style TEXT NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX tags_player_id ON tags (player_id);
CREATE INDEX tags_tag ON tags (tag);