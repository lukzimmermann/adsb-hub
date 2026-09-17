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
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
GET    /api/v1/aircraft
GET    /api/v1/aircraft/{registration}/history?limit=100
GET    /api/v1/flights?limit=100
GET    /api/v1/flights/{flight_id}
GET    /api/v1/groups
POST   /api/v1/groups
DELETE /api/v1/groups/{group_name}
GET    /api/v1/groups/{group_name}/aircraft
GET    /api/v1/groups/{group_name}/flights?limit=100
POST   /api/v1/groups/{group_name}/registrations
DELETE /api/v1/groups/{group_name}/registrations/{registration}
DELETE /api/v1/registrations/{registration}
```

## Flights

A background job (`flight-processor` service, `flights/main.py`) closes out a
`flights` row once an aircraft hasn't sent a new position for
`FLIGHT_GAP_THRESHOLD_SECONDS` (default 300s), grouping its unclosed
`aircraft_positions` by `transponder_code` and linking them via
`aircraft_positions.flight_id`. It runs every `FLIGHT_CLOSE_INTERVAL_SECONDS`
(default 60s). Departure/arrival airports are matched against the `airports`
table (seeded with airports in the ADS-B reception area) by proximity, within
`AIRPORT_MATCH_RADIUS_METERS` (default 5000m) of the flight's first/last
point; both are `null` when no seeded airport is that close (most flights
just transit the reception area).

## Authentication

`GET /api/v1/aircraft` is public but rate-limited to one request per
`AIRCRAFT_RATE_LIMIT_SECONDS` (default 60s) per client IP when not
authenticated. Everything under `/api/v1/groups` and
`/api/v1/registrations`, and an authenticated call to `/api/v1/aircraft`
(no rate limit), require a session.

Log in to get a session cookie:

```bash
curl -c cookies.txt -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "you", "password": "..."}'

curl -b cookies.txt http://localhost:8000/api/v1/groups
```

The session is a JWT in an httpOnly cookie (`access_token`), valid for
`JWT_EXPIRES_MINUTES` (default 24h). Groups belong to the user that created
them; each user only sees and manages their own groups.

To test protected endpoints from the Swagger UI at `/docs`, click
**Authorize** and enter your username/password there — Swagger fetches a
token from `/api/v1/auth/token` (a second, OAuth2-password-flow login
endpoint used only for this) and attaches it as a `Bearer` token to every
subsequent "Try it out" call.

There is no signup endpoint. Users are created via the CLI, using the same
image as the `api` service:

```bash
docker compose run --rm api uv run python -m api.cli create-user --username you
```

It prompts for a password (and confirmation) interactively and hashes it
with bcrypt before storing it.

Set `JWT_SECRET` in `.env` to a long random value (e.g.
`python3 -c "import secrets; print(secrets.token_urlsafe(48))"`) — the
built-in default is only for local development. Set `COOKIE_SECURE=true`
once the API is served over HTTPS.

### Behind a reverse proxy

The per-IP rate limit on `/api/v1/aircraft` uses the connecting client's IP.
Behind a reverse proxy, that would be the proxy's IP for every request, so
uvicorn is configured (via `--proxy-headers`, on by default) to read the real
client IP from `X-Forwarded-For` instead — but only from addresses listed in
`FORWARDED_ALLOW_IPS` (`.env`), since that header is otherwise trivial for a
client to fake. `FORWARDED_ALLOW_IPS=*` (the current default) trusts it from
anyone, which is only safe if the API's port is not reachable directly and
the reverse proxy is the sole entry point. Once the proxy's address is fixed,
narrow `FORWARDED_ALLOW_IPS` to its IP/CIDR, and make sure the `api` service's
port mapping in `docker-compose.yml` isn't published to the public internet
alongside the proxy.

Start the complete stack:

```bash
cp .env.example .env
docker compose up --build
```

## Frontend

`frontend/` is a Vite + React + TypeScript SPA (Leaflet/OpenStreetMap for the
map, Tailwind CSS for styling, TanStack Query for data fetching, React
Router for navigation). It covers login, a live map of currently visible
aircraft (optionally filtered to one of your groups), aircraft detail on
marker click, group management (create/delete, add/remove registrations),
and a flight list with a per-flight detail page showing the route on the
map.

The `api` service builds and serves it directly — `Dockerfile` has a Node
build stage that runs `npm run build`, and `api/main.py` mounts
`frontend/dist` and falls back to `index.html` for any path not matched by
an API route. Frontend and API are therefore always the same origin, which
is why the httpOnly auth cookie works without any CORS configuration.

For frontend-only iteration with hot reload, run the API in Docker and Vite
on the host:

```bash
docker compose up -d postgres migrate api
cd frontend && npm install && npm run dev
```

`vite.config.ts` proxies `/api/*` to `http://localhost:8000`, so the dev
server (`http://localhost:5173`) is still same-origin from the browser's
perspective — login works exactly as in the built version. Tooling
versions are pinned to ones that run on Node.js 18+ on the host (the
Docker build stage uses `node:20-slim` regardless).

## Development

For iterating on the API, the collector, or the flight processor, avoid
rebuilding the Docker image on every change. Keep Postgres running in Docker
(so the volume, and any test data in it, is preserved) and run the
processes directly on the host:

```bash
docker compose stop api collector flight-processor
```

`DATABASE_URL` in `.env` already points at `localhost:5432`, so all three
processes can talk to the containerized database directly:

```bash
uv run uvicorn api.main:app --reload --port 8000
uv run python -m collector.main
uv run python -m flights.main
```

`--reload` gives the API hot-reload on code changes. The collector and
flight processor are simple polling loops, so just stop them with `Ctrl+C`
and start them again after a change.

If you change the SQLAlchemy models, generate and apply a migration before
restarting the collector, flight processor, or API:

```bash
uv run alembic revision --autogenerate -m "describe the change"
uv run alembic upgrade head
```

Once done, resume the full containerized stack with
`docker compose up -d --build api collector flight-processor`.

Responsibilities are separated into four top-level packages: `collector/`,
`flights/`, and `api/` are the three independently runnable apps, `shared/`
holds the code they depend on (database access, SQLAlchemy models, and the
aircraft-position/flight repositories).

```text
collector/main.py               Collector entry point and resource lifecycle
collector/settings.py           Environment variables and runtime configuration
collector/flight_data.py        ADS-B API client and parsing
collector/service.py            Collector polling workflow
collector/config.py             capture-area config loader (config.yaml)

flights/main.py                 Flight processor entry point and resource lifecycle
flights/settings.py             Environment variables and runtime configuration
flights/service.py              Flight segmentation workflow (gap detection, splitting)

api/main.py                     FastAPI app setup (ASGI entry point: api.main:app)
api/settings.py                 Auth/rate-limit environment variables
api/auth.py                     Password hashing, JWT issuing/verification
api/rate_limit.py               In-memory rate limiter for anonymous requests
api/cli.py                      User-management CLI (create-user)
api/routers/                    FastAPI routers
api/services/                   Request-handling business workflows
api/repositories/               Database access specific to the API (users, groups, flights)
api/schemas.py                  API request/response models

shared/database.py              SQLAlchemy engine/session setup
shared/models/                  SQLAlchemy and domain models
shared/repositories/            Aircraft-position access (read by the API,
                                 written by the collector) and flight access
                                 (written by the flight processor)
```
