import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useFlights } from "../api/queries";
import { useAuth } from "../auth/AuthContext";
import { GroupSelect } from "../components/GroupSelect";
import { FLIGHT_RANGES, parseFlightRange, rangeSince } from "../lib/flightsPerDay";
import { formatDuration } from "../lib/format";
import { matchesAircraftQuery } from "../lib/aircraftSearch";
import { card, input, mutedText, pageTitle } from "../ui";

export function FlightsPage() {
  const { user } = useAuth();
  // Group and time range live in the URL so the detail page can link back
  // to the same filtered list.
  const [searchParams, setSearchParams] = useSearchParams();
  const groupName = searchParams.get("group");
  const range = parseFlightRange(searchParams.get("range"));
  const [searchValue, setSearchValue] = useState("");
  const { data: flights, isLoading, isError } = useFlights(groupName, rangeSince(range));

  function updateFilter(key: "group" | "range", value: string | null) {
    const next = new URLSearchParams(searchParams);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  }
  const detailQuery = searchParams.toString();

  const filteredFlights = useMemo(
    () => flights?.filter((flight) => matchesAircraftQuery(flight, searchValue)),
    [flights, searchValue],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className={pageTitle}>Flüge</h1>
        {user && <GroupSelect value={groupName} onChange={(name) => updateFilter("group", name)} />}
      </div>

      <div className="flex flex-wrap gap-2">
        {FLIGHT_RANGES.map(([value, label]) => (
          <button
            key={value}
            onClick={() => updateFilter("range", value)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              range === value ? "bg-indigo-500 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Suche nach Registration, Callsign oder Transponder-Code…"
        className={`w-full py-1.5 text-sm ${input}`}
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
      />

      {isLoading && <p className={mutedText}>Lädt…</p>}
      {isError && <p className="text-rose-400">Fehler beim Laden.</p>}
      {filteredFlights?.length === 0 && <p className={mutedText}>Keine Flüge gefunden.</p>}

      <div className={`divide-y divide-white/5 ${card}`}>
        {filteredFlights?.map((flight) => (
          <Link
            key={flight.id}
            to={`/flights/${flight.id}${detailQuery ? `?${detailQuery}` : ""}`}
            className="flex items-center justify-between gap-4 px-4 py-3 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-white/5"
          >
            <div>
              <div className="font-medium text-white">
                {flight.registration ?? flight.callsign?.trim() ?? flight.transponder_code}
              </div>
              <div className={`text-sm ${mutedText}`}>
                {new Date(flight.started_at).toLocaleString("de-CH")} ·{" "}
                {formatDuration(flight.started_at, flight.ended_at)}
              </div>
            </div>
            <div className="rounded-full bg-white/5 px-3 py-1 text-sm text-slate-300">
              {flight.departure_airport?.icao_code ?? "?"} → {flight.arrival_airport?.icao_code ?? "?"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
