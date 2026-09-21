from fastapi import APIRouter, Depends, Query, Request

from api.auth import AuthenticatedUser, get_optional_user
from api.rate_limit import FixedWindowRateLimiter, client_key
from api.schemas import AircraftPositionResponse
from api.services import AircraftService
from api.settings import load_settings
from shared.repositories import AircraftPositionRepository

router = APIRouter(prefix="/api/v1/aircraft", tags=["aircraft"])
service = AircraftService(AircraftPositionRepository())
settings = load_settings()
rate_limiter = FixedWindowRateLimiter(settings.aircraft_rate_limit_seconds)


@router.get("", response_model=list[AircraftPositionResponse])
async def get_current_aircraft(
    request: Request,
    user: AuthenticatedUser | None = Depends(get_optional_user),
) -> list[AircraftPositionResponse]:
    if user is None:
        rate_limiter.check(client_key(request))
    return await service.get_current()


@router.get("/{registration}/current-flight", response_model=list[AircraftPositionResponse])
async def get_aircraft_current_flight(registration: str) -> list[AircraftPositionResponse]:
    return await service.get_current_flight(registration, settings.flight_gap_threshold_seconds)


@router.get("/{registration}/history", response_model=list[AircraftPositionResponse])
async def get_aircraft_history(
    registration: str,
    limit: int = Query(default=100, ge=1, le=5000),
) -> list[AircraftPositionResponse]:
    return await service.get_history(registration, limit)