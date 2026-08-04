#!/usr/bin/env bash
# Full reset: recreate postgres/redis containers (and volumes) from scratch, re-run migrations.
# `down -v` is destructive - it drops the pgdata volume unconditionally, no confirmation.
# The backend process holds stale DB/Redis connections after this runs - restart it afterward.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE="docker compose -p puddle-farm-dev -f $REPO_ROOT/docker/docker-compose.dev.yml"

$COMPOSE down -v
$COMPOSE up -d postgres redis

echo "Waiting for Postgres to accept connections..."
for i in $(seq 1 30); do
  $COMPOSE exec -T postgres pg_isready -U user > /dev/null 2>&1 && break
  if [ "$i" -eq 30 ]; then
    echo "Postgres did not become ready after 30s." >&2
    exit 1
  fi
  sleep 1
done

$COMPOSE run --rm diesel migration run

echo "Reset complete. Restart the backend process (stale DB/Redis connections)."
