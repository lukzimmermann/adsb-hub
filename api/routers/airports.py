from fastapi import APIRouter, Depends, HTTPException, status

from api.auth import AuthenticatedUser, get_current_user
from api.repositories import AirportRepository
from api.schemas import (AirportResponse, AirportWriteRequest,
                         RecalculateFlightsResponse)
from api.services import (AirportAlreadyExistsError, AirportNotFoundError,
                          AirportService)
from api.settings import load_settings
from shared.repositories import FlightRepository

router = APIRouter(prefix="/api/v1/airports", tags=["airports"])
service = AirportService(AirportRepository(), FlightRepository())
settings = load_settings()


@router.get("", response_model=list[AirportResponse])
async def list_airports() -> list[AirportResponse]:
    return [AirportResponse.model_validate(a) for a in await service.list()]


@router.post("", response_model=AirportResponse, status_code=status.HTTP_201_CREATED)
async def create_airport(
    request: AirportWriteRequest, user: AuthenticatedUser = Depends(get_current_user)
) -> AirportResponse:
    try:
        airport = await service.create(
            request.name,
            request.latitude,
            request.longitude,
            request.icao_code,
            request.iata_code,
            request.country_code,
        )
    except AirportAlreadyExistsError as error:
        raise HTTPException(status_code=409, detail="ICAO code already in use") from error
    return AirportResponse.model_validate(airport)


@router.put("/{airport_id}", response_model=AirportResponse)
async def update_airport(
    airport_id: int,
    request: AirportWriteRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> AirportResponse:
    try:
        airport = await service.update(
            airport_id,
            request.name,
            request.latitude,
            request.longitude,
            request.icao_code,
            request.iata_code,
            request.country_code,
        )
    except AirportAlreadyExistsError as error:
        raise HTTPException(status_code=409, detail="ICAO code already in use") from error
    except AirportNotFoundError as error:
        raise HTTPException(status_code=404, detail="Airport not found") from error
    return AirportResponse.model_validate(airport)


@router.delete("/{airport_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_airport(
    airport_id: int, user: AuthenticatedUser = Depends(get_current_user)
) -> None:
    try:
        await service.delete(airport_id)
    except AirportNotFoundError as error:
        raise HTTPException(status_code=404, detail="Airport not found") from error


@router.post("/recalculate-flights", response_model=RecalculateFlightsResponse)
async def recalculate_flights(
    user: AuthenticatedUser = Depends(get_current_user),
) -> RecalculateFlightsResponse:
    updated = await service.recalculate_flights(settings.airport_match_radius_meters)
    return RecalculateFlightsResponse(updated_flights=updated)
