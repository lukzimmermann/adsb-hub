import { Link } from "react-router-dom";

import { useFlights, useGroupAircraft } from "../api/queries";
import type { GroupResponse } from "../api/types";
import { summarizeFlights } from "../lib/flightSummary";
import { formatMinutes } from "../lib/format";
import { StatTile } from "./StatTile";
import { card, mutedText } from "../ui";

export function GroupDashboardCard({ group }: { group: GroupResponse }) {
  const { data: airborne, isLoading: isAirborneLoading } = useGroupAircraft(group.name);
  const { data: flights, isLoading: isFlightsLoading } = useFlights(group.name);
  const summary = summarizeFlights(flights ?? []);

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
        <StatTile label="Flüge" value={isFlightsLoading ? "…" : String(summary.totalFlights)} />
        <StatTile
          label="Flugzeit gesamt"
          value={summary.totalFlightMinutes > 0 ? formatMinutes(summary.totalFlightMinutes) : "–"}
        />
        <StatTile
          label="Ø Flugzeit"
          value={summary.averageFlightMinutes !== null ? formatMinutes(summary.averageFlightMinutes) : "–"}
        />
        <StatTile
          label="Meistgeflogen"
          value={summary.mostFlownAircraft?.label ?? "–"}
          hint={summary.mostFlownAircraft ? `${summary.mostFlownAircraft.count} Flüge` : undefined}
        />
        <StatTile
          label="Letzter Flug"
          value={summary.lastFlight ? new Date(summary.lastFlight.started_at).toLocaleDateString("de-CH") : "–"}
          hint={
            summary.lastFlight
              ? (summary.lastFlight.registration ?? summary.lastFlight.callsign?.trim() ?? undefined)
              : undefined
          }
        />
      </div>

      {summary.lastFlight && (
        <Link
          to={`/flights/${summary.lastFlight.id}`}
          className="mt-3 inline-block text-sm text-indigo-300 hover:text-indigo-200"
        >
          Letzten Flug ansehen →
        </Link>
      )}
      {group.registrations.length === 0 && (
        <p className={`mt-2 text-sm ${mutedText}`}>Noch keine Registrierungen in dieser Gruppe.</p>
      )}
    </div>
  );
}
