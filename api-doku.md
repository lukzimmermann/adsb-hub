## POST   /api/v1/auth/login
Body: `{"username": "...", "password": "..."}`. Setzt bei Erfolg ein httpOnly-JWT-Cookie (`access_token`).

## POST   /api/v1/auth/logout
Löscht das Cookie.

## GET    /api/v1/auth/me
Gibt den eingeloggten User zurück (401 wenn nicht eingeloggt).

## Swagger (/docs) zum Testen
Oben rechts "Authorize" klicken, Username/Passwort eingeben. Swagger holt sich
intern ein Token von `/api/v1/auth/token` und hängt es an jeden "Try it out"
Request als `Authorization: Bearer ...` an.

## GET    /api/v1/aircraft
Alle aktuellen flugzeuge vom letzten fetch.
Ohne Login: rate-limited auf 1 Request / 60s pro IP. Mit gültigem Cookie: kein Limit.

## GET    /api/v1/aircraft/{registration}/history?limit=100
Letzten entries von einem spezifischen flugzeug.

## GET    /api/v1/aircraft/{registration}/current-flight
Alle Positionen des laufenden Flugs (neueste zuerst), rückwärts von jetzt bis zu einer Lücke
von `FLIGHT_GAP_THRESHOLD_SECONDS`.

## GET    /api/v1/config
Client-Konfiguration: `{"poll_interval_seconds": 15}` (`POLL_INTERVAL_SECONDS`).

## Gruppen (Login erforderlich)
Gruppen gehören dem User, der sie erstellt hat. Jeder User sieht/verwaltet nur seine eigenen.

```text
GET    /api/v1/groups
POST   /api/v1/groups
DELETE /api/v1/groups/{group_name}
GET    /api/v1/groups/{group_name}/aircraft
POST   /api/v1/groups/{group_name}/registrations
DELETE /api/v1/groups/{group_name}/registrations/{registration}
DELETE /api/v1/registrations/{registration}
```

## User anlegen
Kein Signup über die API. Stattdessen CLI im selben Image wie `api`:

```bash
docker compose run --rm api uv run python -m api.cli create-user --username <name>
```
