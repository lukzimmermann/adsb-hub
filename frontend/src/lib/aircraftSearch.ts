interface SearchableAircraft {
  registration: string | null;
  callsign: string | null;
  transponder_code: string;
}

export function matchesAircraftQuery(aircraft: SearchableAircraft, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return true;
  return (
    (aircraft.registration?.toLowerCase().includes(trimmed) ?? false) ||
    (aircraft.callsign?.toLowerCase().includes(trimmed) ?? false) ||
    aircraft.transponder_code.toLowerCase().includes(trimmed)
  );
}
