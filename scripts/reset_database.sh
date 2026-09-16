#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
    set -a
    source .env
    set +a
fi

echo "This removes the PostgreSQL volume and all Alembic revision files."
read -r -p "Type RESET to continue: " confirmation
if [[ "$confirmation" != "RESET" ]]; then
    echo "Aborted."
    exit 1
fi

docker compose down --volumes
find migrations/versions -mindepth 1 -delete

echo "Database volume and Alembic revisions removed."
echo "Run scripts/setup_database.sh to recreate them from the ORM models."