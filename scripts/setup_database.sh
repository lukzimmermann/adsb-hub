#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
    set -a
    source .env
    set +a
fi

docker compose up -d --wait

docker compose exec -T postgres psql \
    -U "${POSTGRES_USER:-adsb}" \
    -d "${POSTGRES_DB:-adsb}" \
    -c "CREATE EXTENSION IF NOT EXISTS postgis;"

uv run alembic revision --autogenerate -m "initial schema"
uv run alembic upgrade head

echo "Database recreated from the SQLAlchemy models."