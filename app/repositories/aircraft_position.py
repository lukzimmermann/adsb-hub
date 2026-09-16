from collections.abc import Sequence

from sqlalchemy import func, select

from app.database import get_session
from app.models import Aircraft, AircraftPosition


class AircraftPositionRepository:
    @staticmethod
    def _latest_position_ids():
        return select(func.max(AircraftPosition.id)).group_by(
            AircraftPosition.transponder_code
        )

    async def get_current(self) -> list[AircraftPosition]:
        async with get_session() as session:
            result = await session.scalars(
                select(AircraftPosition)
                .where(AircraftPosition.id.in_(self._latest_position_ids()))
                .order_by(AircraftPosition.callsign, AircraftPosition.registration)
            )
            return list(result.all())

    async def get_history(
        self, registration: str, limit: int
    ) -> list[AircraftPosition]:
        async with get_session() as session:
            result = await session.scalars(
                select(AircraftPosition)
                .where(AircraftPosition.registration == registration)
                .order_by(AircraftPosition.recorded_at.desc())
                .limit(limit)
            )
            return list(result.all())

    async def save_all(self, aircraft_list: Sequence[Aircraft]) -> int:
        """Store all aircraft with a valid position and return the row count."""
        database_positions = [
            AircraftPosition.from_aircraft(aircraft)
            for aircraft in aircraft_list
            if aircraft.latitude is not None
            and aircraft.longitude is not None
            and aircraft.transponder_code is not None
        ]
        async with get_session() as session:
            async with session.begin():
                session.add_all(database_positions)

        return len(database_positions)