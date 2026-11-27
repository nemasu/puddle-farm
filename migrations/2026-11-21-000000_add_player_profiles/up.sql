CREATE TABLE player_profile_values (
    player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('avatar', 'comment')),
    -- PNG avatar or UTF-8 comment bytes. Saved values have no expiry.
    payload BYTEA,
    -- Time of the last successful fetch for this value.
    fetched_at TIMESTAMPTZ,
    -- ID of the in-progress fetch claim, cleared when the fetch finishes.
    fetch_id TEXT,
    -- Expiry of the fetch claim. After this time another worker can claim the fetch.
    fetch_until TIMESTAMPTZ,
    PRIMARY KEY (player_id, kind),
    CHECK ((payload IS NULL) = (fetched_at IS NULL)),
    CHECK ((fetch_id IS NULL) = (fetch_until IS NULL))
);

CREATE TABLE player_profile_refreshes (
    player_id BIGINT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    -- Time of the last accepted manual refresh attempt. The next is allowed after 24 hours.
    requested_at TIMESTAMPTZ NOT NULL
);
