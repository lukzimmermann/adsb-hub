from collections.abc import Sequence

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import selectinload

from shared.database import get_session
from shared.models import AircraftGroup, AircraftPosition, AircraftRegistration
from shared.models.database import group_registrations


class GroupRepository:
    async def get(self, name: str, owner_user_id: int) -> AircraftGroup | None:
        async with get_session() as session:
            return await session.scalar(
                select(AircraftGroup)
                .options(selectinload(AircraftGroup.registrations))
                .where(
                    AircraftGroup.name == name,
                    AircraftGroup.owner_user_id == owner_user_id,
                )
            )

    async def list_groups(self, owner_user_id: int) -> list[AircraftGroup]:
        async with get_session() as session:
            result = await session.scalars(
                select(AircraftGroup)
                .where(AircraftGroup.owner_user_id == owner_user_id)
                .order_by(AircraftGroup.name)
                .options(selectinload(AircraftGroup.registrations))
            )
            return list(result.unique().all())

    async def create(self, name: str, owner_user_id: int) -> AircraftGroup:
        async with get_session() as session:
            group = AircraftGroup(name=name, owner_user_id=owner_user_id)
            session.add(group)
            await session.commit()
            await session.refresh(group)
            return group

    async def delete(self, name: str, owner_user_id: int) -> bool:
        async with get_session() as session:
            group = await session.scalar(
                select(AircraftGroup).where(
                    AircraftGroup.name == name,
                    AircraftGroup.owner_user_id == owner_user_id,
                )
            )
            if group is None:
                return False
            await session.delete(group)
            await session.commit()
            return True

    async def add_registration(
        self, group_name: str, registration: str, owner_user_id: int
    ) -> bool:
        async with get_session() as session:
            group = await session.scalar(
                select(AircraftGroup).where(
                    AircraftGroup.name == group_name,
                    AircraftGroup.owner_user_id == owner_user_id,
                )
            )
            if group is None:
                return False
            aircraft = await session.get(AircraftRegistration, registration)
            if aircraft is None:
                aircraft = AircraftRegistration(registration=registration)
                session.add(aircraft)
                await session.flush()
            await session.execute(
                insert(group_registrations)
                .values(group_id=group.id, registration=registration)
                .on_conflict_do_nothing()
            )
            await session.commit()
            return True

    async def remove_registration(
        self, group_name: str, registration: str, owner_user_id: int
    ) -> bool:
        async with get_session() as session:
            group = await session.scalar(
                select(AircraftGroup).where(
                    AircraftGroup.name == group_name,
                    AircraftGroup.owner_user_id == owner_user_id,
                )
            )
            if group is None:
                return False
            await session.execute(
                delete(group_registrations).where(
                    group_registrations.c.group_id == group.id,
                    group_registrations.c.registration == registration,
                )
            )
            await session.commit()
            return True

    async def delete_registration(self, registration: str, owner_user_id: int) -> bool:
        """Remove a registration from all of the user's groups.

        The shared registration row is only deleted once no group (of any
        user) references it anymore.
        """
        async with get_session() as session:
            aircraft = await session.get(AircraftRegistration, registration)
            if aircraft is None:
                return False

            result = await session.execute(
                delete(group_registrations).where(
                    group_registrations.c.registration == registration,
                    group_registrations.c.group_id.in_(
                        select(AircraftGroup.id).where(
                            AircraftGroup.owner_user_id == owner_user_id
                        )
                    ),
                )
            )
            if result.rowcount == 0:
                await session.rollback()
                return False

            still_referenced = await session.scalar(
                select(group_registrations.c.group_id)
                .where(group_registrations.c.registration == registration)
                .limit(1)
            )
            if still_referenced is None:
                await session.delete(aircraft)
            await session.commit()
            return True

    async def get_current_aircraft(
        self, name: str, owner_user_id: int
    ) -> Sequence[AircraftPosition]:
        async with get_session() as session:
            latest_fetch = select(func.max(AircraftPosition.recorded_at)).scalar_subquery()
            result = await session.scalars(
                select(AircraftPosition)
                .where(AircraftPosition.recorded_at == latest_fetch)
                .join(
                    AircraftRegistration,
                    AircraftRegistration.registration == AircraftPosition.registration,
                )
                .join(
                    group_registrations,
                    group_registrations.c.registration
                    == AircraftRegistration.registration,
                )
                .join(AircraftGroup, AircraftGroup.id == group_registrations.c.group_id)
                .where(
                    AircraftGroup.name == name,
                    AircraftGroup.owner_user_id == owner_user_id,
                )
                .order_by(AircraftPosition.registration)
            )
            return list(result.all())
