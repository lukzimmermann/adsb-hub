import type { FlightResponse } from "../api/types";

export interface FlightsSummary {
  totalFlights: number;
  totalFlightMinutes: number;
  averageFlightMinutes: number | null;
  mostFlownAircraft: { label: string; count: number } | null;
  lastFlight: FlightResponse | null;
}

function flightLabel(flight: FlightResponse): string {
  return flight.registration ?? flight.callsign?.trim() ?? flight.transponder_code;
}

// flights is expected sorted newest-first (as returned by GET /flights and
// GET /groups/{name}/flights).
export function summarizeFlights(flights: FlightResponse[]): FlightsSummary {
  const totalFlights = flights.length;
  const totalFlightMinutes = flights.reduce(
    (sum, flight) =>
      sum + (new Date(flight.ended_at).getTime() - new Date(flight.started_at).getTime()) / 60_000,
    0,
  );
  const averageFlightMinutes = totalFlights > 0 ? totalFlightMinutes / totalFlights : null;

  const counts = new Map<string, number>();
  for (const flight of flights) {
    const label = flightLabel(flight);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  let mostFlownAircraft: { label: string; count: number } | null = null;
  for (const [label, count] of counts) {
    if (mostFlownAircraft === null || count > mostFlownAircraft.count) {
      mostFlownAircraft = { label, count };
    }
  }

  return {
    totalFlights,
    totalFlightMinutes,
    averageFlightMinutes,
    mostFlownAircraft,
    lastFlight: flights[0] ?? null,
  };
}
