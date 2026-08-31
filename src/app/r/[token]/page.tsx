// /r/[token] — Relatório do painel (DASHBOARD). Handoff §12.
// A base de comparação vem IMPRESSA (docs/08 #16).

import Link from "next/link";
import { Indisponivel, PublicShell } from "@/components/public/shell";
import {
  BASELINE_LABEL,
  listarPostsDoShare,
  registrarVisita,
  resolverShareLink,
  serializePublicPost,
} from "@/server/services/share-public";
import { redesInformadasAMao } from "@/server/services/metrics";
import { netMeta } from "@/lib/network";

export const dynamic = "force-dynamic";

export default async function RelatorioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await resolverShareLink(token);
  if (!link || link.kind !== "DASHBOARD") return <Indisponivel motivo="inexistente" />;

  registrarVisita(link.id);
  const posts = await listarPostsDoShare(link);
  const publicos = await Promise.all(posts.map((p) => serializePublicPost(p)));
  const manuais = await redesInformadasAMao(link.brandId, link.rangeDays);

  const now = new Date();
  const inicio = new Date(now.getTime() - link.rangeDays * 24 * 60 * 60 * 1000);
  const geradoEm = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <PublicShell>
      {/* Cabeçalho */}
      <header className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[13px] text-[var(--color-muted)] mb-1">Relatório de desempenho</div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 42, lineHeight: 1.05 }}>{link.brand.name}</h1>
          <div className="text-[13px] text-[var(--color-muted)] mt-2 tabular">
            {inicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })} —{" "}
            {now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>
        <div className="text-right">
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 22 }}>Pauta</div>
          <div className="text-[11px] text-[var(--color-muted)] mt-1">Gerado em {geradoEm}</div>
        </div>
      </header>

      {/* Régua e base de comparação impressa */}
      <div className="h-[2px] w-full mb-4" style={{ background: "var(--color-ink)" }} />
      <div className="bg-white px-5 py-3 rounded-[12px] mb-6 text-[13px] text-[var(--color-ink-2)]">
        Base de comparação: <strong>{BASELINE_LABEL[link.baseline]}</strong>. Os números abaixo mudam quando a base muda.
      </div>

      {/* Cartão herói + KPIs (Fase 6 troca por números reais) */}
      <div className="bg-white rounded-[var(--radius-modal)] shadow-[var(--shadow-card)] p-6 mb-6">
        <div className="text-[13px] text-[var(--color-muted)]">Alcance</div>
        <div className="mt-1" style={{ fontFamily: "var(--font-serif)", fontSize: 62, lineHeight: 1 }}>
          <span className="tabular">—</span>
        </div>
        <div className="text-[11px] text-[var(--color-muted)] mt-2">
          O painel com números reais chega na Fase 6. Por enquanto o relatório expõe a lista de
          publicações do período — cada destaque é clicável.
        </div>
      </div>

      {/* Destaques */}
      <h2 className="text-[15px] font-semibold mb-3">Destaques do período</h2>
      {publicos.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-modal)] shadow-[var(--shadow-card)] p-6 text-[13px] text-[var(--color-muted)]">
          Nenhuma publicação nesse período.
        </div>
      ) : (
        <ul className="space-y-2">
          {publicos.map((p) => (
            <li key={p.id}>
              <Link
                href={`/r/${token}/${p.id}`}
                className="flex items-center gap-4 bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-4 hover:bg-[var(--color-surface-sunken)]"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{p.title}</div>
                  <div className="text-[11px] text-[var(--color-muted)] tabular">
                    {new Date(p.scheduledAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    {" · "}
                    {p.networks.length} rede{p.networks.length === 1 ? "" : "s"}
                  </div>
                </div>
                <span className="text-[13px] text-[var(--color-muted)]">Ver ›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Rodapé */}
      <p className="mt-8 text-[11px] text-[var(--color-muted)] text-center leading-relaxed">
        Link somente leitura
        {link.expiresAt
          ? `, expira em ${link.expiresAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}`
          : ", sem data de expiração"}
        .
        {manuais.length > 0 && (
          <>
            {" "}Números de {manuais.map((m) => netMeta[m].label).join(", ")}{" "}
            foram informados manualmente pela equipe.
          </>
        )}
        {" "}Este relatório mostra apenas números — não expõe anotações internas, colaboradores nem histórico de aprovação.
      </p>
    </PublicShell>
  );
}
