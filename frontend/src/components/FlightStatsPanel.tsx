import type { FlightStats } from "../lib/flightStats";
import { formatMinutes } from "../lib/format";
import { StatTile } from "./StatTile";

export function FlightStatsPanel({ stats }: { stats: FlightStats }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatTile label="Flugzeit" value={formatMinutes(stats.durationMinutes)} />
      <StatTile
        label="Strecke"
        value={stats.distanceKm !== null ? `${Math.round(stats.distanceKm)} km` : "–"}
        hint={stats.directDistanceKm !== null ? `${Math.round(stats.directDistanceKm)} km direkt` : undefined}
      />
      <StatTile
        label="Umweg-Faktor"
        value={stats.detourFactor !== null ? `×${stats.detourFactor.toFixed(2)}` : "–"}
        hint="Strecke ggü. Direktverbindung"
      />
      <StatTile
        label="Ø Höhe"
        value={stats.altitude ? `${Math.round(stats.altitude.mean).toLocaleString("de-CH")} ft` : "–"}
      />
      <StatTile
        label="Min. / Max. Höhe"
        value={
          stats.altitude
            ? `${Math.round(stats.altitude.min).toLocaleString("de-CH")} / ${Math.round(
                stats.altitude.max,
              ).toLocaleString("de-CH")} ft`
            : "–"
        }
      />
      <StatTile label="Ø Geschwindigkeit" value={stats.speed ? `${Math.round(stats.speed.mean)} kt` : "–"} />
      <StatTile
        label="Min. / Max. Geschwindigkeit"
        value={stats.speed ? `${Math.round(stats.speed.min)} / ${Math.round(stats.speed.max)} kt` : "–"}
      />
      <StatTile
        label="Max. Steigrate"
        value={stats.maxClimbRateFtMin !== null ? `+${Math.round(stats.maxClimbRateFtMin)} ft/min` : "–"}
      />
      <StatTile
        label="Max. Sinkrate"
        value={stats.maxDescentRateFtMin !== null ? `${Math.round(stats.maxDescentRateFtMin)} ft/min` : "–"}
      />
    </div>
  );
}
