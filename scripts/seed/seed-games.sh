#!/usr/bin/env bash
# Requires seed-players.sh to have been run first (reads from player_ratings).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

PSQL="docker exec -i pf-postgres psql -v ON_ERROR_STOP=1 -U user -d puddle_farm"

ID_BASE=900000000000000
GAME_COUNT="${1:-2000}"
VANQ_GAME_COUNT="${2:-200}"
VANQ_VALUE_FLOOR=10001600

PLAYER_COUNT=$($PSQL -tAc "SELECT count(*) FROM player_ratings WHERE id >= $ID_BASE;" | tr -d '\r')
if [ "$PLAYER_COUNT" -eq 0 ]; then
  echo "No seeded player_ratings found (id >= $ID_BASE). Run seed-players.sh first." >&2
  exit 1
fi

$PSQL -v id_base="$ID_BASE" -v game_count="$GAME_COUNT" -v vanq_game_count="$VANQ_GAME_COUNT" -v vanq_floor="$VANQ_VALUE_FLOOR" <<'SQL'
BEGIN;

DELETE FROM games WHERE id_a >= :id_base OR id_b >= :id_base;

-- Regular ranked matches. value_a/value_b get a small per-match offset around
-- the player's base rating (winner +, loser -) instead of the raw base value,
-- otherwise every match for a player has the same own_rating_value and the
-- frontend's per-match rating-change display (own_rating_value delta between
-- consecutive matches, see frontend/src/utils/Player.tsx groupMatches) is
-- always 0.
WITH pool AS (
  SELECT pr.id, pr.char_id, pr.value, p.name
  FROM player_ratings pr JOIN players p ON p.id = pr.id
  WHERE pr.id >= :id_base
),
pairs AS (
  SELECT
    a.id AS id_a, a.name AS name_a, a.char_id AS char_a, a.value AS value_a,
    b.id AS id_b, b.name AS name_b, b.char_id AS char_b, b.value AS value_b,
    (CASE WHEN random() < 0.5 THEN 1 ELSE 2 END) AS winner
  FROM pool a JOIN pool b ON a.id <> b.id
  ORDER BY random()
  LIMIT :game_count
)
INSERT INTO games (timestamp, id_a, name_a, char_a, platform_a, id_b, name_b, char_b, platform_b, winner, game_floor, value_a, value_b)
SELECT
  now() - (random() * interval '30 days'),
  id_a, name_a, char_a, 1,
  id_b, name_b, char_b, 1,
  winner,
  0,
  GREATEST(0, value_a + (CASE WHEN winner = 1 THEN (random() * 20)::int ELSE -(random() * 20)::int END)),
  GREATEST(0, value_b + (CASE WHEN winner = 2 THEN (random() * 20)::int ELSE -(random() * 20)::int END))
FROM pairs;

-- Vanquisher-tier matches (value >= threshold), so matchup_vanq_* has data too.
-- Reuses the same players/chars but overrides value_a/value_b to clear the
-- Vanquisher floor. Winner gets a higher offset band than the loser, same
-- reasoning as the regular matches above (non-zero per-match rating change).
WITH pool AS (
  SELECT pr.id, pr.char_id, p.name
  FROM player_ratings pr JOIN players p ON p.id = pr.id
  WHERE pr.id >= :id_base
),
pairs AS (
  SELECT
    a.id AS id_a, a.name AS name_a, a.char_id AS char_a,
    b.id AS id_b, b.name AS name_b, b.char_id AS char_b,
    (CASE WHEN random() < 0.5 THEN 1 ELSE 2 END) AS winner
  FROM pool a JOIN pool b ON a.id <> b.id
  ORDER BY random()
  LIMIT :vanq_game_count
)
INSERT INTO games (timestamp, id_a, name_a, char_a, platform_a, id_b, name_b, char_b, platform_b, winner, game_floor, value_a, value_b)
SELECT
  now() - (random() * interval '30 days'),
  id_a, name_a, char_a, 1,
  id_b, name_b, char_b, 1,
  winner,
  0,
  :vanq_floor + (CASE WHEN winner = 1 THEN (random() * 100 + 50)::int ELSE (random() * 100)::int END),
  :vanq_floor + (CASE WHEN winner = 2 THEN (random() * 100 + 50)::int ELSE (random() * 100)::int END)
FROM pairs;

COMMIT;
SQL

echo "Seeded $GAME_COUNT ranked games + $VANQ_GAME_COUNT Vanquisher-tier games."
