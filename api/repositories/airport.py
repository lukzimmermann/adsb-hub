from collections.abc import Sequence

from geoalchemy2.elements import WKTElement
from sqlalchemy import select

from shared.database import get_session
from shared.models import Airport


class AirportRepository:
    async def list_airports(self) -> Sequence[Airport]:
        async with get_session() as session:
            result = await session.scalars(select(Airport).order_by(Airport.name))
            return list(result.all())

    async def get(self, airport_id: int) -> Airport | None:
        async with get_session() as session:
            return await session.get(Airport, airport_id)

    async def create(
        self,
        name: str,
        latitude: float,
        longitude: float,
        icao_code: str | None,
        iata_code: str | None,
        country_code: str | None,
    ) -> Airport:
        async with get_session() as session:
            airport = Airport(
                name=name,
                latitude=latitude,
                longitude=longitude,
                icao_code=icao_code,
                iata_code=iata_code,
                country_code=country_code,
                position=WKTElement(f"POINT({longitude} {latitude})", srid=4326),
            )
            session.add(airport)
            await session.commit()
            await session.refresh(airport)
            return airport

    async def update(
        self,
        airport_id: int,
        name: str,
        latitude: float,
        longitude: float,
        icao_code: str | None,
        iata_code: str | None,
        country_code: str | None,
    ) -> Airport | None:
        async with get_session() as session:
            airport = await session.get(Airport, airport_id)
            if airport is None:
                return None
            airport.name = name
            airport.latitude = latitude
            airport.longitude = longitude
            airport.icao_code = icao_code
            airport.iata_code = iata_code
            airport.country_code = country_code
            airport.position = WKTElement(f"POINT({longitude} {latitude})", srid=4326)
            await session.commit()
            await session.refresh(airport)
            return airport

    async def delete(self, airport_id: int) -> bool:
        async with get_session() as session:
            airport = await session.get(Airport, airport_id)
            if airport is None:
                return False
            await session.delete(airport)
            await session.commit()
            return True
