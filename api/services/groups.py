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

    async def list(self, owner_user_id: int) -> list[AircraftGroup]:
        return await self.repository.list_groups(owner_user_id)

    async def create(self, name: str, owner_user_id: int) -> AircraftGroup:
        try:
            return await self.repository.create(name, owner_user_id)
        except IntegrityError as error:
            raise GroupAlreadyExistsError(name) from error

    async def delete(self, name: str, owner_user_id: int) -> None:
        if not await self.repository.delete(name, owner_user_id):
            raise GroupNotFoundError(name)

    async def current_aircraft(
        self, name: str, owner_user_id: int
    ) -> Sequence[AircraftPosition]:
        await self._get(name, owner_user_id)
        return await self.repository.get_current_aircraft(name, owner_user_id)

    async def add_registration(
        self, name: str, registration: str, owner_user_id: int
    ) -> AircraftGroup:
        if not await self.repository.add_registration(name, registration, owner_user_id):
            raise GroupNotFoundError(name)
        return await self._get(name, owner_user_id)

    async def remove_registration(
        self, name: str, registration: str, owner_user_id: int
    ) -> None:
        if not await self.repository.remove_registration(name, registration, owner_user_id):
            raise GroupNotFoundError(name)

    async def delete_registration(self, registration: str, owner_user_id: int) -> None:
        if not await self.repository.delete_registration(registration, owner_user_id):
            raise RegistrationNotFoundError(registration)

    async def _get(self, name: str, owner_user_id: int) -> AircraftGroup:
        group = await self.repository.get(name, owner_user_id)
        if group is None:
            raise GroupNotFoundError(name)
        return group
