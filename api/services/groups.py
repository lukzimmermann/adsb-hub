from collections.abc import Sequence

from sqlalchemy.exc import IntegrityError

from api.repositories import GroupRepository
from shared.models import AircraftGroup, AircraftPosition


class GroupNotFoundError(Exception):
    pass


class GroupAlreadyExistsError(Exception):
    pass


class RegistrationNotFoundError(Exception):
    pass


class GroupService:
    def __init__(self, repository: GroupRepository) -> None:
        self.repository = repository

    async def list(self) -> list[AircraftGroup]:
        return await self.repository.list_groups()

    async def create(self, name: str) -> AircraftGroup:
        try:
            return await self.repository.create(name)
        except IntegrityError as error:
            raise GroupAlreadyExistsError(name) from error

    async def delete(self, name: str) -> None:
        if not await self.repository.delete(name):
            raise GroupNotFoundError(name)

    async def current_aircraft(self, name: str) -> Sequence[AircraftPosition]:
        await self._get(name)
        return await self.repository.get_current_aircraft(name)

    async def add_registration(self, name: str, registration: str) -> AircraftGroup:
        if not await self.repository.add_registration(name, registration):
            raise GroupNotFoundError(name)
        return await self._get(name)

    async def remove_registration(self, name: str, registration: str) -> None:
        if not await self.repository.remove_registration(name, registration):
            raise GroupNotFoundError(name)

    async def delete_registration(self, registration: str) -> None:
        if not await self.repository.delete_registration(registration):
            raise RegistrationNotFoundError(registration)

    async def _get(self, name: str) -> AircraftGroup:
        group = await self.repository.get(name)
        if group is None:
            raise GroupNotFoundError(name)
        return group