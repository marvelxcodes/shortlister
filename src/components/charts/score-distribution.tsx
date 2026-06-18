"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ScoreDistribution({
  data,
}: {
  data: Array<{ bucket: string; count: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="dist" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7ee84f" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#62cb35" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          stroke="rgba(14,46,30,0.08)"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 10, fill: "#5a7565" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#5a7565" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid rgba(14,46,30,0.16)",
            background: "rgba(255,255,255,0.96)",
            color: "#1f4d33",
            fontSize: 12,
          }}
        />
        <Area
          dataKey="count"
          type="monotone"
          stroke="#46a020"
          strokeWidth={2.5}
          fill="url(#dist)"
          dot={{
            r: 3,
            stroke: "#46a020",
            strokeWidth: 2,
            fill: "#ffffff",
          }}
          activeDot={{
            r: 5,
            stroke: "#46a020",
            strokeWidth: 2,
            fill: "#ecfbd6",
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
