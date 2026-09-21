import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret-change-me")
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = int(os.getenv("JWT_EXPIRES_MINUTES", "1440"))
    cookie_secure: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    aircraft_rate_limit_seconds: float = float(
        os.getenv("AIRCRAFT_RATE_LIMIT_SECONDS", "60")
    )
    # Same env vars/defaults as the collector and flight processor, so the UI
    # polls at the collector's cadence and the live trail of a selected
    # aircraft uses the same gap rule as flight segmentation.
    poll_interval_seconds: float = float(os.getenv("POLL_INTERVAL_SECONDS", "15"))
    flight_gap_threshold_seconds: float = float(
        os.getenv("FLIGHT_GAP_THRESHOLD_SECONDS", "300")
    )
    # Same default/env var as flights/settings.py, so a manual "recalculate
    # flights" (after editing airports) matches what the background job uses.
    airport_match_radius_meters: float = float(
        os.getenv("AIRPORT_MATCH_RADIUS_METERS", "5000")
    )


def load_settings() -> Settings:
    return Settings()
