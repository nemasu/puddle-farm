#!/usr/bin/env bash
# Requires seed-games.sh to have been run first (all queries read from games).
# Mirrors src/pull.rs update_popularity(); the `id_a`/`id_b >= $ID_BASE` filters
# below are the one deviation, scoping every query to seeded rows only.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

PSQL="docker exec -i pf-postgres psql -v ON_ERROR_STOP=1 -U user -d puddle_farm"

ID_BASE=900000000000000
# Must stay in the same order as CHAR_NAMES in src/main.rs - index c below maps
# straight to CHAR_SHORT[c], so a reorder on either side silently mislabels data.
CHAR_SHORT=(SO KY MA AX CH PO FA MI ZA RA LE NA GI AN IN GO JC HA BA TE BI SI BE AS JN EL AB SL DI VE UN LU JA RK)

per_player_counts() {
  $PSQL -tA -F'|' -c "
    WITH chars AS (SELECT generate_series(0, 33) AS c),
    per_player AS (
      SELECT c, COUNT(id) AS cnt FROM (
        SELECT g.char_a AS c, g.id_a AS id FROM games g
          WHERE g.timestamp > now() - interval '1 month' AND g.id_a >= $ID_BASE
        UNION
        SELECT g.char_b AS c, g.id_b AS id FROM games g
          WHERE g.timestamp > now() - interval '1 month' AND g.id_b >= $ID_BASE
      ) combined GROUP BY c
    )
    SELECT chars.c, COALESCE(per_player.cnt, 0)
    FROM chars LEFT JOIN per_player ON chars.c = per_player.c
    ORDER BY chars.c;
  "
}

per_character_counts() {
  $PSQL -tA -F'|' -c "
    WITH chars AS (SELECT generate_series(0, 33) AS c),
    per_char AS (
      SELECT c, COUNT(c) AS cnt FROM (
        SELECT g.char_a AS c FROM games g
          WHERE g.timestamp > now() - interval '1 month' AND g.id_a >= $ID_BASE
        UNION ALL
        SELECT g.char_b AS c FROM games g
          WHERE g.timestamp > now() - interval '1 month' AND g.id_b >= $ID_BASE
      ) combined GROUP BY c
    )
    SELECT chars.c, COALESCE(per_char.cnt, 0)
    FROM chars LEFT JOIN per_char ON chars.c = per_char.c
    ORDER BY chars.c;
  "
}

GAME_COUNT=$($PSQL -tAc "SELECT count(*) FROM games WHERE id_a >= $ID_BASE;" | tr -d '\r')
if [ "$GAME_COUNT" -eq 0 ]; then
  echo "No seeded games found (id_a >= $ID_BASE). Run seed-games.sh first." >&2
  exit 1
fi

# Captured into a variable (not read from a process substitution directly) so
# that `set -e` actually sees a failure in per_player_counts/per_character_counts.
per_player_data=$(per_player_counts | tr -d '\r')
while IFS='|' read -r c count; do
  docker exec pf-redis redis-cli SET "popularity_per_player_${CHAR_SHORT[$c]}" "$count" > /dev/null
done <<< "$per_player_data"

per_character_data=$(per_character_counts | tr -d '\r')
while IFS='|' read -r c count; do
  docker exec pf-redis redis-cli SET "popularity_per_character_${CHAR_SHORT[$c]}" "$count" > /dev/null
done <<< "$per_character_data"

TOTAL_PLAYERS=$($PSQL -tAc "
  SELECT COUNT(id) FROM (
    SELECT g.id_a AS id FROM games g WHERE g.timestamp > now() - interval '1 month' AND g.id_a >= $ID_BASE
    UNION
    SELECT g.id_b AS id FROM games g WHERE g.timestamp > now() - interval '1 month' AND g.id_b >= $ID_BASE
  ) combined;
" | tr -d '\r')
docker exec pf-redis redis-cli SET popularity_per_player_total "$TOTAL_PLAYERS" > /dev/null

ONE_MONTH_GAMES=$($PSQL -tAc "
  SELECT COUNT(*) FROM games WHERE timestamp > now() - interval '1 month' AND id_a >= $ID_BASE;
" | tr -d '\r')
docker exec pf-redis redis-cli SET one_month_games "$ONE_MONTH_GAMES" > /dev/null
docker exec pf-redis redis-cli SET last_update_daily "$(date -u +"%Y-%m-%d %H:%M:%S")" > /dev/null

echo "Seeded popularity_per_player_*, popularity_per_character_* (total_players=$TOTAL_PLAYERS, one_month_games=$ONE_MONTH_GAMES)."
