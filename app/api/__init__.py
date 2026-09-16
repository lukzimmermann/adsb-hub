from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from app.api.aircraft import router as aircraft_router
from app.api.groups import router as groups_router
from app.api.registrations import router as registrations_router
from app.api.system import router as system_router
from app.database import engine


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
app.include_router(aircraft_router)
app.include_router(groups_router)
app.include_router(registrations_router)