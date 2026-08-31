"use client";

// Grade 7×N do modo Mês.
// docs/08 #24: célula 140px FIXA. Acima de 3 posts, mostra 2 e "+ N publicações".
// docs/08 #25: estado nunca é comunicado só por cor — chip do post carrega o
// horário em texto, e o ponto do estágio vem acompanhado.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { netMeta, STAGE_COLOR } from "@/lib/network";
import { cn } from "@/lib/cn";
import type { PostChip } from "./calendario-shell";

const WEEK = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

interface Props {
  brandId: string;
  ancora: string;
  posts: PostChip[];
}

export function CalendarioMes({ brandId, ancora, posts }: Props) {
  const sp = useSearchParams();
  const dt = new Date(ancora);
  const ano = dt.getFullYear();
  const mes = dt.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  // Segunda como primeiro dia (getDay(): 0=dom, 1=seg…6=sab). Ajuste para seg.
  const offsetSeg = (primeiroDia.getDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < offsetSeg; i++) cells.push(null);
  for (let d = 1; d <= diasNoMes; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  // Index por dia.
  const byDay = new Map<number, PostChip[]>();
  for (const p of posts) {
    const pd = new Date(p.scheduledAt);
    if (pd.getFullYear() !== ano || pd.getMonth() !== mes) continue;
    const dia = pd.getDate();
    const lista = byDay.get(dia) ?? [];
    lista.push(p);
    byDay.set(dia, lista);
  }
  for (const lista of byDay.values()) lista.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  const hoje = new Date();
  const hojeD = hoje.getFullYear() === ano && hoje.getMonth() === mes ? hoje.getDate() : null;

  function linkComDia(d: number) {
    const next = new URLSearchParams(sp.toString());
    next.set("dia", `${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    return `?${next.toString()}`;
  }
  function linkComPost(id: string) {
    const next = new URLSearchParams(sp.toString());
    next.set("post", id);
    return `?${next.toString()}`;
  }

  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[var(--color-border-soft)] bg-[var(--color-surface-sunken)]">
        {WEEK.map((w) => (
          <div key={w} className="px-3.5 py-2.5 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const ps = d ? byDay.get(d) ?? [] : [];
          // ≥ 4 posts: mostra 2 + "+N publicações". Até 3: mostra todos.
          const visiveis = ps.length >= 4 ? ps.slice(0, 2) : ps.slice(0, 3);
          const resto = ps.length - visiveis.length;
          const isToday = d !== null && d === hojeD;
          const isLastCol = (i + 1) % 7 === 0;
          const uniqueNets = [...new Set(ps.flatMap((p) => p.networks))];

          return (
            <div
              key={i}
              className={cn(
                "flex flex-col p-2 border-b border-[var(--color-border-hairline)]",
                !isLastCol && "border-r border-[var(--color-border-hairline)]",
              )}
              // docs/08 #24 — 140px fixos, sem crescer com dia cheio
              style={{ height: 140, background: d ? "white" : "var(--color-surface-sunken)" }}
            >
              {d !== null && (
                <div className="flex items-center gap-1.5 mb-1 px-0.5">
                  <span
                    className={cn(
                      "flex items-center justify-center text-[12px] rounded-full",
                      isToday ? "font-bold text-white" : "text-[var(--color-muted)] font-medium",
                    )}
                    style={{ width: 24, height: 24, background: isToday ? "var(--color-accent)" : "transparent" }}
                  >
                    {d}
                  </span>
                  {uniqueNets.length > 0 && (
                    <span className="flex gap-1 ml-auto">
                      {uniqueNets.map((n) => (
                        <span
                          key={n}
                          aria-label={netMeta[n].label}
                          className="inline-block rounded-full"
                          style={{ width: 7, height: 7, background: netMeta[n].color }}
                        />
                      ))}
                    </span>
                  )}
                </div>
              )}
              <div className="flex-1 space-y-1 overflow-hidden">
                {visiveis.map((p) => (
                  <PostChipCard key={p.id} p={p} href={linkComPost(p.id)} />
                ))}
              </div>
              {resto > 0 && d !== null && (
                <Link
                  href={linkComDia(d)}
                  className="text-[11px] font-medium px-2 py-1 mt-1 text-[var(--color-ink-2)] bg-[var(--color-bg)] hover:bg-[var(--color-border-soft)] rounded-full text-left"
                >
                  + {resto} {resto === 1 ? "publicação" : "publicações"}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostChipCard({ p, href }: { p: PostChip; href: string }) {
  const primaria = p.networks[0];
  const cor = primaria ? netMeta[primaria].color : "var(--color-muted-2)";
  const horario = new Date(p.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    <Link
      href={href}
      className="block bg-[var(--color-surface-sunken)] rounded-[10px] px-2 py-1.5 hover:bg-[var(--color-border-hairline)]"
      style={{ borderLeft: `3px solid ${cor}` }}
    >
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block rounded-full"
          style={{ width: 6, height: 6, background: STAGE_COLOR[p.stage] }}
        />
        <span className="text-[11px] tabular text-[var(--color-muted)]">{horario}</span>
        {p.review?.state === "PENDING" && (
          <span
            aria-label="Aguardando aprovação"
            className="inline-block rounded-full"
            style={{ width: 7, height: 7, border: "1.5px solid var(--color-warn)" }}
          />
        )}
      </div>
      <div className="text-[11px] font-medium mt-0.5 truncate">{p.title}</div>
    </Link>
  );
}
