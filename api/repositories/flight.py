from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from shared.database import get_session
from shared.models import AircraftGroup, AircraftRegistration, Flight
from shared.models.database import group_registrations


class FlightRepository:
    async def list_flights(self, limit: int) -> Sequence[Flight]:
        async with get_session() as session:
            result = await session.scalars(
                select(Flight)
                .where(Flight.discarded.is_(False))
                .options(
                    selectinload(Flight.departure_airport),
                    selectinload(Flight.arrival_airport),
                )
                .order_by(Flight.started_at.desc())
                .limit(limit)
            )
            return list(result.all())

    async def list_flights_by_group(
        self, name: str, owner_user_id: int, limit: int
    ) -> Sequence[Flight]:
        async with get_session() as session:
            result = await session.scalars(
                select(Flight)
                .join(
                    AircraftRegistration,
                    AircraftRegistration.registration == Flight.registration,
                )
                .join(
                    group_registrations,
                    group_registrations.c.registration == AircraftRegistration.registration,
                )
                .join(AircraftGroup, AircraftGroup.id == group_registrations.c.group_id)
                .where(
                    AircraftGroup.name == name,
                    AircraftGroup.owner_user_id == owner_user_id,
                    Flight.discarded.is_(False),
                )
                .options(
                    selectinload(Flight.departure_airport),
                    selectinload(Flight.arrival_airport),
                )
                .order_by(Flight.started_at.desc())
                .limit(limit)
            )
            return list(result.unique().all())

    async def get_flight(self, flight_id: int) -> Flight | None:
        async with get_session() as session:
            return await session.scalar(
                select(Flight)
                .where(Flight.id == flight_id, Flight.discarded.is_(False))
                .options(
                    selectinload(Flight.positions),
                    selectinload(Flight.departure_airport),
                    selectinload(Flight.arrival_airport),
                )
            )
