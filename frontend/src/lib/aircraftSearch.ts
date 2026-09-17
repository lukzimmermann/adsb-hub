import type { AircraftPositionResponse } from "../api/types";

export function matchesAircraftQuery(aircraft: AircraftPositionResponse, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return true;
  return (
    (aircraft.registration?.toLowerCase().includes(trimmed) ?? false) ||
    (aircraft.callsign?.toLowerCase().includes(trimmed) ?? false) ||
    aircraft.transponder_code.toLowerCase().includes(trimmed)
  );
}
