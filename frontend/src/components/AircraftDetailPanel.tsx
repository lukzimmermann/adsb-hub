import { lazy, Suspense } from "react";

import type { AircraftPositionResponse } from "../api/types";
import type { HoverPosition } from "./AircraftMetricsChart";

// recharts pulls in a sizeable chunk of its own (d3 internals); load it only
// once a panel is actually open instead of paying for it on every page.
const AircraftMetricsChart = lazy(() =>
  import("./AircraftMetricsChart").then((mod) => ({ default: mod.AircraftMetricsChart })),
);

interface Props {
  aircraft: AircraftPositionResponse;
  history: AircraftPositionResponse[] | undefined;
  onClose: () => void;
  onHoverPosition: (position: HoverPosition | null) => void;
}

const FIELDS: Array<[string, (a: AircraftPositionResponse) => string]> = [
  ["Registrierung", (a) => a.registration ?? "–"],
  ["Callsign", (a) => a.callsign?.trim() || "–"],
  ["Transponder", (a) => a.transponder_code],
  ["Typ", (a) => a.aircraft_type ?? "–"],
  ["Höhe (baro)", (a) => a.barometric_altitude ?? "–"],
  ["Höhe (geo)", (a) => (a.geometric_altitude !== null ? `${a.geometric_altitude} ft` : "–")],
  ["Geschwindigkeit", (a) => (a.ground_speed_knots !== null ? `${a.ground_speed_knots} kt` : "–")],
  ["Kurs", (a) => (a.track !== null ? `${a.track}°` : "–")],
  ["Squawk", (a) => a.squawk_code ?? "–"],
  ["Zuletzt gesehen", (a) => new Date(a.recorded_at).toLocaleTimeString("de-CH")],
];

export function AircraftDetailPanel({ aircraft, history, onClose, onHoverPosition }: Props) {
  return (
    <div className="absolute inset-0 z-[1000] overflow-y-auto border-white/10 bg-slate-900/95 p-4 backdrop-blur sm:inset-y-0 sm:left-auto sm:right-0 sm:w-96 sm:border-l sm:bg-slate-900/90">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {aircraft.registration ?? aircraft.transponder_code}
        </h2>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Schliessen"
        >
          ✕
        </button>
      </div>
      <dl className="space-y-1 text-sm">
        {FIELDS.map(([label, get]) => (
          <div key={label} className="flex justify-between gap-2 border-b border-white/5 py-1.5">
            <dt className="text-slate-400">{label}</dt>
            <dd className="font-medium text-slate-100">{get(aircraft)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 border-t border-white/5 pt-3">
        <h3 className="mb-2 text-sm font-medium text-slate-300">Verlauf</h3>
        {history ? (
          <Suspense fallback={<p className="text-xs text-slate-500">Lädt…</p>}>
            <AircraftMetricsChart history={history} onHoverPosition={onHoverPosition} />
          </Suspense>
        ) : (
          <p className="text-xs text-slate-500">Lädt…</p>
        )}
      </div>
    </div>
  );
}
