import argparse
import asyncio
import getpass
import sys

from api.auth import hash_password
from api.repositories import UserRepository
from flights.settings import load_settings
from shared.database import engine
from shared.repositories import FlightRepository


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


async def discard_short_or_no_altitude_flights(min_duration_seconds: float | None) -> None:
    threshold = (
        min_duration_seconds
        if min_duration_seconds is not None
        else load_settings().min_flight_duration_seconds
    )
    repository = FlightRepository()
    count = await repository.discard_short_or_no_altitude_flights(threshold)
    print(f"Discarded {count} flight(s)")


def main() -> None:
    parser = argparse.ArgumentParser(prog="api.cli")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_user_parser = subparsers.add_parser("create-user", help="Create a new user")
    create_user_parser.add_argument("--username", required=True)

    discard_parser = subparsers.add_parser(
        "discard-short-or-no-altitude-flights",
        help="Retroactively discard existing flights that are too short or have no altitude data",
    )
    discard_parser.add_argument(
        "--min-duration-seconds",
        type=float,
        default=None,
        help="Overrides MIN_FLIGHT_DURATION_SECONDS from the environment",
    )

    args = parser.parse_args()

    async def run() -> None:
        try:
            if args.command == "create-user":
                await create_user(args.username)
            elif args.command == "discard-short-or-no-altitude-flights":
                await discard_short_or_no_altitude_flights(args.min_duration_seconds)
        finally:
            await engine.dispose()

    asyncio.run(run())


if __name__ == "__main__":
    main()
