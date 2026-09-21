from fastapi import APIRouter

from api.schemas import ConfigResponse
from api.settings import load_settings

router = APIRouter(tags=["system"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/api/v1/config", response_model=ConfigResponse)
async def get_config() -> ConfigResponse:
    return ConfigResponse(poll_interval_seconds=load_settings().poll_interval_seconds)
