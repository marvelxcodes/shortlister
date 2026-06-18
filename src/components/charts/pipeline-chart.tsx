"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function PipelineChart({
  data,
}: {
  data: Array<{ stage: string; value: number; highlight?: boolean }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="bar-on" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7ee84f" />
            <stop offset="100%" stopColor="#368017" />
          </linearGradient>
        </defs>
        <CartesianGrid
          stroke="rgba(14,46,30,0.08)"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="stage"
          tick={{ fontSize: 11, fill: "#5a7565" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#5a7565" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid rgba(14,46,30,0.16)",
            background: "rgba(255,255,255,0.96)",
            color: "#1f4d33",
            fontSize: 12,
          }}
          cursor={{ fill: "rgba(155,255,107,0.18)" }}
        />
        <Bar dataKey="value" radius={[10, 10, 4, 4]} barSize={28}>
          {data.map((d) => (
            <Cell
              key={d.stage}
              fill={d.highlight ? "url(#bar-on)" : "rgba(98,203,53,0.30)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
