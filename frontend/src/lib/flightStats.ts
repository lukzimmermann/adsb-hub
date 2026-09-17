import type { AircraftPositionResponse, FlightDetailResponse } from "../api/types";

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function minMaxMean(values: number[]): { min: number; max: number; mean: number } | null {
  if (values.length === 0) return null;
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
  };
}

export interface FlightStats {
  durationMinutes: number;
  distanceKm: number | null;
  directDistanceKm: number | null;
  // Flown distance / straight-line distance: 1.0 is a perfectly direct
  // flight, higher values mean more detouring (holding patterns, routing).
  detourFactor: number | null;
  altitude: { min: number; max: number; mean: number } | null;
  speed: { min: number; max: number; mean: number } | null;
  maxClimbRateFtMin: number | null;
  maxDescentRateFtMin: number | null;
}

export function computeFlightStats(flight: FlightDetailResponse): FlightStats {
  const points = [...flight.positions].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );

  const durationMinutes =
    (new Date(flight.ended_at).getTime() - new Date(flight.started_at).getTime()) / 60_000;

  const located = points.filter(
    (p): p is AircraftPositionResponse & { latitude: number; longitude: number } =>
      p.latitude !== null && p.longitude !== null,
  );

  let distanceKm: number | null = null;
  if (located.length >= 2) {
    distanceKm = 0;
    for (let i = 1; i < located.length; i++) {
      distanceKm += haversineKm(
        located[i - 1].latitude,
        located[i - 1].longitude,
        located[i].latitude,
        located[i].longitude,
      );
    }
  }

  const directDistanceKm =
    located.length >= 2
      ? haversineKm(
          located[0].latitude,
          located[0].longitude,
          located[located.length - 1].latitude,
          located[located.length - 1].longitude,
        )
      : null;

  const detourFactor =
    distanceKm !== null && directDistanceKm !== null && directDistanceKm > 0.1
      ? distanceKm / directDistanceKm
      : null;

  const altitude = minMaxMean(
    points.map((p) => p.geometric_altitude).filter((v): v is number => v !== null),
  );
  const speed = minMaxMean(
    points.map((p) => p.ground_speed_knots).filter((v): v is number => v !== null),
  );

  let maxClimbRateFtMin: number | null = null;
  let maxDescentRateFtMin: number | null = null;
  const withAltitude = points.filter((p) => p.geometric_altitude !== null);
  for (let i = 1; i < withAltitude.length; i++) {
    const prev = withAltitude[i - 1];
    const curr = withAltitude[i];
    const minutes = (new Date(curr.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) / 60_000;
    if (minutes <= 0) continue;
    const rate = (curr.geometric_altitude! - prev.geometric_altitude!) / minutes;
    if (rate > 0 && (maxClimbRateFtMin === null || rate > maxClimbRateFtMin)) maxClimbRateFtMin = rate;
    if (rate < 0 && (maxDescentRateFtMin === null || rate < maxDescentRateFtMin)) maxDescentRateFtMin = rate;
  }

  return {
    durationMinutes,
    distanceKm,
    directDistanceKm,
    detourFactor,
    altitude,
    speed,
    maxClimbRateFtMin,
    maxDescentRateFtMin,
  };
}
