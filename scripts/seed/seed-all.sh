#!/usr/bin/env bash
# Runs every seed script in dependency order:
#   seed-players.sh (players/ratings/leaderboard)
#     -> seed-distribution.sh (rank distribution, needs only ratings)
#     -> seed-games.sh (dummy match history)
#         -> seed-matchups.sh (matchup tables, needs games)
#         -> seed-popularity.sh (popularity, needs games)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
N="${1:-200}"
GAME_COUNT="${2:-2000}"
VANQ_GAME_COUNT="${3:-200}"

bash "$SCRIPT_DIR/seed-players.sh" "$N"
bash "$SCRIPT_DIR/seed-distribution.sh"
bash "$SCRIPT_DIR/seed-games.sh" "$GAME_COUNT" "$VANQ_GAME_COUNT"
bash "$SCRIPT_DIR/seed-matchups.sh"
bash "$SCRIPT_DIR/seed-popularity.sh"
