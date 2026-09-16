from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from api.routers.aircraft import router as aircraft_router
from api.routers.auth import router as auth_router
from api.routers.groups import router as groups_router
from api.routers.registrations import router as registrations_router
from api.routers.system import router as system_router
from shared.database import engine


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
app.include_router(groups_router)
app.include_router(registrations_router)