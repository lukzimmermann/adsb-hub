from collections.abc import Sequence

from sqlalchemy.exc import IntegrityError

from api.repositories import AirportRepository
from shared.models import Airport
from shared.repositories import FlightRepository


class AirportNotFoundError(Exception):
    pass


class AirportAlreadyExistsError(Exception):
    pass


class AirportService:
    def __init__(self, repository: AirportRepository, flight_repository: FlightRepository) -> None:
        self.repository = repository
        self.flight_repository = flight_repository

    async def list(self) -> Sequence[Airport]:
        return await self.repository.list_airports()

    async def create(
        self,
        name: str,
        latitude: float,
        longitude: float,
        icao_code: str | None,
        iata_code: str | None,
        country_code: str | None,
    ) -> Airport:
        try:
            return await self.repository.create(
                name, latitude, longitude, icao_code, iata_code, country_code
            )
        except IntegrityError as error:
            raise AirportAlreadyExistsError(icao_code) from error

    async def update(
        self,
        airport_id: int,
        name: str,
        latitude: float,
        longitude: float,
        icao_code: str | None,
        iata_code: str | None,
        country_code: str | None,
    ) -> Airport:
        try:
            airport = await self.repository.update(
                airport_id, name, latitude, longitude, icao_code, iata_code, country_code
            )
        except IntegrityError as error:
            raise AirportAlreadyExistsError(icao_code) from error
        if airport is None:
            raise AirportNotFoundError(airport_id)
        return airport

    async def delete(self, airport_id: int) -> None:
        if not await self.repository.delete(airport_id):
            raise AirportNotFoundError(airport_id)

    async def recalculate_flights(self, radius_meters: float) -> int:
        return await self.flight_repository.recalculate_airports(radius_meters)
