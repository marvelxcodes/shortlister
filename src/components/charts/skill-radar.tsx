"use client";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

export function SkillRadar({
  data,
}: {
  data: Array<{ axis: string; jd: number; candidate: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart cx="50%" cy="50%" outerRadius="74%" data={data}>
        <PolarGrid stroke="rgba(14,46,30,0.10)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fontSize: 11, fill: "#356b48" }}
        />
        <PolarRadiusAxis
          tick={{ fontSize: 9, fill: "#88a896" }}
          axisLine={false}
          tickCount={4}
          angle={30}
          domain={[0, 100]}
        />
        <Radar
          name="JD"
          dataKey="jd"
          stroke="rgba(54,128,23,0.55)"
          strokeDasharray="4 4"
          fill="rgba(54,128,23,0.08)"
        />
        <Radar
          name="Candidate"
          dataKey="candidate"
          stroke="#46a020"
          fill="rgba(126,232,79,0.40)"
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
