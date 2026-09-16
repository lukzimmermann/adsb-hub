import asyncio
import logging

import httpx

from app.config import load_config
from app.database import engine
from app.flight_data import FlightDataRetriever
from app.repositories import AircraftPositionRepository
from app.service import FlightDataService
from app.settings import load_settings

logger = logging.getLogger(__name__)


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


async def main() -> None:
    settings = load_settings()
    config = load_config(settings.config_path)
    timeout = httpx.Timeout(settings.http_timeout_seconds)

    async with httpx.AsyncClient(timeout=timeout) as client:
        flight_data_retriever = FlightDataRetriever(
            config,
            client,
            user_agent=settings.user_agent,
        )
        service = FlightDataService(
            flight_data_retriever,
            AircraftPositionRepository(),
        )
        logger.info("Starting ADS-B collector")
        try:
            await service.run_forever(settings.poll_interval_seconds)
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
