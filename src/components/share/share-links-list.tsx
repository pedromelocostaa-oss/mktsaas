"use client";

// Lista de links já criados para essa brand — Fase 4 aceite:
// "Quem compartilhou vê se o link foi aberto e quando."

import { useEffect, useState, useTransition } from "react";
import { listarShareLinks } from "@/server/services/share-list";
import { revogarShareLink } from "@/server/services/share";
import { useToast } from "@/components/ui/toast";

interface Item {
  id: string;
  kind: "DASHBOARD" | "POSTS";
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  postIds: string[];
}

export function ShareLinksList({ brandId }: { brandId: string }) {
  const toast = useToast();
  const [links, setLinks] = useState<Item[] | null>(null);
  const [pending, startTransition] = useTransition();

  async function recarregar() {
    const r = await listarShareLinks(brandId);
    setLinks(
      r.map((l) => ({
        id: l.id,
        kind: l.kind as Item["kind"],
        createdAt: l.createdAt,
        expiresAt: l.expiresAt,
        revokedAt: l.revokedAt,
        viewCount: l.viewCount,
        lastViewedAt: l.lastViewedAt,
        postIds: l.postIds,
      })),
    );
  }

  useEffect(() => {
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]);

  if (!links) return null;
  if (links.length === 0)
    return (
      <div className="mt-4 text-[12px] text-[var(--color-muted)]">
        Você ainda não gerou nenhum link para essa conta.
      </div>
    );

  return (
    <div className="mt-4">
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] mb-2">
        Links existentes
      </div>
      <ul className="space-y-1">
        {links.map((l) => {
          const ativo = !l.revokedAt && (!l.expiresAt || new Date(l.expiresAt) > new Date());
          const criado = new Date(l.createdAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          });
          return (
            <li
              key={l.id}
              className="flex items-center gap-3 px-3 py-2 rounded-[10px]"
              style={{ background: "var(--color-surface-sunken)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">
                  {l.kind === "DASHBOARD" ? "Painel" : `Publicações (${l.postIds.length})`}
                </div>
                <div className="text-[11px] text-[var(--color-muted)] tabular">
                  Criado em {criado}
                  {l.expiresAt
                    ? ` · expira ${new Date(l.expiresAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}`
                    : " · sem expiração"}
                </div>
              </div>
              <div className="text-right">
                {l.revokedAt ? (
                  <span className="text-[11px] font-semibold text-[var(--color-danger)]">
                    Revogado
                  </span>
                ) : !ativo ? (
                  <span className="text-[11px] font-semibold text-[var(--color-muted)]">
                    Expirado
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-[var(--color-accent-dark)]">
                    Ativo
                  </span>
                )}
                <div className="text-[11px] text-[var(--color-muted)] tabular mt-0.5">
                  {l.viewCount === 0
                    ? "não aberto ainda"
                    : `${l.viewCount} abertura${l.viewCount === 1 ? "" : "s"}${
                        l.lastViewedAt
                          ? " · última " +
                            new Date(l.lastViewedAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            })
                          : ""
                      }`}
                </div>
              </div>
              {ativo && !l.revokedAt && (
                <button
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      const r = await revogarShareLink(l.id);
                      if (!r.ok) return toast.push({ text: "Não deu para revogar." });
                      toast.push({ text: "Link revogado." });
                      recarregar();
                    });
                  }}
                  disabled={pending}
                  className="text-[11px] text-[var(--color-muted)] underline hover:text-[var(--color-danger)]"
                >
                  Revogar
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
