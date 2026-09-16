import asyncio
import logging

from collector.flight_data import FlightDataRetriever
from shared.repositories import AircraftPositionRepository

logger = logging.getLogger(__name__)


class FlightDataService:
    def __init__(
        self,
        flight_data_retriever: FlightDataRetriever,
        aircraft_position_repository: AircraftPositionRepository,
    ) -> None:
        self.flight_data_retriever = flight_data_retriever
        self.aircraft_position_repository = aircraft_position_repository

    async def collect_once(self) -> tuple[int, int]:
        """Fetch and persist one snapshot; return fetched and saved counts."""
        aircraft = await self.flight_data_retriever.get_flight_data()
        saved_count = await self.aircraft_position_repository.save_all(aircraft)
        return len(aircraft), saved_count

    async def run_forever(self, interval_seconds: float) -> None:
        """Continuously collect snapshots until the task is cancelled."""
        while True:
            try:
                fetched_count, saved_count = await self.collect_once()
                logger.info(
                    "Collected flight snapshot",
                    extra={
                        "fetched_count": fetched_count,
                        "saved_count": saved_count,
                    },
                )
            except Exception:
                logger.exception("Flight data collection failed")

            await asyncio.sleep(interval_seconds)