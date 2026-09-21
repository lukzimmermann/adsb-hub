// Mirrors api/schemas.py. Keep in sync manually when the backend schemas change.

export interface AircraftPositionResponse {
  id: number;
  transponder_code: string;
  message_type: string | null;
  callsign: string | null;
  registration: string | null;
  aircraft_type: string | null;
  barometric_altitude: string | null;
  geometric_altitude: number | null;
  ground_speed_knots: number | null;
  track: number | null;
  true_heading: number | null;
  squawk_code: string | null;
  emergency_status: string | null;
  aircraft_category: string | null;
  navigation_qnh: number | null;
  selected_altitude: number | null;
  navigation_modes: string[] | null;
  latitude: number | null;
  longitude: number | null;
  navigation_integrity_category: number | null;
  radius_of_containment: number | null;
  seconds_since_position_update: number | null;
  adsb_version: number | null;
  navigation_accuracy_position: number | null;
  navigation_accuracy_velocity: number | null;
  source_integrity_level: number | null;
  source_integrity_level_type: string | null;
  system_design_assurance: number | null;
  alert_status: number | null;
  special_position_identification: number | null;
  multilateration_fields: unknown[] | null;
  traffic_information_broadcast_fields: unknown[] | null;
  message_count: number | null;
  seconds_since_last_message: number | null;
  signal_strength: number | null;
  distance: number | null;
  direction: number | null;
  extra_properties: Record<string, unknown> | null;
  recorded_at: string;
}

export interface ConfigResponse {
  poll_interval_seconds: number;
}

export interface GroupResponse {
  name: string;
  registrations: string[];
}

export interface AirportResponse {
  id: number;
  icao_code: string | null;
  iata_code: string | null;
  name: string;
  country_code: string | null;
  latitude: number;
  longitude: number;
}

export interface FlightResponse {
  id: number;
  transponder_code: string;
  registration: string | null;
  callsign: string | null;
  aircraft_type: string | null;
  started_at: string;
  ended_at: string;
  position_count: number;
  departure_airport: AirportResponse | null;
  arrival_airport: AirportResponse | null;
}

export interface FlightDetailResponse extends FlightResponse {
  positions: AircraftPositionResponse[];
}

export interface AirportWriteRequest {
  name: string;
  latitude: number;
  longitude: number;
  icao_code: string | null;
  iata_code: string | null;
  country_code: string | null;
}

export interface RecalculateFlightsResponse {
  updated_flights: number;
}

export interface UserResponse {
  username: string;
}
