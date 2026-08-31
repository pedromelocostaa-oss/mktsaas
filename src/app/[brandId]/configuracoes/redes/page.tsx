// Configurações → Redes conectadas. Handoff §8.
// - Cada rede: nome, modo, botão Conectar / rótulo Conectado.
// - Aviso de expiração com CONSEQUÊNCIA escrita (docs/05, docs/08 #25).

import { notFound } from "next/navigation";
import { requireTenant } from "@/server/tenant";
import { pegarBrand } from "@/server/services/queries";
import { NETWORKS, netMeta } from "@/lib/network";
import { RedesActions } from "./redes-actions";
import type { Network } from "@prisma/client";

export default async function RedesPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const brand = await pegarBrand(brandId);
  if (!brand) notFound();

  const t = await requireTenant();
  const conns = await t.socialConnection.findMany({ where: { brandId } });

  const porRede = new Map<Network, (typeof conns)[number] | null>();
  for (const n of NETWORKS) porRede.set(n, null);
  for (const c of conns) porRede.set(c.network, c);

  const emAlerta = conns
    .filter((c) => c.expiresAt && diasAte(c.expiresAt) <= 14 && diasAte(c.expiresAt) > 0)
    .map((c) => ({ label: netMeta[c.network].label, dias: diasAte(c.expiresAt!) }));

  const emErro = conns.filter((c) => c.status === "ERROR" || c.status === "EXPIRED");

  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-6 py-4 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)]">
        <div className="text-[15px] font-semibold">{brand.name}</div>
        <div className="text-[13px] text-[var(--color-muted)]">
          O Instagram e o Facebook coletam automaticamente. As outras redes entram à mão.
        </div>
      </div>

      <ul>
        {NETWORKS.map((n, i) => {
          const meta = netMeta[n];
          const conn = porRede.get(n);
          return (
            <li
              key={n}
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
                <RedesActions brandId={brandId} network={n} conectada={false} />
              ) : (
                <span className="text-[11px] text-[var(--color-muted)]">use "Preencher à mão" no post</span>
              )}
            </li>
          );
        })}
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
  );
}

function diasAte(d: Date) {
  return Math.round((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}
