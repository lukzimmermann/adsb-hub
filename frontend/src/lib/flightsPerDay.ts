import type { FlightResponse } from "../api/types";

export interface DayCount {
  // Local-time day as YYYY-MM-DD; sorts chronologically as a string.
  day: string;
  label: string;
  flights: number;
}

export function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export type FlightRange = "today" | "7d" | "30d" | "all";

export const FLIGHT_RANGES: Array<[FlightRange, string]> = [
  ["today", "Heute"],
  ["7d", "7 Tage"],
  ["30d", "30 Tage"],
  ["all", "Alle"],
];

export function parseFlightRange(value: string | null): FlightRange {
  return FLIGHT_RANGES.some(([range]) => range === value) ? (value as FlightRange) : "today";
}

// Start of the local day `days` days ago as ISO string. Deterministic within
// a day, so it is safe to use in a query key.
export function startOfDaysAgo(days: number, now = new Date()): string {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days).toISOString();
}

// null = no lower limit.
export function rangeSince(range: FlightRange): string | null {
  switch (range) {
    case "today":
      return startOfDaysAgo(0);
    case "7d":
      return startOfDaysAgo(6);
    case "30d":
      return startOfDaysAgo(29);
    case "all":
      return null;
  }
}

export function isToday(iso: string, now = new Date()): boolean {
  return localDayKey(new Date(iso)) === localDayKey(now);
}

// One entry per calendar day for the last `days` days (oldest first, days
// without flights included as 0), so gaps stay visible in the chart.
export function countFlightsPerDay(flights: FlightResponse[], days: number, now = new Date()): DayCount[] {
  const counts = new Map<string, number>();
  for (const flight of flights) {
    const key = localDayKey(new Date(flight.started_at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const result: DayCount[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const day = localDayKey(date);
    result.push({
      day,
      label: date.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" }),
      flights: counts.get(day) ?? 0,
    });
  }
  return result;
}
