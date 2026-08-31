// Painel (Fase 6, handoff §2).
// Layout completo mesmo sem dados: campo herói zerado, KPIs zerados, gráfico
// plano, quebra vazia, lista "posts que mais renderam" com estado próprio.

import { notFound } from "next/navigation";
import { pegarBrand } from "@/server/services/queries";
import { calcularHeroe, BASELINE_LABEL } from "@/server/services/analytics";
import { PainelFiltros } from "./painel-filtros";
import { PainelGrafico } from "./painel-grafico";
import { netMeta, NETWORKS } from "@/lib/network";
import type { Baseline, Network } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Search {
  r?: string;
  net?: string;
  b?: string;
}

export default async function PainelPage({
  params,
  searchParams,
}: {
  params: Promise<{ brandId: string }>;
  searchParams: Promise<Search>;
}) {
  const { brandId } = await params;
  const sp = await searchParams;

  const brand = await pegarBrand(brandId);
  if (!brand) notFound();

  const rangeDays = Number.parseInt(sp.r ?? "30", 10) || 30;
  const network = normalizarNet(sp.net);
  const baseline = normalizarBaseline(sp.b);

  const dados = await calcularHeroe({ brandId, rangeDays, network, baseline });

  const conectadas = (brand.connections ?? []).map((c) => c.network as Network);

  const rotuloHeroi = network ? `Alcance no ${netMeta[network].label}` : "Alcance";
  const rotuloBase = `vs. ${BASELINE_LABEL[baseline]}`;

  return (
    <div className="p-6 max-w-[1240px] mx-auto space-y-4">
      {/* Barra de filtro */}
      <PainelFiltros
        brandId={brandId}
        rangeDays={rangeDays}
        network={network}
        baseline={baseline}
        conectadas={conectadas}
      />

      {/* Cartão herói */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden flex">
        <div className="flex-[0_0_34%] p-[28px_26px]">
          <div className="text-[13px] text-[var(--color-muted)]">{rotuloHeroi}</div>
          <div
            className="mt-2 tabular"
            style={{ fontFamily: "var(--font-serif)", fontSize: 66, lineHeight: 1 }}
          >
            {formatarNumero(dados.reach)}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <DeltaPill valor={dados.deltaPct} />
            <span className="text-[12px] text-[var(--color-muted)]">{rotuloBase}</span>
          </div>
        </div>
        <div
          className="flex-1 grid grid-cols-2 border-l"
          style={{ background: "var(--color-surface-sunken)", borderColor: "var(--color-border-soft)" }}
        >
          <KpiCell label="Engajamento" valor={formatarNumero(dados.engagement)} />
          <KpiCell
            label="Taxa de engajamento"
            valor={dados.engagementRate == null ? "—" : formatarPct(dados.engagementRate * 100)}
            first
          />
          <KpiCell label="Novos seguidores" valor={formatarSigned(dados.newFollowers)} bottom />
          <KpiCell
            label="Posts publicados"
            valor={String(dados.postsPublicados)}
            bottom
            first
          />
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5">
        <div className="flex items-center gap-4 mb-3">
          <h2 className="text-[15px] font-semibold">Alcance e engajamento por dia</h2>
          <div className="flex items-center gap-3 text-[11px] text-[var(--color-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: "var(--color-ink)" }} />
              alcance
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: "var(--color-accent)" }} />
              engajamento
            </span>
          </div>
        </div>
        <PainelGrafico serie={dados.serieAtual} rangeDays={rangeDays} />
      </div>

      {/* Grade inferior 5fr / 7fr */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "5fr 7fr" }}>
        {/* Onde o alcance aconteceu */}
        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5">
          <h3 className="text-[15px] font-semibold mb-3">Onde o alcance aconteceu</h3>
          <QuebraPorRede
            quebra={dados.quebraPorRede}
            conectadas={conectadas.length > 0 ? conectadas : [...NETWORKS]}
          />
        </div>

        {/* Posts que mais renderam */}
        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)]">
            <span className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] flex-1">Post</span>
            <span className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] w-[90px] text-right">Alcance</span>
            <span className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] w-[90px] text-right">Interações</span>
            <span className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] w-[70px] text-right">Taxa</span>
          </div>
          {dados.topPosts.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[var(--color-muted)]">
              Nenhum post publicado no período.
            </div>
          ) : (
            <ul>
              {dados.topPosts.map((p, i) => {
                const dt = new Date(p.scheduledAt);
                return (
                  <li
                    key={p.id}
                    style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
                  >
                    <Link
                      href={`/${brandId}/calendario?post=${p.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--color-surface-sunken)]"
                    >
                      <span className="flex gap-1 shrink-0">
                        {p.networks.map((n) => (
                          <span
                            key={n}
                            aria-label={netMeta[n].label}
                            className="inline-block rounded-full"
                            style={{ width: 7, height: 7, background: netMeta[n].color }}
                          />
                        ))}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-medium truncate">{p.title}</span>
                        <span className="block text-[11px] text-[var(--color-muted)]">
                          {dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </span>
                      <span className="text-[13px] tabular w-[90px] text-right">{formatarNumero(p.reach)}</span>
                      <span className="text-[13px] tabular w-[90px] text-right">{formatarNumero(p.interactions)}</span>
                      <span
                        className="text-[13px] tabular w-[70px] text-right font-semibold"
                        style={{ color: p.taxa == null ? "var(--color-muted)" : "var(--color-accent)" }}
                      >
                        {p.taxa == null ? "—" : formatarPct(p.taxa * 100)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Nota quando não há dados */}
      {dados.reach === 0 && dados.postsPublicados === 0 && (
        <div className="mt-2 text-[11px] text-[var(--color-muted)] text-center leading-relaxed max-w-[68ch] mx-auto">
          Os números começam a aparecer aqui assim que você conectar uma rede social e o primeiro post ganhar alcance. Enquanto isso, o layout mostra a estrutura vazia.
        </div>
      )}
    </div>
  );
}

function KpiCell({ label, valor, first, bottom }: { label: string; valor: string; first?: boolean; bottom?: boolean }) {
  return (
    <div
      className="p-[20px_22px]"
      style={{
        borderRight: first ? undefined : undefined,
        borderTop: bottom ? "1px solid var(--color-border-soft)" : undefined,
        borderLeft: !first ? "1px solid var(--color-border-soft)" : undefined,
      }}
    >
      <div className="text-[13px] text-[var(--color-muted)]">{label}</div>
      <div className="text-[25px] font-semibold tabular mt-1">{valor}</div>
    </div>
  );
}

function DeltaPill({ valor }: { valor: number | null }) {
  if (valor == null) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
        style={{ background: "var(--color-bg)", color: "var(--color-muted)" }}
      >
        sem base
      </span>
    );
  }
  const positivo = valor >= 0;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tabular"
      style={{
        background: positivo ? "var(--color-accent-bg)" : "var(--color-danger-bg)",
        color: positivo ? "var(--color-accent-dark)" : "var(--color-danger)",
      }}
    >
      {positivo ? "+" : ""}
      {valor.toFixed(1)}%
    </span>
  );
}

function QuebraPorRede({
  quebra,
  conectadas,
}: {
  quebra: { network: Network; reach: number; percent: number }[];
  conectadas: Network[];
}) {
  const mapa = new Map(quebra.map((q) => [q.network, q]));
  const total = Math.max(1, ...quebra.map((q) => q.reach));
  return (
    <div className="space-y-3">
      {conectadas.map((n) => {
        const q = mapa.get(n);
        const reach = q?.reach ?? 0;
        const pct = q?.percent ?? 0;
        const width = (reach / total) * 100;
        return (
          <div key={n}>
            <div className="flex items-center gap-2 mb-1">
              <span
                aria-hidden
                className="inline-block rounded-full"
                style={{ width: 7, height: 7, background: netMeta[n].color }}
              />
              <span className="text-[13px]">{netMeta[n].label}</span>
              {netMeta[n].source === "MANUAL" && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: "var(--color-bg)", color: "var(--color-muted)" }}
                >
                  à mão
                </span>
              )}
              <span className="ml-auto text-[13px] tabular">
                {formatarNumero(reach)}{" "}
                <span className="text-[var(--color-muted)]">· {pct.toFixed(1)}%</span>
              </span>
            </div>
            <div
              className="h-[7px] rounded-full overflow-hidden"
              style={{ background: "var(--color-bg)" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${width}%`, background: netMeta[n].color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatarNumero(n: number) {
  return n.toLocaleString("pt-BR");
}
function formatarSigned(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toLocaleString("pt-BR")}`;
}
function formatarPct(n: number) {
  return `${n.toFixed(1)}%`;
}

function normalizarNet(v?: string): Network | null {
  if (!v) return null;
  const up = v.toUpperCase() as Network;
  return NETWORKS.includes(up) ? up : null;
}
function normalizarBaseline(v?: string): Baseline {
  if (v === "AVG12W" || v === "LAST_YEAR") return v;
  return "PREVIOUS";
}
