from fastapi import APIRouter, Query

from api.schemas import AircraftPositionResponse
from api.services import AircraftService
from shared.repositories import AircraftPositionRepository

router = APIRouter(prefix="/api/v1/aircraft", tags=["aircraft"])
service = AircraftService(AircraftPositionRepository())


@router.get("", response_model=list[AircraftPositionResponse])
async def get_current_aircraft() -> list[AircraftPositionResponse]:
    return await service.get_current()


@router.get("/{registration}/history", response_model=list[AircraftPositionResponse])
async def get_aircraft_history(
    registration: str,
    limit: int = Query(default=100, ge=1, le=5000),
) -> list[AircraftPositionResponse]:
    return await service.get_history(registration, limit)