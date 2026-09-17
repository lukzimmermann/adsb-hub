from collections.abc import Sequence
from datetime import datetime, timedelta

from geoalchemy2 import Geography
from geoalchemy2.elements import WKTElement
from sqlalchemy import cast, exists, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_session
from shared.models import AircraftPosition, Airport, Flight


def _point(latitude: float, longitude: float) -> Geography:
    return cast(WKTElement(f"POINT({longitude} {latitude})", srid=4326), Geography)


def _most_recent_non_null(points: Sequence[AircraftPosition], attr: str) -> str | None:
    for point in reversed(points):
        value = getattr(point, attr)
        if value is not None:
            return value
    return None


class FlightRepository:
    async def find_stale_transponder_codes(self, cutoff: datetime) -> list[str]:
        """Transponder codes whose unclosed positions are all older than cutoff.

        Served entirely by aircraft_positions_unclosed_idx regardless of the
        total table size: only rows with flight_id IS NULL are ever touched.
        """
        async with get_session() as session:
            result = await session.execute(
                select(AircraftPosition.transponder_code)
                .where(AircraftPosition.flight_id.is_(None))
                .group_by(AircraftPosition.transponder_code)
                .having(func.max(AircraftPosition.recorded_at) < cutoff)
            )
            return list(result.scalars().all())

    async def get_unclosed_positions(self, transponder_code: str) -> list[AircraftPosition]:
        async with get_session() as session:
            result = await session.scalars(
                select(AircraftPosition)
                .where(
                    AircraftPosition.transponder_code == transponder_code,
                    AircraftPosition.flight_id.is_(None),
                )
                .order_by(AircraftPosition.recorded_at)
            )
            return list(result.all())

    async def close_segment(
        self,
        transponder_code: str,
        points: Sequence[AircraftPosition],
        airport_match_radius_meters: float,
        min_duration_seconds: float,
    ) -> Flight:
        """Create a flight for points and tag them with it, in one transaction.

        A crash between creating the flight and tagging its positions is not
        possible: both happen in the same transaction. A crash before this
        transaction starts leaves nothing changed. Either way, a re-run is
        idempotent because already-tagged positions drop out of the
        "flight_id IS NULL" working set.

        Flights shorter than min_duration_seconds, or with no altitude data
        on any point, are still created and their positions still tagged
        (to preserve that idempotency), but marked discarded so they're
        excluded from display queries.
        """
        first, last = points[0], points[-1]
        duration = last.recorded_at - first.recorded_at
        has_altitude = any(
            point.altitude_m is not None
            or point.geometric_altitude is not None
            or point.barometric_altitude is not None
            for point in points
        )
        discarded = duration < timedelta(seconds=min_duration_seconds) or not has_altitude
        async with get_session() as session:
            async with session.begin():
                departure_airport_id = await self._match_airport(
                    session, first.latitude, first.longitude, airport_match_radius_meters
                )
                arrival_airport_id = await self._match_airport(
                    session, last.latitude, last.longitude, airport_match_radius_meters
                )
                flight = Flight(
                    transponder_code=transponder_code,
                    registration=_most_recent_non_null(points, "registration"),
                    callsign=_most_recent_non_null(points, "callsign"),
                    aircraft_type=_most_recent_non_null(points, "aircraft_type"),
                    started_at=first.recorded_at,
                    ended_at=last.recorded_at,
                    position_count=len(points),
                    departure_airport_id=departure_airport_id,
                    arrival_airport_id=arrival_airport_id,
                    discarded=discarded,
                )
                session.add(flight)
                await session.flush()
                await session.execute(
                    update(AircraftPosition)
                    .where(AircraftPosition.id.in_([point.id for point in points]))
                    .values(flight_id=flight.id)
                )
            await session.refresh(flight)
            return flight

    async def discard_short_or_no_altitude_flights(self, min_duration_seconds: float) -> int:
        """Retroactively mark existing flights as discarded, mirroring the
        check close_segment applies to new ones: too short, or no altitude
        data on any of their positions. Positions are left tagged as-is.
        """
        async with get_session() as session:
            async with session.begin():
                result = await session.execute(
                    update(Flight)
                    .where(
                        Flight.discarded.is_(False),
                        or_(
                            Flight.ended_at - Flight.started_at
                            < timedelta(seconds=min_duration_seconds),
                            ~exists(
                                select(1).where(
                                    AircraftPosition.flight_id == Flight.id,
                                    or_(
                                        AircraftPosition.altitude_m.is_not(None),
                                        AircraftPosition.geometric_altitude.is_not(None),
                                        AircraftPosition.barometric_altitude.is_not(None),
                                    ),
                                )
                            ),
                        ),
                    )
                    .values(discarded=True)
                )
                return result.rowcount

    async def recalculate_airports(self, radius_meters: float) -> int:
        """Re-match departure/arrival airports for every existing flight.

        Needed after airports are added/edited/removed, since flights
        already closed keep whatever departure_airport_id/arrival_airport_id
        was matched at close time. One transaction for the whole batch:
        either every flight's match reflects the current airports table, or
        (on failure) none do.

        Fetches every flight's first/last point in two DISTINCT ON queries
        (not one SELECT per flight) — served by aircraft_positions_flight_id_idx
        instead of a per-flight sequential scan, which is what made an
        earlier version of this method effectively unusable once
        aircraft_positions grew past a couple hundred thousand rows.
        """
        async with get_session() as session:
            async with session.begin():
                first_points = await session.execute(
                    select(
                        AircraftPosition.flight_id,
                        AircraftPosition.latitude,
                        AircraftPosition.longitude,
                    )
                    .where(AircraftPosition.flight_id.is_not(None))
                    .distinct(AircraftPosition.flight_id)
                    .order_by(AircraftPosition.flight_id, AircraftPosition.recorded_at.asc())
                )
                first_by_flight = {row.flight_id: (row.latitude, row.longitude) for row in first_points}

                last_points = await session.execute(
                    select(
                        AircraftPosition.flight_id,
                        AircraftPosition.latitude,
                        AircraftPosition.longitude,
                    )
                    .where(AircraftPosition.flight_id.is_not(None))
                    .distinct(AircraftPosition.flight_id)
                    .order_by(AircraftPosition.flight_id, AircraftPosition.recorded_at.desc())
                )
                last_by_flight = {row.flight_id: (row.latitude, row.longitude) for row in last_points}

                updated = 0
                for flight_id, (first_lat, first_lon) in first_by_flight.items():
                    last_lat, last_lon = last_by_flight[flight_id]
                    departure_airport_id = await self._match_airport(
                        session, first_lat, first_lon, radius_meters
                    )
                    arrival_airport_id = await self._match_airport(
                        session, last_lat, last_lon, radius_meters
                    )
                    await session.execute(
                        update(Flight)
                        .where(Flight.id == flight_id)
                        .values(
                            departure_airport_id=departure_airport_id,
                            arrival_airport_id=arrival_airport_id,
                        )
                    )
                    updated += 1
            return updated

    async def _match_airport(
        self,
        session: AsyncSession,
        latitude: float | None,
        longitude: float | None,
        radius_meters: float,
    ) -> int | None:
        if latitude is None or longitude is None:
            return None
        point = _point(latitude, longitude)
        result = await session.execute(
            select(Airport.id)
            .where(func.ST_DWithin(Airport.position, point, radius_meters))
            .order_by(func.ST_Distance(Airport.position, point))
            .limit(1)
        )
        return result.scalar()
