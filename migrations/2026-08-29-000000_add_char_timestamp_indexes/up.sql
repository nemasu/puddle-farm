-- The daily matchup and popularity jobs scan games by character within a time
-- window (char_a/char_b = $1 AND timestamp > now() - interval ...). Without
-- these composite indexes each of the 32 characters costs a bitmap scan over
-- the whole window. Plain (non-CONCURRENTLY) builds: diesel sends up.sql as a
-- single multi-statement batch, which libpq wraps in an implicit transaction
-- where CONCURRENTLY is not allowed. Writers are blocked for the few minutes
-- the builds take; the puller's windowed catch-up recovers afterwards.
CREATE INDEX IF NOT EXISTS games_char_a_timestamp ON games (char_a, timestamp);
CREATE INDEX IF NOT EXISTS games_char_b_timestamp ON games (char_b, timestamp);
