CREATE TABLE hourly_player_counts (
    bucket_start BIGINT PRIMARY KEY,
    player_count BIGINT NOT NULL CHECK (player_count >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
