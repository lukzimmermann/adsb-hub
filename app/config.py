from pathlib import Path
from typing import Any

import yaml

from app.models import Area, Center, Config


def load_config(path: str | Path = "config.yaml") -> Config:
    """Load and validate the ADS-B capture area from a YAML file."""
    config_path = Path(path)
    with config_path.open(encoding="utf-8") as config_file:
        data: Any = yaml.safe_load(config_file)

    try:
        area = data["area"]
        center = area["center"]
        latitude = float(center["latitude"])
        longitude = float(center["longitude"])
        radius_km = float(area["radius_km"])
    except (KeyError, TypeError, ValueError) as error:
        raise ValueError(f"Invalid configuration in {config_path}") from error

    if not -90 <= latitude <= 90:
        raise ValueError("area.center.latitude must be between -90 and 90")
    if not -180 <= longitude <= 180:
        raise ValueError("area.center.longitude must be between -180 and 180")
    if radius_km <= 0:
        raise ValueError("area.radius_km must be greater than 0")

    return Config(
        area=Area(
            center=Center(latitude=latitude, longitude=longitude),
            radius_km=radius_km,
        )
    )