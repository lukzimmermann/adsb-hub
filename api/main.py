from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from api.routers.aircraft import router as aircraft_router
from api.routers.airports import router as airports_router
from api.routers.auth import router as auth_router
from api.routers.flights import router as flights_router
from api.routers.groups import router as groups_router
from api.routers.registrations import router as registrations_router
from api.routers.system import router as system_router
from shared.database import engine

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    await engine.dispose()


app = FastAPI(
    title="ADS-B API",
    version="1.0.0",
    lifespan=lifespan,
)
app.include_router(system_router)
app.include_router(auth_router)
app.include_router(aircraft_router)
app.include_router(airports_router)
app.include_router(flights_router)
app.include_router(groups_router)
app.include_router(registrations_router)

if FRONTEND_DIST.is_dir():
    # Serving the SPA from the same origin as the API avoids CORS/cookie
    # SameSite complications entirely (see README). Registered last so it
    # never shadows an API route above.
    app.mount(
        "/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="frontend-assets"
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str) -> FileResponse:
        return FileResponse(FRONTEND_DIST / "index.html")