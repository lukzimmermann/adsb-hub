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
    config_path: str = os.getenv("CONFIG_PATH", "config.yaml")
    poll_interval_seconds: float = _positive_float("POLL_INTERVAL_SECONDS", 15)
    http_timeout_seconds: float = _positive_float("HTTP_TIMEOUT_SECONDS", 10)
    user_agent: str = os.getenv("USER_AGENT", "adsb/0.1.0")


def load_settings() -> Settings:
    return Settings()