import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useFlight } from "../api/queries";
import type { HoverPosition } from "../components/AircraftMetricsChart";
import { AircraftScrubMarker } from "../components/AircraftScrubMarker";
import { FlightRoute } from "../components/FlightRoute";
import { FlightStatsPanel } from "../components/FlightStatsPanel";
import { MapView } from "../components/MapView";
import { computeFlightStats } from "../lib/flightStats";
import { mutedText } from "../ui";

// recharts pulls in a sizeable chunk of its own (d3 internals); load it only
// once this page actually renders instead of paying for it on every page.
const AircraftMetricsChart = lazy(() =>
  import("../components/AircraftMetricsChart").then((mod) => ({ default: mod.AircraftMetricsChart })),
);

function airportLabel(airport: { icao_code: string | null; name: string } | null): string {
  if (!airport) return "Unbekannt";
  return airport.icao_code ? `${airport.icao_code} · ${airport.name}` : airport.name;
}

export function FlightDetailPage() {
  const { flightId } = useParams<{ flightId: string }>();
  const { data: flight, isLoading, isError } = useFlight(Number(flightId));
  const [scrubPosition, setScrubPosition] = useState<HoverPosition | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const stats = useMemo(() => (flight ? computeFlightStats(flight) : null), [flight]);

  if (isLoading) return <p className={`p-4 ${mutedText}`}>Lädt…</p>;
  if (isError || !flight || !stats) return <p className="p-4 text-rose-400">Flug nicht gefunden.</p>;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/5 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <Link to="/flights" className={`text-sm ${mutedText} hover:text-white`}>
          ← Zurück zu Flügen
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">
          {flight.registration ?? flight.callsign?.trim() ?? flight.transponder_code}
        </h1>
        <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-300 sm:grid-cols-4">
          <div>
            <span className={mutedText}>Start: </span>
            {new Date(flight.started_at).toLocaleString("de-CH")}
          </div>
          <div>
            <span className={mutedText}>Ende: </span>
            {new Date(flight.ended_at).toLocaleString("de-CH")}
          </div>
          <div>
            <span className={mutedText}>Von: </span>
            {airportLabel(flight.departure_airport)}
          </div>
          <div>
            <span className={mutedText}>Nach: </span>
            {airportLabel(flight.arrival_airport)}
          </div>
        </div>
      </div>
      <div className="relative flex-1">
        <MapView>
          <FlightRoute flight={flight} />
          {scrubPosition && (
            <AircraftScrubMarker position={[scrubPosition.latitude, scrubPosition.longitude]} />
          )}
        </MapView>

        <button
          onClick={() => setIsPanelOpen(true)}
          className="absolute right-3 top-3 z-[1000] rounded-full bg-slate-800/90 px-3 py-2 text-sm text-slate-200 shadow-soft sm:hidden"
        >
          Statistik
        </button>

        <div
          className={`absolute inset-0 z-[1000] overflow-y-auto border-white/10 bg-slate-900/95 p-4 backdrop-blur sm:inset-y-0 sm:left-auto sm:right-0 sm:flex sm:w-96 sm:border-l sm:bg-slate-900/90 ${
            isPanelOpen ? "block" : "hidden"
          }`}
        >
          <button
            onClick={() => setIsPanelOpen(false)}
            className="mb-2 flex items-center gap-1 text-sm text-slate-400 hover:text-white sm:hidden"
          >
            ← Zurück zur Karte
          </button>

          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-300">Statistik</h3>
            <FlightStatsPanel stats={stats} />

            <h3 className="mb-2 mt-4 text-sm font-medium text-slate-300">Verlauf</h3>
            <Suspense fallback={<p className="text-xs text-slate-500">Lädt…</p>}>
              <AircraftMetricsChart history={flight.positions} onHoverPosition={setScrubPosition} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
