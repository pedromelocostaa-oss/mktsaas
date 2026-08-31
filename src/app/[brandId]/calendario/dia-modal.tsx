"use client";

// Modal do dia — bloco warn quando ≥ 2 posts na mesma rede no mesmo dia
// (handoff §4 e Fase 1 checklist).

import { useRouter, useSearchParams } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogTitle } from "@/components/ui/dialog";
import { netMeta, STAGE_LABEL, STAGE_COLOR } from "@/lib/network";
import Link from "next/link";
import type { PostChip } from "./calendario-shell";

interface Props {
  brandId: string;
  dia: string; // YYYY-MM-DD
  posts: PostChip[];
}

export function DiaModal({ dia, posts }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const [y, m, d] = dia.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const rotulo = dt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  // Detecta colisões: mais de 1 post na mesma rede no mesmo dia.
  const colisoes: string[] = [];
  const contagem = new Map<string, number>();
  for (const p of posts) for (const n of p.networks) contagem.set(n, (contagem.get(n) ?? 0) + 1);
  for (const [n, c] of contagem) if (c >= 2) colisoes.push(netMeta[n as keyof typeof netMeta].label);

  function fechar(open: boolean) {
    if (!open) {
      const next = new URLSearchParams(sp.toString());
      next.delete("dia");
      router.push(`?${next.toString()}`);
    }
  }

  function linkPost(id: string) {
    const next = new URLSearchParams(sp.toString());
    next.delete("dia");
    next.set("post", id);
    return `?${next.toString()}`;
  }

  return (
    <Dialog open onOpenChange={fechar}>
      <DialogContent widthPx={480}>
        <DialogHeader>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <DialogTitle asChild>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 23 }} className="capitalize">
                  {rotulo}
                </h2>
              </DialogTitle>
              <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] mt-1">
                {posts.length} {posts.length === 1 ? "publicação" : "publicações"}
              </div>
            </div>
          </div>
        </DialogHeader>
        <DialogBody>
          {colisoes.length > 0 && (
            <div
              className="mb-4 px-4 py-3 rounded-[var(--radius-btn)] text-[13px]"
              style={{ background: "var(--color-warn-bg)", color: "var(--color-warn)" }}
            >
              {colisoes.length === 1 ? (
                <>
                  2 posts no {colisoes[0]} no mesmo dia. Publicações seguidas na mesma rede costumam dividir o alcance entre si.
                </>
              ) : (
                <>Redes com mais de um post hoje: {colisoes.join(", ")}. Publicações seguidas na mesma rede costumam dividir o alcance entre si.</>
              )}
            </div>
          )}
          <div className="space-y-1">
            {posts.map((p) => {
              const hora = new Date(p.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              return (
                <Link
                  key={p.id}
                  href={linkPost(p.id)}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-[10px] hover:bg-[var(--color-surface-sunken)]"
                >
                  <span className="text-[13px] tabular w-12 shrink-0 text-[var(--color-muted)]">{hora}</span>
                  <span className="flex gap-1 w-12 shrink-0">
                    {p.networks.map((n) => (
                      <span
                        key={n}
                        className="inline-block rounded-full"
                        style={{ width: 7, height: 7, background: netMeta[n].color }}
                      />
                    ))}
                  </span>
                  <span className="flex-1 text-[13px] font-medium truncate">{p.title}</span>
                  <span className="flex items-center gap-1.5 text-[11px]" style={{ color: STAGE_COLOR[p.stage] }}>
                    <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: STAGE_COLOR[p.stage] }} />
                    {STAGE_LABEL[p.stage]}
                  </span>
                </Link>
              );
            })}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
