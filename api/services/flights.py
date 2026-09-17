from collections.abc import Sequence

from api.repositories import FlightRepository, GroupRepository
from api.services.groups import GroupNotFoundError
from shared.models import Flight


class FlightService:
    def __init__(self, repository: FlightRepository, group_repository: GroupRepository) -> None:
        self.repository = repository
        self.group_repository = group_repository

    async def list_flights(self, limit: int) -> Sequence[Flight]:
        return await self.repository.list_flights(limit)

    async def get_flight(self, flight_id: int) -> Flight | None:
        return await self.repository.get_flight(flight_id)

    async def list_by_group(
        self, group_name: str, owner_user_id: int, limit: int
    ) -> Sequence[Flight]:
        if await self.group_repository.get(group_name, owner_user_id) is None:
            raise GroupNotFoundError(group_name)
        return await self.repository.list_flights_by_group(group_name, owner_user_id, limit)
