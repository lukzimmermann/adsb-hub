import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AircraftPositionResponse } from "../api/types";
import { input } from "../ui";

type MetricKey = "ground_speed_knots" | "geometric_altitude" | "track" | "selected_altitude";

const METRICS: Record<MetricKey, { label: string; unit: string; color: string }> = {
  ground_speed_knots: { label: "Geschwindigkeit", unit: "kt", color: "#818cf8" },
  geometric_altitude: { label: "Höhe", unit: "ft", color: "#34d399" },
  track: { label: "Kurs", unit: "°", color: "#fb7185" },
  selected_altitude: { label: "Ziel-Höhe", unit: "ft", color: "#38bdf8" },
};

const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

interface ChartPoint {
  time: number;
  latitude: number | null;
  longitude: number | null;
  ground_speed_knots: number | null;
  geometric_altitude: number | null;
  track: number | null;
  selected_altitude: number | null;
}

export interface HoverPosition {
  latitude: number;
  longitude: number;
}

function MetricSelect({ value, onChange }: { value: MetricKey; onChange: (key: MetricKey) => void }) {
  return (
    <select
      className={`flex-1 py-1 text-xs ${input}`}
      value={value}
      onChange={(event) => onChange(event.target.value as MetricKey)}
    >
      {METRIC_KEYS.map((key) => (
        <option key={key} value={key} className="bg-slate-900 text-slate-100">
          {METRICS[key].label}
        </option>
      ))}
    </select>
  );
}

function MetricChart({
  data,
  metric,
  onHover,
}: {
  data: ChartPoint[];
  metric: MetricKey;
  onHover: (point: ChartPoint | null) => void;
}) {
  const meta = METRICS[metric];

  function handleMove(state: { activeTooltipIndex?: number | string | null }) {
    // recharts reports the active index as a string (e.g. "3"), not a number,
    // and as null (not undefined) while nothing is hovered.
    if (state.activeTooltipIndex == null) return;
    const index = Number(state.activeTooltipIndex);
    if (Number.isFinite(index) && data[index]) {
      onHover(data[index]);
    }
  }

  return (
    <div>
      <p className="mb-1 text-xs text-slate-400">
        {meta.label} <span className="text-slate-600">({meta.unit})</span>
      </p>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart
          data={data}
          syncId="aircraft-metrics"
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          onMouseMove={handleMove}
          onMouseLeave={() => onHover(null)}
        >
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value) =>
              new Date(value).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })
            }
            stroke="#475569"
            tick={{ fontSize: 10, fill: "#cbd5e1" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="#475569"
            tick={{ fontSize: 10, fill: "#cbd5e1" }}
            width={36}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.25)" }}
            contentStyle={{
              background: "#1e2338",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
              color: "#e2e8f0",
            }}
            labelStyle={{ color: "#e2e8f0" }}
            itemStyle={{ color: "#e2e8f0" }}
            labelFormatter={(value) => new Date(value as number).toLocaleTimeString("de-CH")}
            formatter={(value) => [`${value} ${meta.unit}`, meta.label]}
          />
          <Line
            type="monotone"
            dataKey={metric}
            stroke={meta.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "#1a1d30", strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface Props {
  history: AircraftPositionResponse[];
  onHoverPosition?: (position: HoverPosition | null) => void;
}

// history may come in either order depending on the caller (newest-first from
// the live-map history endpoint, oldest-first from a flight's positions), so
// it's explicitly sorted here rather than assuming one convention.
// Two synced single-metric charts instead of one dual-axis plot: speed (0-500kt)
// and altitude (0-45000ft) are different scales, and overlaying them on one plot
// with two independent y-axes lets their arbitrary alignment suggest a
// correlation that isn't in the data. Stacking them with a shared time axis
// (synced hover via `syncId`) gives the same at-a-glance comparison without that
// distortion, and each metric stays on its own correctly-scaled axis.
export function AircraftMetricsChart({ history, onHoverPosition }: Props) {
  const [metric1, setMetric1] = useState<MetricKey>("ground_speed_knots");
  const [metric2, setMetric2] = useState<MetricKey>("geometric_altitude");

  if (history.length < 2) {
    return <p className="text-xs text-slate-500">Zu wenig Verlaufsdaten für einen Plot.</p>;
  }

  const data: ChartPoint[] = [...history]
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .map((point) => ({
      time: new Date(point.recorded_at).getTime(),
      latitude: point.latitude,
      longitude: point.longitude,
      ground_speed_knots: point.ground_speed_knots,
      geometric_altitude: point.geometric_altitude,
      track: point.track,
      selected_altitude: point.selected_altitude,
    }));

  function handleHover(point: ChartPoint | null) {
    if (!onHoverPosition) return;
    if (point && point.latitude !== null && point.longitude !== null) {
      onHoverPosition({ latitude: point.latitude, longitude: point.longitude });
    } else {
      onHoverPosition(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <MetricSelect value={metric1} onChange={setMetric1} />
        <MetricSelect value={metric2} onChange={setMetric2} />
      </div>
      <MetricChart data={data} metric={metric1} onHover={handleHover} />
      <MetricChart data={data} metric={metric2} onHover={handleHover} />
    </div>
  );
}
