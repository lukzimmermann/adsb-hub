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
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/database uv run python main.py
```

## Run the application

```bash
uv run python main.py
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

Responsibilities are separated:

```text
main.py                         Application entry point and resource lifecycle
app/settings.py                 Environment variables and runtime configuration
app/api/                        FastAPI routers and application setup
app/flight_data.py              ADS-B API client and parsing
app/services/                   Data retrieval and business workflows
app/service.py                  Collector polling workflow
app/repositories/               Database access
app/models/                     API and SQLAlchemy models
```
