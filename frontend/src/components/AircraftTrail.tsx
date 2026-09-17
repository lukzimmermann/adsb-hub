import L from "leaflet";
import { Marker, Polyline } from "react-leaflet";

import type { AircraftPositionResponse } from "../api/types";

function dotIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:10px;height:10px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.5);"></div>`,
    className: "",
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

// history comes back newest-first (see AircraftPositionRepository.get_history).
export function AircraftTrail({ history }: { history: AircraftPositionResponse[] }) {
  const points = history
    .filter((p) => p.latitude !== null && p.longitude !== null)
    .map((p) => [p.latitude as number, p.longitude as number] as [number, number])
    .reverse();

  if (points.length < 2) {
    return null;
  }

  return (
    <>
      <Polyline positions={points} pathOptions={{ color: "#818cf8", weight: 3, dashArray: "6 6" }} />
      <Marker position={points[0]} icon={dotIcon("#34d399")} />
    </>
  );
}
