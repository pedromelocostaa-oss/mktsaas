// Fila de aprovações — Fase 3. Handoff §5.

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/server/tenant";
import { pegarBrand } from "@/server/services/queries";
import { LinhaCobrar } from "./linha-cobrar";
import { Empty } from "@/components/ui/empty";
import { netMeta, REVIEW_LABEL } from "@/lib/network";
import type { Network } from "@prisma/client";

export default async function AprovacoesPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const brand = await pegarBrand(brandId);
  if (!brand) notFound();

  const t = await requireTenant();
  const posts = await t.post.findMany({
    where: {
      brandId,
      review: { isNot: null },
      archivedAt: null,
    },
    include: {
      review: true,
      targets: { select: { network: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const pend = posts.filter((p) => p.review?.state === "PENDING");
  const resp = posts.filter((p) => p.review?.state && p.review.state !== "PENDING");

  return (
    <div data-onboarding="aprovacoes-area" className="p-6 max-w-[920px] mx-auto space-y-4">
      <div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26 }}>Aprovações</h1>
        <p className="text-[13px] text-[var(--color-muted)] mt-1 max-w-[68ch] leading-relaxed">
          Só aparecem aqui os posts que você marcou como precisando de aprovação. Quem aprova recebe um link e responde sem criar conta.
        </p>
      </div>

      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-2 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)]">
          <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: "var(--color-warn)" }} />
          <span className="text-[13px] font-semibold">Esperando resposta ({pend.length})</span>
        </div>
        {pend.length === 0 ? (
          <div className="p-8">
            <Empty title="Nada esperando você" detail="Quando você enviar um post para aprovação, ele fica listado aqui até a pessoa responder." />
          </div>
        ) : (
          <ul>
            {pend.map((p, i) => {
              const dataStr = new Date(p.scheduledAt).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
              const sentAt = p.review!.sentAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
              return (
                <li
                  key={p.id}
                  className="px-5 py-4 flex items-center gap-4"
                  style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex gap-1">
                        {p.targets.map((t) => (
                          <span
                            key={t.network}
                            aria-label={netMeta[t.network as Network].label}
                            className="inline-block rounded-full"
                            style={{ width: 7, height: 7, background: netMeta[t.network as Network].color }}
                          />
                        ))}
                      </span>
                      <Link
                        href={`/${brandId}/calendario?post=${p.id}`}
                        className="text-[13px] font-semibold hover:underline"
                      >
                        {p.title}
                      </Link>
                    </div>
                    <div className="text-[11px] mt-1 text-[var(--color-muted)]">
                      Para {p.review!.approverName} · enviado {sentAt} · publica {dataStr}
                    </div>
                  </div>
                  <LinhaCobrar postId={p.id} />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {resp.length > 0 && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-5 py-3 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)]">
            <span className="text-[13px] font-semibold">Já respondidos</span>
          </div>
          <ul>
            {resp.map((p, i) => (
              <li
                key={p.id}
                className="px-5 py-3.5 flex items-center gap-4"
                style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
              >
                <Link
                  href={`/${brandId}/calendario?post=${p.id}`}
                  className="flex-1 text-[13px] hover:underline"
                >
                  {p.title}
                </Link>
                <span
                  className="text-[11px] font-semibold"
                  style={{
                    color:
                      p.review!.state === "APPROVED"
                        ? "var(--color-accent-dark)"
                        : "var(--color-danger)",
                  }}
                >
                  {REVIEW_LABEL[p.review!.state]}
                  {" · "}
                  {p.review!.approverName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
