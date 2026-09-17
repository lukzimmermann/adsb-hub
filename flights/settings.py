import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _positive_float(name: str, default: float) -> float:
    value = float(os.getenv(name, default))
    if value <= 0:
        raise ValueError(f"{name} must be greater than 0")
    return value


@dataclass(frozen=True)
class Settings:
    interval_seconds: float = _positive_float("FLIGHT_CLOSE_INTERVAL_SECONDS", 60)
    gap_threshold_seconds: float = _positive_float("FLIGHT_GAP_THRESHOLD_SECONDS", 300)
    airport_match_radius_meters: float = _positive_float("AIRPORT_MATCH_RADIUS_METERS", 5000)
    min_flight_duration_seconds: float = _positive_float("MIN_FLIGHT_DURATION_SECONDS", 300)


def load_settings() -> Settings:
    return Settings()
