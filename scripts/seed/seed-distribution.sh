#!/usr/bin/env bash
# Requires seed-players.sh to have been run first (reads from player_ratings).
# Bucket/percentage/percentile SQL mirrors src/pull.rs update_distribution().
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

PSQL="docker exec -i pf-postgres psql -v ON_ERROR_STOP=1 -U user -d puddle_farm"

ID_BASE=900000000000000

DIST_JSON=$($PSQL -tAc "
-- Bucket boundaries copied from src/pull.rs update_distribution() - keep both in
-- sync if rank tiers ever change (also duplicated a third time in seed-players.sh's
-- ranks CTE, in a different format).
WITH buckets AS (
    SELECT
      unnest(ARRAY[-10000000, 1,    1000, 2000, 3000, 4200, 5400, 6600, 8800,  11000, 13200, 15600, 18000, 20400, 24400, 28400, 32400, 36600, 40800, 10000000, 10001600, 10001700, 10001800]) AS lower_bound,
      unnest(ARRAY[1, 1000, 2000, 3000, 4200, 5400, 6600, 8800, 11000, 13200, 15600, 18000, 20400, 24400, 28400, 32400, 36600, 40800, 10000000, 10001600, 10001700, 10001800, 200000000]) AS upper_bound
),
bucket_counts AS (
    SELECT
        b.lower_bound,
        b.upper_bound,
        count(t.value) AS bucket_count
    FROM player_ratings t
    LEFT JOIN buckets b ON t.value >= b.lower_bound AND t.value < b.upper_bound
    WHERE t.id >= $ID_BASE  -- deviation from pull.rs: scope to seeded rows only
    GROUP BY b.lower_bound, b.upper_bound
),
percentiles AS (
    SELECT
        lower_bound,
        upper_bound,
        bucket_count,
        SUM(bucket_count) OVER (ORDER BY lower_bound) as cumulative_sum,
        SUM(bucket_count) OVER () as total_count,
        SUM(CASE WHEN upper_bound != 1 THEN bucket_count ELSE 0 END) OVER (ORDER BY lower_bound) as cumulative_sum_ranked_only,
        SUM(bucket_count) FILTER (WHERE upper_bound != 1) OVER () as total_count_excluding_placement
    FROM bucket_counts
),
final AS (
    SELECT
        p.lower_bound,
        p.upper_bound,
        p.bucket_count AS count,
        CASE
            WHEN p.upper_bound = 1 THEN CAST(ROUND((p.bucket_count * 100.0 / p.total_count), 2) AS FLOAT)
            ELSE CAST(ROUND((p.bucket_count * 100.0 / p.total_count_excluding_placement), 2) AS FLOAT)
        END AS percentage,
        CASE
            WHEN p.upper_bound = 1 THEN 0.0
            ELSE CAST(ROUND((100.0 - ((p.cumulative_sum_ranked_only - p.bucket_count) * 100.0 / p.total_count_excluding_placement)), 2) AS FLOAT)
        END AS percentile
    FROM percentiles p
    ORDER BY p.lower_bound
)
SELECT COALESCE(json_agg(row_to_json(final)), '[]') FROM final;
")

echo "$DIST_JSON" | docker exec -i pf-redis redis-cli -x SET distribution_rating > /dev/null

ONE_MONTH_PLAYERS=$($PSQL -tAc "SELECT count(DISTINCT id) FROM player_ratings WHERE id >= $ID_BASE;" | tr -d '\r')
docker exec pf-redis redis-cli SET one_month_players "$ONE_MONTH_PLAYERS" > /dev/null
docker exec pf-redis redis-cli SET last_update_daily "$(date -u +"%Y-%m-%d %H:%M:%S")" > /dev/null

echo "Seeded distribution_rating (one_month_players=$ONE_MONTH_PLAYERS)."
