"use client";

// Gráfico do painel com Recharts. Área de alcance (ink) + engajamento (accent).
// Tooltip com data, alcance e engajamento (handoff §2 aceite Fase 6).

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Props {
  serie: { date: string; reach: number; engagement: number }[];
  rangeDays: number;
}

export function PainelGrafico({ serie, rangeDays }: Props) {
  // Se sem dados, gera pontos zerados para os últimos N dias.
  const dados = serie.length > 0 ? serie : gerarZerado(rangeDays);
  return (
    <div style={{ width: "100%", height: 230 }}>
      <ResponsiveContainer>
        <AreaChart data={dados} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid stroke="var(--color-border-soft)" strokeDasharray="0" vertical={false} horizontal={true} />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => formatarDia(d)}
            tick={{ fontSize: 11, fill: "var(--color-muted-2)" }}
            axisLine={false}
            tickLine={false}
            interval={Math.max(0, Math.floor(dados.length / 6) - 1)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-2)" }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) => (typeof v === "number" ? v.toLocaleString("pt-BR") : String(v))}
          />
          <Tooltip content={<ChartTip />} />
          <Area
            type="monotone"
            dataKey="reach"
            name="alcance"
            stroke="var(--color-ink)"
            fill="var(--color-ink)"
            fillOpacity={0.06}
            strokeWidth={1.8}
          />
          <Area
            type="monotone"
            dataKey="engagement"
            name="engajamento"
            stroke="var(--color-accent)"
            fill="var(--color-accent)"
            fillOpacity={0.1}
            strokeWidth={1.8}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-[var(--radius-btn)] text-[11px]"
      style={{ background: "var(--color-ink)", color: "white" }}
    >
      <div style={{ color: "var(--color-nav-idle)" }}>{formatarDia(label as string)}</div>
      {payload.map((p: { dataKey: string; value: number; name?: string }) => (
        <div key={p.dataKey} className="flex gap-4 justify-between mt-0.5">
          <span style={{ textTransform: "capitalize" }}>{p.name ?? p.dataKey}</span>
          <span className="font-semibold tabular">{p.value.toLocaleString("pt-BR")}</span>
        </div>
      ))}
    </div>
  );
}

function formatarDia(d: string) {
  if (!d || typeof d !== "string") return "";
  const [, m, day] = d.split("-");
  if (!m || !day) return d;
  return `${day}/${m}`;
}

function gerarZerado(dias: number) {
  const out: { date: string; reach: number; engagement: number }[] = [];
  const hoje = new Date();
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje.getTime() - i * 86400_000);
    out.push({
      date: d.toISOString().slice(0, 10),
      reach: 0,
      engagement: 0,
    });
  }
  return out;
}
