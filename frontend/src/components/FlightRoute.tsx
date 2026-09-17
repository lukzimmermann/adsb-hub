import { useEffect } from "react";
import L from "leaflet";
import { Marker, Polyline, useMap } from "react-leaflet";

import type { FlightDetailResponse } from "../api/types";

function dotIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:12px;height:12px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.5);"></div>`,
    className: "",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points, { padding: [30, 30] });
    }
  }, [map, points]);
  return null;
}

export function FlightRoute({ flight }: { flight: FlightDetailResponse }) {
  const points = flight.positions
    .filter((p) => p.latitude !== null && p.longitude !== null)
    .map((p) => [p.latitude as number, p.longitude as number] as [number, number]);

  if (points.length === 0) {
    return null;
  }

  return (
    <>
      <FitBounds points={points} />
      <Polyline positions={points} pathOptions={{ color: "#818cf8", weight: 3 }} />
      <Marker position={points[0]} icon={dotIcon("#34d399")} />
      <Marker position={points[points.length - 1]} icon={dotIcon("#fb7185")} />
      {flight.departure_airport && (
        <Marker
          position={[flight.departure_airport.latitude, flight.departure_airport.longitude]}
          icon={dotIcon("#38bdf8")}
        />
      )}
      {flight.arrival_airport && (
        <Marker
          position={[flight.arrival_airport.latitude, flight.arrival_airport.longitude]}
          icon={dotIcon("#38bdf8")}
        />
      )}
    </>
  );
}
