# Dev database seed scripts

Generate dummy data for a local backend so every page (Top, Legend, per-character rankings, search, Popularity, Matchup Tables, Rank Distribution) has something to show without running the real `cargo run pull` job (which requires a logged-in Steam client).

## Prerequisites

Requires Docker with Compose, and `bash`/`docker`/`docker compose` on `PATH`.

Start the dev database first (see `docker/docker-compose.dev.yml`):

```bash
docker compose -p puddle-farm-dev -f docker/docker-compose.dev.yml up -d postgres redis
docker compose -p puddle-farm-dev -f docker/docker-compose.dev.yml run --rm diesel migration run
```

Or just run `scripts/seed/reset.sh`, which does both from scratch (and drops any existing data/volumes).

## What gets created

With the defaults (`seed-all.sh` with no args):

- **200 players** (`TestPlayer1`..`TestPlayer200`), one character rating each, spread across all 19 rank tiers (Placement..Diamond 3, ~10+ players per tier).
- **Top 20** by rating are also written to `leaderboard_legend` (Legend page).
- **`TestPlayer1`..`TestPlayer8`** additionally get a second character rating, for testing the character switcher on player pages.
- **2000 regular ranked games** + **200 Vanquisher-tier games** (`value_a`/`value_b >= 10001600`), randomly paired between seeded players. Each match's rating value is offset from the player's base rating (winner up, loser down) so the frontend's per-match rating-change display isn't always 0.
- Matchup Tables, Popularity, and Rank Distribution pages are all populated by aggregating the above (mirrors the real aggregation SQL in `src/pull.rs`).

## Usage

Run everything in the correct order:

```bash
bash scripts/seed/seed-all.sh [player_count]   # default 200
```

Or run scripts individually - **order matters**, each one depends on data from the previous step:

1. `seed-players.sh [count]` - creates `players` / `player_ratings` spread across all 19 rank tiers (Placement through Diamond 3, at least ~10 players per tier), plus the `leaderboard_*` Redis keys (Top / per-character / Legend pages).
2. `seed-games.sh [game_count] [vanq_game_count]` - creates dummy match history in `games`, required by the matchup/popularity scripts below.
3. `seed-matchups.sh` - aggregates `games` into `matchup_*` / `matchup_vanq_*` Redis keys, mirroring the SQL in `src/pull.rs::update_matchups()`.
4. `seed-distribution.sh` - aggregates `player_ratings` into the `distribution_rating` Redis key, mirroring `src/pull.rs::update_distribution()`.
5. `seed-popularity.sh` - aggregates `games` into `popularity_per_player_*` / `popularity_per_character_*` Redis keys, mirroring `src/pull.rs::update_popularity()`.

All scripts are re-runnable: seeded rows/games are deleted and re-inserted each time, so you can just re-run `seed-all.sh` to reshuffle the data.

Re-running a single script in isolation is only safe for iterating on that script itself. `seed-players.sh` deletes and recreates `games` as part of resetting `player_ratings`, so running it alone leaves `games` empty while the `matchup_*`/`popularity_*` Redis keys still hold stale data from the previous `games` - re-run `seed-all.sh` afterward to restore consistency.

## Reset

`reset.sh` recreates the postgres/redis containers (and volumes) from scratch and re-runs migrations. The backend process holds stale DB/Redis connections after this - restart it afterward, then re-run `seed-all.sh` if you want data again.

## Notes

- Seeded player IDs start at `900000000000001`, well outside the real Steam64 ID range, so seeded data never collides with real players.
- `seed-games.sh` also inserts a smaller batch of games with `value_a`/`value_b >= 10001600` (the Vanquisher floor) so `matchup_vanq_*` has data too, not just the regular `matchup_*` keys.