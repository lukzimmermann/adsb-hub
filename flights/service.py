import asyncio
import itertools
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from shared.models import AircraftPosition
from shared.repositories import FlightRepository

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class FlightCloseStats:
    transponder_codes_processed: int
    closed_flights: int


def _split_into_segments(
    points: list[AircraftPosition], gap: timedelta
) -> list[list[AircraftPosition]]:
    """Split points (ordered by recorded_at ascending) on internal gaps >= gap."""
    segments: list[list[AircraftPosition]] = []
    current = [points[0]]
    for previous, point in itertools.pairwise(points):
        if point.recorded_at - previous.recorded_at >= gap:
            segments.append(current)
            current = [point]
        else:
            current.append(point)
    segments.append(current)
    return segments


class FlightSegmentationService:
    def __init__(
        self,
        repository: FlightRepository,
        gap_threshold_seconds: float,
        airport_match_radius_meters: float,
        min_flight_duration_seconds: float,
    ) -> None:
        self.repository = repository
        self.gap_threshold = timedelta(seconds=gap_threshold_seconds)
        self.airport_match_radius_meters = airport_match_radius_meters
        self.min_flight_duration_seconds = min_flight_duration_seconds

    async def close_once(self) -> FlightCloseStats:
        """Close all flights whose aircraft has gone quiet; return one snapshot."""
        cutoff = datetime.now(timezone.utc) - self.gap_threshold
        transponder_codes = await self.repository.find_stale_transponder_codes(cutoff)

        closed_flights = 0
        for transponder_code in transponder_codes:
            points = await self.repository.get_unclosed_positions(transponder_code)
            if not points:
                continue
            for segment in _split_into_segments(points, self.gap_threshold):
                # Re-check "now" freshly, not the tick-start cutoff: a new
                # position for this code may have arrived between the two
                # queries above, which would otherwise land in the trailing
                # segment and get closed prematurely.
                if segment[-1].recorded_at >= datetime.now(timezone.utc) - self.gap_threshold:
                    continue
                await self.repository.close_segment(
                    transponder_code,
                    segment,
                    self.airport_match_radius_meters,
                    self.min_flight_duration_seconds,
                )
                closed_flights += 1

        return FlightCloseStats(
            transponder_codes_processed=len(transponder_codes),
            closed_flights=closed_flights,
        )

    async def run_forever(self, interval_seconds: float) -> None:
        """Continuously close stale flights until the task is cancelled."""
        while True:
            try:
                stats = await self.close_once()
                logger.info(
                    "Closed stale flights",
                    extra={
                        "transponder_codes_processed": stats.transponder_codes_processed,
                        "closed_flights": stats.closed_flights,
                    },
                )
            except Exception:
                logger.exception("Flight segmentation failed")

            await asyncio.sleep(interval_seconds)
