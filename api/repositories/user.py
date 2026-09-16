from sqlalchemy import select

from shared.database import get_session
from shared.models import User


class UserRepository:
    async def get_by_username(self, username: str) -> User | None:
        async with get_session() as session:
            return await session.scalar(select(User).where(User.username == username))

    async def create(self, username: str, password_hash: str) -> User:
        async with get_session() as session:
            user = User(username=username, password_hash=password_hash)
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user
