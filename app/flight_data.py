from typing import Any

import httpx

from app.models import Aircraft, Config

KILOMETERS_PER_NAUTICAL_MILE = 1.852
API_BASE_URL = "https://api.adsb.lol/v2/"

AIRCRAFT_PROPERTY_NAMES = {
    "hex": "transponder_code",
    "type": "message_type",
    "flight": "callsign",
    "r": "registration",
    "t": "aircraft_type",
    "alt_baro": "barometric_altitude",
    "alt_geom": "geometric_altitude",
    "gs": "ground_speed",
    "track": "track",
    "true_heading": "true_heading",
    "squawk": "squawk_code",
    "emergency": "emergency_status",
    "category": "aircraft_category",
    "nav_qnh": "navigation_qnh",
    "nav_altitude_mcp": "selected_altitude",
    "nav_modes": "navigation_modes",
    "lat": "latitude",
    "lon": "longitude",
    "nic": "navigation_integrity_category",
    "rc": "radius_of_containment",
    "seen_pos": "seconds_since_position_update",
    "version": "adsb_version",
    "nac_p": "navigation_accuracy_position",
    "nac_v": "navigation_accuracy_velocity",
    "sil": "source_integrity_level",
    "sil_type": "source_integrity_level_type",
    "sda": "system_design_assurance",
    "alert": "alert_status",
    "spi": "special_position_identification",
    "mlat": "multilateration_fields",
    "tisb": "traffic_information_broadcast_fields",
    "messages": "message_count",
    "seen": "seconds_since_last_message",
    "rssi": "signal_strength",
    "dst": "distance",
    "dir": "direction",
}


def rename_aircraft_properties(aircraft: dict[str, Any]) -> dict[str, Any]:
    """Convert ADS-B API abbreviations into descriptive property names."""
    return {
        AIRCRAFT_PROPERTY_NAMES.get(property_name, property_name): value
        for property_name, value in aircraft.items()
    }


class FlightDataRetriever:
    def __init__(
        self,
        config: Config,
        client: httpx.AsyncClient,
        user_agent: str = "adsb/0.1.0",
    ) -> None:
        self.config = config
        self.client = client
        self.user_agent = user_agent

    async def get_flight_data(self) -> list[Aircraft]:
        """Fetch and return the current aircraft data."""
        request_params = {
            "latitude": self.config.area.center.latitude,
            "longitude": self.config.area.center.longitude,
            "distance": self.config.area.radius_km / KILOMETERS_PER_NAUTICAL_MILE,
        }
        url = (
            API_BASE_URL
            + f"lat/{request_params['latitude']}/"
            f"lon/{request_params['longitude']}/"
            f"dist/{request_params['distance']:.1f}"
        )
        response = await self.client.get(url, headers={"User-Agent": self.user_agent})
        response.raise_for_status()
        response_data: Any = response.json()
        if not isinstance(response_data, dict):
            raise ValueError("ADS-B API returned an invalid response")

        aircraft_data = response_data.get("ac", [])
        if not isinstance(aircraft_data, list):
            raise ValueError("ADS-B API returned an invalid aircraft list")

        aircraft_list = [
            Aircraft.from_api_data(rename_aircraft_properties(aircraft))
            for aircraft in aircraft_data
            if isinstance(aircraft, dict)
        ]

        return aircraft_list