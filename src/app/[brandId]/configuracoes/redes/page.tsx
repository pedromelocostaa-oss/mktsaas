// Configurações → Redes conectadas. Handoff §8.
// - Cada rede: nome, modo, botão Conectar / rótulo Conectado.
// - Aviso de expiração com CONSEQUÊNCIA escrita (docs/05, docs/08 #25).
// - Redes divididas em dois grupos (API + manual) para permitir spotlight
//   separado no onboarding Fase 2.

import { notFound } from "next/navigation";
import { requireTenant } from "@/server/tenant";
import { pegarBrand } from "@/server/services/queries";
import { NETWORKS, netMeta } from "@/lib/network";
import { RedesActions } from "./redes-actions";
import { OnboardingRedesProvider } from "@/components/onboarding/onboarding-redes-provider";
import { db } from "@/server/db";
import { getServerSession } from "@/server/auth-session";
import type { Network } from "@prisma/client";

export default async function RedesPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const brand = await pegarBrand(brandId);
  if (!brand) notFound();

  const t = await requireTenant();
  const conns = await t.socialConnection.findMany({ where: { brandId } });

  // Onboarding Fase 2 — só no primeiro acesso do membro à página.
  const session = await getServerSession();
  const member = session?.user
    ? await db.member.findFirst({
        where: { userId: session.user.id, organizationId: brand.organizationId },
        select: { onboardingRedesDone: true },
      })
    : null;
  const mostrarOnboardingRedes = member ? !member.onboardingRedesDone : false;

  const porRede = new Map<Network, (typeof conns)[number] | null>();
  for (const n of NETWORKS) porRede.set(n, null);
  for (const c of conns) porRede.set(c.network, c);

  const emAlerta = conns
    .filter((c) => c.expiresAt && diasAte(c.expiresAt) <= 14 && diasAte(c.expiresAt) > 0)
    .map((c) => ({ label: netMeta[c.network].label, dias: diasAte(c.expiresAt!) }));

  const emErro = conns.filter((c) => c.status === "ERROR" || c.status === "EXPIRED");

  const redesApi = NETWORKS.filter((n) => netMeta[n].source === "API");
  const redesManuais = NETWORKS.filter((n) => netMeta[n].source === "MANUAL");

  return (
    <>
    {mostrarOnboardingRedes && <OnboardingRedesProvider show />}
    <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-6 py-4 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)]">
        <div className="text-[15px] font-semibold">{brand.name}</div>
        <div className="text-[13px] text-[var(--color-muted)]">
          O Instagram e o Facebook coletam automaticamente. As outras redes entram à mão.
        </div>
      </div>

      {/* Grupo 1 — redes com API (Instagram + Facebook) */}
      <ul data-onboarding="redes-api">
        {redesApi.map((n, i) => (
          <Linha
            key={n}
            n={n}
            i={i}
            conn={porRede.get(n) ?? null}
            brandId={brandId}
            targetKey={n === "INSTAGRAM" ? "btn-conectar-instagram" : undefined}
          />
        ))}
      </ul>

      {/* Grupo 2 — redes manuais (TikTok, YouTube, LinkedIn, X) */}
      <ul data-onboarding="redes-manuais" style={{ borderTop: "1px solid var(--color-border-soft)" }}>
        {redesManuais.map((n, i) => (
          <Linha
            key={n}
            n={n}
            i={i}
            conn={porRede.get(n) ?? null}
            brandId={brandId}
          />
        ))}
      </ul>

      {emAlerta.length > 0 && (
        <div
          className="mx-6 mb-6 mt-2 px-4 py-3 rounded-[var(--radius-btn)] text-[13px]"
          style={{ background: "var(--color-warn-bg)", color: "var(--color-warn)" }}
        >
          {emAlerta.map((a) => (
            <div key={a.label}>
              A conexão do {a.label} vence em {a.dias} dia{a.dias === 1 ? "" : "s"}. Se vencer,
              a coleta automática para e o histórico fica com um buraco que não dá para preencher
              depois.
            </div>
          ))}
        </div>
      )}

      {emErro.length > 0 && (
        <div
          className="mx-6 mb-6 mt-2 px-4 py-3 rounded-[var(--radius-btn)] text-[13px]"
          style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}
        >
          {emErro.map((c) => (
            <div key={c.id}>
              {netMeta[c.network as Network].label}: {c.lastSyncError ?? "com erro"}. Reconecte.
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}

function Linha({
  n,
  i,
  conn,
  brandId,
  targetKey,
}: {
  n: Network;
  i: number;
  conn: {
    status: "ACTIVE" | "EXPIRED" | "REVOKED" | "ERROR";
    displayName: string | null;
  } | null;
  brandId: string;
  targetKey?: string;
}) {
  const meta = netMeta[n];
  return (
    <li
      className="flex items-center gap-3 px-6 py-4"
      style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
    >
      <span
        aria-hidden
        className="inline-block rounded-full"
        style={{ width: 10, height: 10, background: meta.color }}
      />
      <span className="text-[13px] font-medium flex-1">{meta.label}</span>
      <span
        className="text-[11px] px-2 py-0.5 rounded-full"
        style={{ background: "var(--color-bg)", color: "var(--color-muted)" }}
      >
        {meta.source === "API" ? "coleta automática" : "preenchimento manual"}
      </span>
      {conn ? (
        <div className="flex items-center gap-3">
          {conn.displayName && (
            <span className="text-[11px] text-[var(--color-muted)]">@{conn.displayName}</span>
          )}
          <span
            className="text-[13px] font-semibold"
            style={{
              color:
                conn.status === "ACTIVE"
                  ? "var(--color-accent-dark)"
                  : "var(--color-danger)",
            }}
          >
            {conn.status === "ACTIVE" ? "✓ Conectado" : "⚠ " + conn.status}
          </span>
          <RedesActions brandId={brandId} network={n} conectada />
        </div>
      ) : meta.source === "API" ? (
        <RedesActions brandId={brandId} network={n} conectada={false} dataOnboarding={targetKey} />
      ) : (
        <span className="text-[11px] text-[var(--color-muted)]">use &quot;Preencher à mão&quot; no post</span>
      )}
    </li>
  );
}

function diasAte(d: Date) {
  return Math.round((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}
