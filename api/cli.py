import argparse
import asyncio
import getpass
import sys

from api.auth import hash_password
from api.repositories import UserRepository
from shared.database import engine


async def create_user(username: str) -> None:
    repository = UserRepository()
    if await repository.get_by_username(username) is not None:
        print(f"User '{username}' already exists", file=sys.stderr)
        raise SystemExit(1)

    password = getpass.getpass("Password: ")
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Passwords do not match", file=sys.stderr)
        raise SystemExit(1)
    if not password:
        print("Password must not be empty", file=sys.stderr)
        raise SystemExit(1)

    await repository.create(username, hash_password(password))
    print(f"User '{username}' created")


def main() -> None:
    parser = argparse.ArgumentParser(prog="api.cli")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_user_parser = subparsers.add_parser("create-user", help="Create a new user")
    create_user_parser.add_argument("--username", required=True)

    args = parser.parse_args()

    async def run() -> None:
        try:
            if args.command == "create-user":
                await create_user(args.username)
        finally:
            await engine.dispose()

    asyncio.run(run())


if __name__ == "__main__":
    main()
