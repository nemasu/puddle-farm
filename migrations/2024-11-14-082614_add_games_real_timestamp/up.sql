ALTER TABLE games ADD COLUMN real_timestamp TIMESTAMP;

CREATE INDEX games_timestamps ON games(timestamp, real_timestamp);