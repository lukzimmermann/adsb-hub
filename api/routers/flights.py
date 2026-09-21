from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from api.repositories import FlightRepository, GroupRepository
from api.schemas import (AirportResponse, FlightDetailResponse,
                         FlightResponse)
from api.services import FlightService
from shared.models import Airport, Flight

router = APIRouter(prefix="/api/v1/flights", tags=["flights"])
service = FlightService(FlightRepository(), GroupRepository())


def to_airport_response(airport: Airport | None) -> AirportResponse | None:
    return AirportResponse.model_validate(airport) if airport is not None else None


def to_response(flight: Flight) -> FlightResponse:
    return FlightResponse(
        id=flight.id,
        transponder_code=flight.transponder_code,
        registration=flight.registration,
        callsign=flight.callsign,
        aircraft_type=flight.aircraft_type,
        started_at=flight.started_at,
        ended_at=flight.ended_at,
        position_count=flight.position_count,
        departure_airport=to_airport_response(flight.departure_airport),
        arrival_airport=to_airport_response(flight.arrival_airport),
    )


def to_detail_response(flight: Flight) -> FlightDetailResponse:
    return FlightDetailResponse(
        **to_response(flight).model_dump(),
        positions=list(flight.positions),
    )


@router.get("", response_model=list[FlightResponse])
async def list_flights(
    limit: int = Query(default=100, ge=1, le=5000),
    since: datetime | None = Query(default=None),
) -> list[FlightResponse]:
    return [to_response(flight) for flight in await service.list_flights(limit, since)]


@router.get("/{flight_id}", response_model=FlightDetailResponse)
async def get_flight(flight_id: int) -> FlightDetailResponse:
    flight = await service.get_flight(flight_id)
    if flight is None:
        raise HTTPException(status_code=404, detail="Flight not found")
    return to_detail_response(flight)
