from dataclasses import dataclass


@dataclass(frozen=True)
class Center:
    latitude: float
    longitude: float


@dataclass(frozen=True)
class Area:
    center: Center
    radius_km: float


@dataclass(frozen=True)
class Config:
    area: Area