from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(frozen=True)
class Aircraft:
    transponder_code: str | None = None
    message_type: str | None = None
    callsign: str | None = None
    registration: str | None = None
    aircraft_type: str | None = None
    barometric_altitude: int | str | None = None
    geometric_altitude: int | None = None
    ground_speed: float | None = None
    track: float | None = None
    true_heading: float | None = None
    squawk_code: str | None = None
    emergency_status: str | None = None
    aircraft_category: str | None = None
    navigation_qnh: float | None = None
    selected_altitude: int | None = None
    navigation_modes: list[str] = field(default_factory=list)
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
    multilateration_fields: list[Any] = field(default_factory=list)
    traffic_information_broadcast_fields: list[Any] = field(default_factory=list)
    message_count: int | None = None
    seconds_since_last_message: float | None = None
    signal_strength: float | None = None
    distance: float | None = None
    direction: float | None = None
    extra_properties: dict[str, Any] = field(default_factory=dict)

    _FIELD_NAMES: ClassVar[frozenset[str]] = frozenset(
        name for name in __annotations__ if not name.startswith("_")
    )

    def __str__(self) -> str:
        identity = self.callsign.strip() if self.callsign else self.transponder_code
        if self.registration:
            identity = f"{identity or 'Unknown'} ({self.registration})"
        identity = identity or "Unknown aircraft"

        details: list[str] = []
        if self.aircraft_type:
            details.append(self.aircraft_type)
        if self.latitude is not None and self.longitude is not None:
            details.append(f"{self.latitude:.4f}, {self.longitude:.4f}")
        if self.barometric_altitude is not None:
            details.append(f"alt {self.barometric_altitude}")
        if self.ground_speed is not None:
            details.append(f"{self.ground_speed:.0f} kt")

        return f"{identity}: {', '.join(details)}" if details else identity

    @classmethod
    def from_api_data(cls, aircraft_data: dict[str, Any]) -> "Aircraft":
        known_properties = {
            name: value
            for name, value in aircraft_data.items()
            if name in cls._FIELD_NAMES
        }
        known_properties["extra_properties"] = {
            name: value
            for name, value in aircraft_data.items()
            if name not in cls._FIELD_NAMES
        }
        return cls(**known_properties)