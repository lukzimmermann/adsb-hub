import asyncio
import logging

from flights.service import FlightSegmentationService
from flights.settings import load_settings
from shared.database import engine
from shared.repositories import FlightRepository

logger = logging.getLogger(__name__)


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


async def main() -> None:
    configure_logging()
    settings = load_settings()

    service = FlightSegmentationService(
        FlightRepository(),
        settings.gap_threshold_seconds,
        settings.airport_match_radius_meters,
        settings.min_flight_duration_seconds,
    )
    logger.info("Starting ADS-B flight segmentation")
    try:
        await service.run_forever(settings.interval_seconds)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
