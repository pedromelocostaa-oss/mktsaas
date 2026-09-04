"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Props {
  data: { date: string; cadastros: number; publicados: number }[];
}

export function GraficoCrescimento({ data }: Props) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid stroke="var(--color-border-soft)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => {
              const [, m, day] = d.split("-");
              return `${day}/${m}`;
            }}
            tick={{ fontSize: 11, fill: "var(--color-muted-2)" }}
            axisLine={false}
            tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 6) - 1)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-2)" }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-ink)",
              border: "none",
              borderRadius: 8,
              color: "white",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="cadastros"
            name="cadastros"
            stroke="var(--color-accent)"
            fill="var(--color-accent)"
            fillOpacity={0.12}
            strokeWidth={1.8}
          />
          <Area
            type="monotone"
            dataKey="publicados"
            name="publicados"
            stroke="var(--color-ink)"
            fill="var(--color-ink)"
            fillOpacity={0.06}
            strokeWidth={1.8}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
