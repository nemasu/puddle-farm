#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

PSQL="docker exec -i pf-postgres psql -v ON_ERROR_STOP=1 -U user -d puddle_farm"

N="${1:-200}"
ID_BASE=900000000000000
NUM_CHARS=34

# rank_idx -> [lo, hi] rating range, mirrors frontend/src/utils/Utils.jsx rankThresholds
$PSQL -v id_base="$ID_BASE" -v n="$N" <<'SQL'
BEGIN;

DELETE FROM player_ratings WHERE id >= :id_base;
DELETE FROM games WHERE id_a >= :id_base OR id_b >= :id_base;
DELETE FROM player_names WHERE id >= :id_base;
DELETE FROM players WHERE id >= :id_base;

INSERT INTO players (id, name, platform)
SELECT :id_base + s, 'TestPlayer' || s, 1
FROM generate_series(1, :n) s;

WITH ranks(idx, lo, hi) AS (
  VALUES
    (0, 0, 0),
    (1, 1, 999),
    (2, 1000, 1999),
    (3, 2000, 2999),
    (4, 3000, 4199),
    (5, 4200, 5399),
    (6, 5400, 6599),
    (7, 6600, 8799),
    (8, 8800, 10999),
    (9, 11000, 13199),
    (10, 13200, 15599),
    (11, 15600, 17999),
    (12, 18000, 20399),
    (13, 20400, 24399),
    (14, 24400, 28399),
    (15, 28400, 32399),
    (16, 32400, 36599),
    (17, 36600, 40799),
    (18, 40800, 45000)
),
players_gen AS (
  SELECT s, (s % 19) AS rank_idx FROM generate_series(1, :n) s
)
INSERT INTO player_ratings (id, char_id, value)
SELECT :id_base + pg.s, (pg.s % 34), r.lo + (random() * (r.hi - r.lo))::int  -- 34 == NUM_CHARS below (this heredoc can't see bash vars)
FROM players_gen pg
JOIN ranks r ON r.idx = pg.rank_idx;

-- Give a handful of players a second character rating, so player pages have
-- something to exercise the character switcher with (real players commonly
-- have ratings on more than one character; every seeded player above has
-- exactly one).
WITH ranks(idx, lo, hi) AS (
  VALUES
    (0, 0, 0),
    (1, 1, 999),
    (2, 1000, 1999),
    (3, 2000, 2999),
    (4, 3000, 4199),
    (5, 4200, 5399),
    (6, 5400, 6599),
    (7, 6600, 8799),
    (8, 8800, 10999),
    (9, 11000, 13199),
    (10, 13200, 15599),
    (11, 15600, 17999),
    (12, 18000, 20399),
    (13, 20400, 24399),
    (14, 24400, 28399),
    (15, 28400, 32399),
    (16, 32400, 36599),
    (17, 36600, 40799),
    (18, 40800, 45000)
),
multi_char_players AS (
  -- fixed set (TestPlayer1..TestPlayer8), not random, so this is reproducible run to run
  SELECT id FROM players WHERE id > :id_base AND id <= :id_base + 8
),
extra_char AS (
  SELECT
    mcp.id,
    (
      SELECT c FROM generate_series(0, 33) c
      WHERE c NOT IN (SELECT char_id FROM player_ratings WHERE player_ratings.id = mcp.id)
      ORDER BY random() LIMIT 1
    ) AS char_id,
    (random() * 18)::int AS rank_idx
  FROM multi_char_players mcp
)
INSERT INTO player_ratings (id, char_id, value)
SELECT ec.id, ec.char_id, r.lo + (random() * (r.hi - r.lo))::int
FROM extra_char ec
JOIN ranks r ON r.idx = ec.rank_idx;

COMMIT;
SQL

leaderboard_json() {
  local char_filter="$1"
  $PSQL -tAc "
    SELECT COALESCE(json_agg(e), '[]') FROM (
      SELECT
        row_number() over (order by pr.value desc) AS rank,
        pr.id::text AS player_id,
        p.name AS player_name,
        pr.char_id,
        pr.value AS rating
      FROM player_ratings pr
      JOIN players p ON p.id = pr.id
      WHERE pr.id >= $ID_BASE $char_filter
      ORDER BY pr.value DESC
    ) e;
  "
}

leaderboard_json "" | docker exec -i pf-redis redis-cli -x SET leaderboard_all > /dev/null

for c in $(seq 0 $((NUM_CHARS - 1))); do
  # Always write, even "[]" - a skipped SET would leave a stale key from a
  # previous (larger) run pointing at players that no longer exist.
  leaderboard_json "AND pr.char_id = $c" | docker exec -i pf-redis redis-cli -x SET "leaderboard_char_$c" > /dev/null
done

LEGEND_COUNT=20
LEGEND_DR_OFFSET=10000000
$PSQL -tAc "
  SELECT COALESCE(json_agg(e), '[]') FROM (
    SELECT
      row_number() over (order by pr.value desc) AS rank,
      pr.id::text AS player_id,
      p.name AS player_name,
      pr.char_id,
      pr.value + $LEGEND_DR_OFFSET AS rating
    FROM player_ratings pr
    JOIN players p ON p.id = pr.id
    WHERE pr.id >= $ID_BASE
    ORDER BY pr.value DESC
    LIMIT $LEGEND_COUNT
  ) e;
" | docker exec -i pf-redis redis-cli -x SET leaderboard_legend > /dev/null

echo "Seeded $N players (id $((ID_BASE + 1))-$((ID_BASE + N))) across 19 rank tiers, top $LEGEND_COUNT marked as legend, 8 with a second character."
