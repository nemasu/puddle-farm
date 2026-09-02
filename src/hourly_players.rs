use diesel::{
    QueryableByName,
    sql_types::{BigInt, Nullable},
};
use diesel_async::{AsyncPgConnection, RunQueryDsl};
use serde::Serialize;

pub const HOUR_SECONDS: i64 = 60 * 60;
const BACKFILL_BATCH_HOURS: i64 = 24;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum HourlyRange {
    Hours24,
    Days7,
    Days30,
    Year1,
    All,
}

impl HourlyRange {
    pub fn parse(value: Option<&str>) -> Result<Self, String> {
        match value.unwrap_or("30d") {
            "24h" => Ok(Self::Hours24),
            "7d" => Ok(Self::Days7),
            "30d" => Ok(Self::Days30),
            "1y" => Ok(Self::Year1),
            "all" => Ok(Self::All),
            value => Err(format!("unsupported range {value:?}")),
        }
    }

    fn seconds(self) -> Option<i64> {
        match self {
            Self::Hours24 => Some(24 * HOUR_SECONDS),
            Self::Days7 => Some(7 * 24 * HOUR_SECONDS),
            Self::Days30 => Some(30 * 24 * HOUR_SECONDS),
            Self::Year1 => Some(365 * 24 * HOUR_SECONDS),
            Self::All => None,
        }
    }
}

#[derive(Debug, QueryableByName, Serialize)]
pub struct HourlyPlayerPoint {
    #[diesel(sql_type = BigInt)]
    pub timestamp: i64,
    #[diesel(sql_type = BigInt)]
    pub players: i64,
}

#[derive(QueryableByName)]
struct OptionalTimestamp {
    #[diesel(sql_type = Nullable<BigInt>)]
    timestamp: Option<i64>,
}

pub fn hour_start(timestamp: i64) -> i64 {
    timestamp.div_euclid(HOUR_SECONDS) * HOUR_SECONDS
}

pub async fn update_current_and_previous(
    connection: &mut AsyncPgConnection,
) -> Result<(), diesel::result::Error> {
    let current = hour_start(chrono::Utc::now().timestamp());
    upsert_range(connection, current - HOUR_SECONDS, current + HOUR_SECONDS).await
}

async fn upsert_range(
    connection: &mut AsyncPgConnection,
    start: i64,
    end: i64,
) -> Result<(), diesel::result::Error> {
    if start >= end {
        return Ok(());
    }
    diesel::sql_query(
        "INSERT INTO hourly_player_counts (bucket_start, player_count) \
         SELECT bucket.bucket_start, COUNT(players.player_id)::BIGINT \
         FROM generate_series($1::BIGINT, $2::BIGINT - 3600, 3600) AS bucket(bucket_start) \
         LEFT JOIN LATERAL ( \
             SELECT id_a AS player_id FROM games \
             WHERE timestamp >= TO_TIMESTAMP(bucket.bucket_start) AT TIME ZONE 'UTC' \
               AND timestamp < TO_TIMESTAMP(bucket.bucket_start + 3600) AT TIME ZONE 'UTC' \
             UNION \
             SELECT id_b AS player_id FROM games \
             WHERE timestamp >= TO_TIMESTAMP(bucket.bucket_start) AT TIME ZONE 'UTC' \
               AND timestamp < TO_TIMESTAMP(bucket.bucket_start + 3600) AT TIME ZONE 'UTC' \
         ) AS players ON TRUE \
         GROUP BY bucket.bucket_start \
         ON CONFLICT (bucket_start) DO UPDATE \
         SET player_count=EXCLUDED.player_count, updated_at=NOW()",
    )
    .bind::<BigInt, _>(start)
    .bind::<BigInt, _>(end)
    .execute(connection)
    .await?;
    Ok(())
}

pub async fn points(
    connection: &mut AsyncPgConnection,
    range: HourlyRange,
) -> Result<Vec<HourlyPlayerPoint>, diesel::result::Error> {
    let current = hour_start(chrono::Utc::now().timestamp());
    let start = range.seconds().map(|seconds| current - seconds);
    diesel::sql_query(
        "SELECT bucket_start AS timestamp, player_count AS players \
         FROM hourly_player_counts \
         WHERE bucket_start < $1 AND ($2::BIGINT IS NULL OR bucket_start >= $2) \
         ORDER BY bucket_start ASC",
    )
    .bind::<BigInt, _>(current)
    .bind::<Nullable<BigInt>, _>(start)
    .load(connection)
    .await
}

pub async fn backfill(connection: &mut AsyncPgConnection, days: i64) -> Result<(), String> {
    if days <= 0 {
        return Err("backfill days must be a positive integer".to_string());
    }
    let now = chrono::Utc::now().timestamp();
    let earliest = diesel::sql_query(
        "SELECT FLOOR(EXTRACT(EPOCH FROM MIN(timestamp)))::BIGINT AS timestamp FROM games",
    )
    .get_result::<OptionalTimestamp>(connection)
    .await
    .map_err(|error| error.to_string())?
    .timestamp;
    let Some((start, cutoff)) = backfill_window(now, days, earliest) else {
        tracing::info!("No completed match hours to backfill");
        return Ok(());
    };

    let batches = batch_ranges(start, cutoff);
    for (index, (batch_start, batch_end)) in batches.iter().copied().enumerate() {
        tracing::info!(
            batch = index + 1,
            batches = batches.len(),
            start = batch_start,
            end = batch_end,
            "Backfilling hourly players"
        );
        upsert_range(connection, batch_start, batch_end)
            .await
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn backfill_window(now: i64, days: i64, earliest: Option<i64>) -> Option<(i64, i64)> {
    let earliest = earliest?;
    let cutoff = hour_start(now);
    let requested = now.saturating_sub(days.saturating_mul(24 * HOUR_SECONDS));
    let start = hour_start(requested.max(earliest));
    (start < cutoff).then_some((start, cutoff))
}

fn batch_ranges(start: i64, end: i64) -> Vec<(i64, i64)> {
    let mut ranges = Vec::new();
    let mut cursor = start;
    while cursor < end {
        let batch_end = (cursor + BACKFILL_BATCH_HOURS * HOUR_SECONDS).min(end);
        ranges.push((cursor, batch_end));
        cursor = batch_end;
    }
    ranges
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn utc_hours_are_aligned_and_boundaries_stay_in_the_next_bucket() {
        assert_eq!(hour_start(3_599), 0);
        assert_eq!(hour_start(3_600), 3_600);
        assert_eq!(hour_start(3_601), 3_600);
    }

    #[test]
    fn ranges_validate_and_default_to_thirty_days() {
        assert_eq!(HourlyRange::parse(None), Ok(HourlyRange::Days30));
        assert_eq!(HourlyRange::parse(Some("all")), Ok(HourlyRange::All));
        assert!(HourlyRange::parse(Some("month")).is_err());
        assert_eq!(HourlyRange::Hours24.seconds(), Some(24 * HOUR_SECONDS));
        assert_eq!(HourlyRange::Days7.seconds(), Some(7 * 24 * HOUR_SECONDS));
        assert_eq!(HourlyRange::Days30.seconds(), Some(30 * 24 * HOUR_SECONDS));
        assert_eq!(HourlyRange::Year1.seconds(), Some(365 * 24 * HOUR_SECONDS));
        assert_eq!(HourlyRange::All.seconds(), None);
    }

    #[test]
    fn backfill_clamps_to_the_later_start_and_completed_hour() {
        let now = 100 * HOUR_SECONDS + 900;
        assert_eq!(
            backfill_window(now, 2, Some(60 * HOUR_SECONDS + 1_800)),
            Some((60 * HOUR_SECONDS, 100 * HOUR_SECONDS))
        );
        assert_eq!(
            backfill_window(now, 2, Some(99 * HOUR_SECONDS)),
            Some((99 * HOUR_SECONDS, 100 * HOUR_SECONDS))
        );
        assert_eq!(backfill_window(now, 2, Some(100 * HOUR_SECONDS)), None);
    }

    #[test]
    fn backfill_batches_at_twenty_four_hours() {
        assert_eq!(
            batch_ranges(0, 49 * HOUR_SECONDS),
            vec![
                (0, 24 * HOUR_SECONDS),
                (24 * HOUR_SECONDS, 48 * HOUR_SECONDS),
                (48 * HOUR_SECONDS, 49 * HOUR_SECONDS)
            ]
        );
    }
}
