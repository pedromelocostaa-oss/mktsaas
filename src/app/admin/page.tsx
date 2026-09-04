// Overview do admin.

import Link from "next/link";
import { requireSuperAdmin } from "@/server/services/admin-guard";
import {
  calcularHero,
  serieCrescimento,
  funilAtivacao,
  onboardingCompletion,
  ultimosCadastros,
  topOrgsPorAtividade,
  saudeDoSistema,
} from "@/server/services/admin-metrics";
import { GraficoCrescimento } from "./grafico-crescimento";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  await requireSuperAdmin();

  const [hero, serie, funil, onboarding, cadastros, topOrgs, saude] = await Promise.all([
    calcularHero(),
    serieCrescimento(30),
    funilAtivacao(),
    onboardingCompletion(),
    ultimosCadastros(10),
    topOrgsPorAtividade(5),
    saudeDoSistema(),
  ]);

  return (
    <div className="p-6 max-w-[1240px] mx-auto space-y-6">
      <header>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 30 }}>Visão geral</h1>
        <p className="text-[13px] text-[var(--color-muted)] mt-1">
          Comparações contra os 7 dias anteriores. Gráficos e listas cobrem 30 dias.
        </p>
      </header>

      {/* Faixa 1 — herói */}
      <div className="grid grid-cols-4 gap-4">
        {hero.map((h) => (
          <div key={h.label} className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5">
            <div className="text-[12px] text-[var(--color-muted)]">{h.label}</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 40, lineHeight: 1 }} className="tabular">
                {h.value.toLocaleString("pt-BR")}
              </span>
              <Delta valor={h.deltaPct} />
            </div>
          </div>
        ))}
      </div>

      {/* Faixa 2 — gráfico */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5">
        <div className="flex items-center gap-4 mb-3">
          <h2 className="text-[15px] font-semibold">Cadastros e posts publicados por dia</h2>
          <div className="flex items-center gap-3 text-[11px] text-[var(--color-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: "var(--color-accent)" }} />
              cadastros
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: "var(--color-ink)" }} />
              publicados
            </span>
          </div>
        </div>
        <GraficoCrescimento data={serie} />
      </div>

      {/* Faixa 3 — funil */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5">
        <h2 className="text-[15px] font-semibold mb-4">Funil de ativação</h2>
        <div className="space-y-2.5">
          {funil.map((f, i) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="w-40 text-[13px]">{f.label}</span>
              <div className="flex-1 h-[26px] rounded-[10px] overflow-hidden bg-[var(--color-bg)]">
                <div
                  className="h-full flex items-center justify-end pr-2.5 text-[11px] text-white font-semibold tabular"
                  style={{
                    width: `${Math.max(f.pctDoTopo, 4)}%`,
                    background: i === 0 ? "var(--color-ink)" : "var(--color-accent)",
                  }}
                >
                  {f.pctDoTopo.toFixed(0)}%
                </div>
              </div>
              <span className="w-16 text-right text-[13px] tabular text-[var(--color-muted)]">
                {f.users.toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Faixa 4 — onboarding */}
      <div className="grid grid-cols-2 gap-4">
        <KpiSimple
          label="Onboarding Fase 1 completo"
          valor={pct(onboarding.fase1, onboarding.base)}
          detalhe={`${onboarding.fase1} de ${onboarding.base} membros (>24h)`}
        />
        <KpiSimple
          label="Onboarding Fase 2 completo"
          valor={pct(onboarding.fase2, onboarding.base)}
          detalhe={`${onboarding.fase2} de ${onboarding.base} membros (>24h)`}
        />
      </div>

      {/* Faixa 5 — três listas */}
      <div className="grid grid-cols-3 gap-4">
        <ListaCard title="Últimos cadastros" href="/admin/users">
          {cadastros.length === 0 ? (
            <li className="text-[13px] text-[var(--color-muted)] px-3 py-2">Nenhum ainda.</li>
          ) : (
            cadastros.map((u) => (
              <li key={u.id} className="px-3 py-2 hover:bg-[var(--color-surface-sunken)]">
                <Link href={`/admin/users/${u.id}`} className="block">
                  <div className="text-[13px] font-medium truncate">{u.name}</div>
                  <div className="text-[11px] text-[var(--color-muted)] truncate">
                    {u.email} · {relative(u.createdAt)}
                  </div>
                </Link>
              </li>
            ))
          )}
        </ListaCard>

        <ListaCard title="Orgs mais ativas (30d)" href="/admin/orgs">
          {topOrgs.length === 0 ? (
            <li className="text-[13px] text-[var(--color-muted)] px-3 py-2">Nenhuma atividade.</li>
          ) : (
            topOrgs.map((o) => (
              <li key={o.id} className="px-3 py-2 hover:bg-[var(--color-surface-sunken)]">
                <Link href={`/admin/orgs/${o.id}`} className="flex items-center justify-between">
                  <span className="text-[13px] truncate">{o.name}</span>
                  <span className="text-[13px] tabular text-[var(--color-muted)]">{o.posts30d} posts</span>
                </Link>
              </li>
            ))
          )}
        </ListaCard>

        <ListaCard title="Melhorias pedidas" href="/admin/melhorias">
          <li className="text-[13px] text-[var(--color-muted)] px-3 py-6 text-center">
            Chega quando a Fase 7 entrar.
          </li>
        </ListaCard>
      </div>

      {/* Faixa 6 — saúde */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-4 flex items-center flex-wrap gap-6 text-[12px] text-[var(--color-muted)]">
        <span>
          Última coleta OK:{" "}
          <strong className="text-[var(--color-ink)] tabular">
            {saude.ultimaColetaMin == null ? "nunca" : `há ${saude.ultimaColetaMin} min`}
          </strong>
        </span>
        <span>
          Storage R2:{" "}
          <strong className="text-[var(--color-ink)] tabular">{formatBytes(saude.r2Bytes)}</strong>
        </span>
        <span>
          Conexões ativas:{" "}
          <strong className="text-[var(--color-ink)] tabular">{saude.conexoesAtivas}</strong>
          {saude.conexoesErro > 0 && (
            <span className="text-[var(--color-danger)]"> · {saude.conexoesErro} com erro</span>
          )}
        </span>
        <span>
          Erros nas últimas 24h:{" "}
          <strong className={saude.erros24h > 0 ? "text-[var(--color-danger)] tabular" : "text-[var(--color-ink)] tabular"}>
            {saude.erros24h}
          </strong>
        </span>
        <Link href="/admin/saude" className="ml-auto text-[12px] underline">
          Ver detalhes de saúde
        </Link>
      </div>
    </div>
  );
}

function Delta({ valor }: { valor: number | null }) {
  if (valor == null)
    return (
      <span
        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: "var(--color-bg)", color: "var(--color-muted)" }}
      >
        sem base
      </span>
    );
  const positivo = valor >= 0;
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular"
      style={{
        background: positivo ? "var(--color-accent-bg)" : "var(--color-danger-bg)",
        color: positivo ? "var(--color-accent-dark)" : "var(--color-danger)",
      }}
    >
      {positivo ? "+" : ""}
      {valor.toFixed(0)}%
    </span>
  );
}

function KpiSimple({ label, valor, detalhe }: { label: string; valor: string; detalhe: string }) {
  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5">
      <div className="text-[12px] text-[var(--color-muted)]">{label}</div>
      <div className="mt-2 text-[28px] font-semibold tabular">{valor}</div>
      <div className="text-[11px] text-[var(--color-muted)] mt-1">{detalhe}</div>
    </div>
  );
}

function ListaCard({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)]">
        <span className="text-[13px] font-semibold">{title}</span>
        <Link href={href} className="text-[11px] text-[var(--color-muted)] underline">
          ver todos
        </Link>
      </div>
      <ul className="divide-y divide-[var(--color-border-hairline)]">{children}</ul>
    </div>
  );
}

function pct(a: number, b: number) {
  if (b === 0) return "—";
  return `${((a / b) * 100).toFixed(0)}%`;
}
function relative(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  return `há ${Math.round(s / 86400)} d`;
}
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
