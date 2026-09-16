from shared.models import AircraftPosition
from shared.repositories import AircraftPositionRepository


class AircraftService:
    def __init__(self, repository: AircraftPositionRepository) -> None:
        self.repository = repository

    async def get_current(self) -> list[AircraftPosition]:
        return await self.repository.get_current()

    async def get_history(self, registration: str, limit: int) -> list[AircraftPosition]:
        return await self.repository.get_history(registration, limit)