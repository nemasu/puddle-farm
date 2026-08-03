#!/usr/bin/env bash
# Requires seed-games.sh to have been run first. Mirrors the aggregation SQL
# in src/pull.rs update_matchups() so the Redis payload shape matches production.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

PSQL="docker exec -i pf-postgres psql -v ON_ERROR_STOP=1 -U user -d puddle_farm"

ID_BASE=900000000000000
NUM_CHARS=34

matchup_json() {
  local char_id="$1"
  local extra_filter="$2"
  $PSQL -tAc "
    SELECT COALESCE(json_agg(json_build_object(
      'opponent_char', opponent_char, 'wins', wins, 'total_games', total_games
    )), '[]')
    FROM (
      SELECT
        opponent_char,
        SUM(CASE WHEN (position = 'a' AND winner = 1) OR (position = 'b' AND winner = 2)
            THEN 1 ELSE 0 END) AS wins,
        COUNT(*) AS total_games
      FROM (
        SELECT char_b AS opponent_char, winner, 'a' AS position
        FROM games
        WHERE char_a = $char_id AND id_a >= $ID_BASE  -- deviation from pull.rs: scope to seeded rows only
          AND timestamp > now() - interval '1 month'
          AND game_floor = 0 $extra_filter
        UNION ALL
        SELECT char_a AS opponent_char, winner, 'b' AS position
        FROM games
        WHERE char_b = $char_id AND id_b >= $ID_BASE  -- deviation from pull.rs: scope to seeded rows only
          AND timestamp > now() - interval '1 month'
          AND game_floor = 0 $extra_filter
      ) combined
      GROUP BY opponent_char
      ORDER BY opponent_char
    ) e;
  "
}

GAME_COUNT=$($PSQL -tAc "SELECT count(*) FROM games WHERE id_a >= $ID_BASE;" | tr -d '\r')
if [ "$GAME_COUNT" -eq 0 ]; then
  echo "No seeded games found (id_a >= $ID_BASE). Run seed-games.sh first." >&2
  exit 1
fi

for c in $(seq 0 $((NUM_CHARS - 1))); do
  matchup_json "$c" "AND value_a > 0 AND value_b > 0" \
    | docker exec -i pf-redis redis-cli -x SET "matchup_$c" > /dev/null
  matchup_json "$c" "AND value_a >= 10001600 AND value_b >= 10001600" \
    | docker exec -i pf-redis redis-cli -x SET "matchup_vanq_$c" > /dev/null
done

docker exec pf-redis redis-cli SET last_update_daily "$(date -u +"%Y-%m-%d %H:%M:%S")" > /dev/null

echo "Seeded matchup_0..$((NUM_CHARS - 1)) and matchup_vanq_0..$((NUM_CHARS - 1))."
