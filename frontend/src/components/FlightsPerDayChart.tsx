import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DayCount } from "../lib/flightsPerDay";

export function FlightsPerDayChart({ data }: { data: DayCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <CartesianGrid stroke="#ffffff10" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: "#ffffff10" }}
          contentStyle={{ background: "#0f172a", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }}
          formatter={(value) =>[value, "Flüge"]}
        />
        <Bar dataKey="flights" fill="#818cf8" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
