## PostgreSQL with PostGIS

Start the database:

```bash
cp .env.example .env
# Adjust POSTGRES_PASSWORD and DATABASE_URL in .env
docker compose up -d
```

The database is available with the credentials from `.env`. For a database
viewer, use host `localhost`, port `5432`, database `adsb`, user `adsb`, and
the password configured in `.env`. Tables and spatial indexes are created with
Alembic:

```bash
uv run alembic upgrade head
```

The complete local database, including all Alembic revision files, can be
recreated:

```bash
./scripts/reset_database.sh
./scripts/setup_database.sh
```

Resetting deletes all stored data. The initial migration is generated
automatically from the SQLAlchemy models.
An alternative connection can be configured with `DATABASE_URL`:

```bash
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/database uv run python -m collector.main
```

## Run the application

```bash
uv run python -m collector.main
```

The application polls the ADS-B API regularly and stores positions in
PostgreSQL/PostGIS. The default interval is 15 seconds and can be configured
with `POLL_INTERVAL_SECONDS`. Press `Ctrl+C` to shut the application down
cleanly.

FastAPI is available at `http://localhost:8000`. Interactive documentation is
available at `http://localhost:8000/docs`.

Important endpoints:

```text
GET    /api/v1/aircraft
GET    /api/v1/aircraft/{registration}/history?limit=100
GET    /api/v1/groups
POST   /api/v1/groups
DELETE /api/v1/groups/{group_name}
GET    /api/v1/groups/{group_name}/aircraft
POST   /api/v1/groups/{group_name}/registrations
DELETE /api/v1/groups/{group_name}/registrations/{registration}
DELETE /api/v1/registrations/{registration}
```

Start the complete stack:

```bash
cp .env.example .env
docker compose up --build
```

## Development

For iterating on the API or the collector, avoid rebuilding the Docker image
on every change. Keep Postgres running in Docker (so the volume, and any test
data in it, is preserved) and run the API and collector directly on the host:

```bash
docker compose stop api collector
```

`DATABASE_URL` in `.env` already points at `localhost:5432`, so both
processes can talk to the containerized database directly:

```bash
uv run uvicorn api.main:app --reload --port 8000
uv run python -m collector.main
```

`--reload` gives the API hot-reload on code changes. The collector is a
simple polling loop, so just stop it with `Ctrl+C` and start it again after a
change.

If you change the SQLAlchemy models, generate and apply a migration before
restarting the collector or API:

```bash
uv run alembic revision --autogenerate -m "describe the change"
uv run alembic upgrade head
```

Once done, resume the full containerized stack with
`docker compose up -d --build api collector`.

Responsibilities are separated into three top-level packages: `collector/`
and `api/` are the two independently runnable apps, `shared/` holds the code
both of them depend on (database access, SQLAlchemy models, and the
aircraft-position repository).

```text
collector/main.py               Collector entry point and resource lifecycle
collector/settings.py           Environment variables and runtime configuration
collector/flight_data.py        ADS-B API client and parsing
collector/service.py            Collector polling workflow
collector/config.py             capture-area config loader (config.yaml)

api/main.py                     FastAPI app setup (ASGI entry point: api.main:app)
api/routers/                    FastAPI routers
api/services/                   Request-handling business workflows
api/repositories/               Database access specific to the API (groups)
api/schemas.py                  API request/response models

shared/database.py              SQLAlchemy engine/session setup
shared/models/                  SQLAlchemy and domain models
shared/repositories/            Aircraft-position database access (read by
                                 the API, written by the collector)
```
