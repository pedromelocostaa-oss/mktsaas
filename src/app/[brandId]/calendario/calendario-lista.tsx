"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { netMeta, STAGE_LABEL, STAGE_COLOR, REVIEW_LABEL } from "@/lib/network";
import type { PostChip } from "./calendario-shell";

interface Props {
  brandId: string;
  posts: PostChip[];
}

export function CalendarioLista({ brandId, posts }: Props) {
  const sp = useSearchParams();
  const ordenado = [...posts].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  function linkPara(id: string) {
    const next = new URLSearchParams(sp.toString());
    next.set("post", id);
    return `?${next.toString()}`;
  }

  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
      {ordenado.map((p, i) => {
        const d = new Date(p.scheduledAt);
        const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        return (
          <Link
            key={p.id}
            href={linkPara(p.id)}
            className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--color-surface-sunken)]"
            style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
          >
            <span className="text-[13px] tabular w-24 shrink-0 text-[var(--color-muted)]">
              {data} · {hora}
            </span>
            <span className="flex gap-1 w-12 shrink-0">
              {p.networks.map((n) => (
                <span
                  key={n}
                  aria-label={netMeta[n].label}
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: netMeta[n].color }}
                />
              ))}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-medium truncate">{p.title}</span>
              {p.campanha && (
                <span className="block text-[11px] text-[var(--color-muted)] truncate">{p.campanha}</span>
              )}
            </span>
            {p.review && (
              <span className="text-[11px] font-semibold text-[var(--color-warn)]" aria-label={REVIEW_LABEL[p.review.state]}>
                {REVIEW_LABEL[p.review.state]}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1.5 text-[13px] w-32 justify-end"
              style={{ color: STAGE_COLOR[p.stage] }}
            >
              <span
                aria-hidden
                className="inline-block rounded-full"
                style={{ width: 7, height: 7, background: STAGE_COLOR[p.stage] }}
              />
              {STAGE_LABEL[p.stage]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
