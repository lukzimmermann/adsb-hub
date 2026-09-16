from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AircraftPositionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    transponder_code: str
    message_type: str | None = None
    callsign: str | None = None
    registration: str | None = None
    aircraft_type: str | None = None
    barometric_altitude: str | None = None
    geometric_altitude: int | None = None
    ground_speed_knots: float | None = None
    track: float | None = None
    true_heading: float | None = None
    squawk_code: str | None = None
    emergency_status: str | None = None
    aircraft_category: str | None = None
    navigation_qnh: float | None = None
    selected_altitude: int | None = None
    navigation_modes: list[str] | None = None
    latitude: float | None = None
    longitude: float | None = None
    navigation_integrity_category: int | None = None
    radius_of_containment: int | None = None
    seconds_since_position_update: float | None = None
    adsb_version: int | None = None
    navigation_accuracy_position: int | None = None
    navigation_accuracy_velocity: int | None = None
    source_integrity_level: int | None = None
    source_integrity_level_type: str | None = None
    system_design_assurance: int | None = None
    alert_status: int | None = None
    special_position_identification: int | None = None
    multilateration_fields: list[Any] | None = None
    traffic_information_broadcast_fields: list[Any] | None = None
    message_count: int | None = None
    seconds_since_last_message: float | None = None
    signal_strength: float | None = None
    distance: float | None = None
    direction: float | None = None
    extra_properties: dict[str, Any] | None = None
    recorded_at: datetime


class GroupCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")


class GroupResponse(BaseModel):
    name: str
    registrations: list[str]


class RegistrationRequest(BaseModel):
    registration: str = Field(min_length=1, max_length=32)