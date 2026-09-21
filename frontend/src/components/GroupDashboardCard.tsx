import { lazy, Suspense, useMemo } from "react";
import { Link } from "react-router-dom";

import { useFlights, useGroupAircraft } from "../api/queries";
import type { GroupResponse } from "../api/types";
import { countFlightsPerDay, isToday, startOfDaysAgo } from "../lib/flightsPerDay";
import { summarizeFlights } from "../lib/flightSummary";
import { formatMinutes } from "../lib/format";
import { StatTile } from "./StatTile";
import { card, mutedText } from "../ui";

// recharts is a sizeable chunk; load it lazily like the aircraft detail panel does.
const FlightsPerDayChart = lazy(() =>
  import("./FlightsPerDayChart").then((mod) => ({ default: mod.FlightsPerDayChart })),
);

const CHART_DAYS = 30;

export function GroupDashboardCard({ group }: { group: GroupResponse }) {
  const { data: airborne, isLoading: isAirborneLoading } = useGroupAircraft(group.name);
  const { data: flights, isLoading: isFlightsLoading } = useFlights(group.name, startOfDaysAgo(CHART_DAYS - 1));
  // The tiles only cover today; the chart shows the daily trend.
  const summary = useMemo(() => summarizeFlights((flights ?? []).filter((f) => isToday(f.started_at))), [flights]);
  const perDay = useMemo(() => countFlightsPerDay(flights ?? [], CHART_DAYS), [flights]);

  return (
    <div className={`p-4 ${card}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{group.name}</h2>
        <Link
          to={`/?group=${encodeURIComponent(group.name)}`}
          className="text-sm text-slate-400 hover:text-white"
        >
          Auf Karte →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatTile
          label="Aktuell in der Luft"
          value={isAirborneLoading ? "…" : String(airborne?.length ?? 0)}
          hint={`von ${group.registrations.length} Flugzeugen`}
        />
        <StatTile label="Flüge heute" value={isFlightsLoading ? "…" : String(summary.totalFlights)} />
        <StatTile
          label="Flugzeit heute"
          value={summary.totalFlightMinutes > 0 ? formatMinutes(summary.totalFlightMinutes) : "–"}
        />
        <StatTile
          label="Ø Flugzeit"
          value={summary.averageFlightMinutes !== null ? formatMinutes(summary.averageFlightMinutes) : "–"}
        />
        <StatTile
          label="Meistgeflogen heute"
          value={summary.mostFlownAircraft?.label ?? "–"}
          hint={summary.mostFlownAircraft ? `${summary.mostFlownAircraft.count} Flüge` : undefined}
        />
        <StatTile
          label="Letzter Flug"
          value={
            summary.lastFlight
              ? new Date(summary.lastFlight.started_at).toLocaleTimeString("de-CH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "–"
          }
          hint={
            summary.lastFlight
              ? (summary.lastFlight.registration ?? summary.lastFlight.callsign?.trim() ?? undefined)
              : undefined
          }
        />
      </div>

      <div className="mt-4">
        <h3 className="mb-1 text-sm font-medium text-slate-300">Flüge pro Tag (letzte {CHART_DAYS} Tage)</h3>
        <Suspense fallback={<p className="text-xs text-slate-500">Lädt…</p>}>
          <FlightsPerDayChart data={perDay} />
        </Suspense>
      </div>

      <Link
        to={`/flights?group=${encodeURIComponent(group.name)}`}
        className="mt-3 inline-block text-sm text-indigo-300 hover:text-indigo-200"
      >
        Zu den Flügen →
      </Link>
      {group.registrations.length === 0 && (
        <p className={`mt-2 text-sm ${mutedText}`}>Noch keine Registrierungen in dieser Gruppe.</p>
      )}
    </div>
  );
}
