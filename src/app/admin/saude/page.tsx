import { requireSuperAdmin } from "@/server/services/admin-guard";
import { saudeDoSistema } from "@/server/services/admin-metrics";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function AdminSaude() {
  await requireSuperAdmin();
  const [saude, conns] = await Promise.all([
    saudeDoSistema(),
    db.socialConnection.findMany({
      orderBy: { lastSyncAt: "desc" },
      take: 50,
      include: { brand: { select: { name: true, organization: { select: { name: true } } } } },
    }),
  ]);

  return (
    <div className="p-6 max-w-[1240px] mx-auto space-y-4">
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 30 }}>Saúde</h1>

      <div className="grid grid-cols-4 gap-4">
        <Kpi label="Última coleta OK" valor={saude.ultimaColetaMin == null ? "nunca" : `há ${saude.ultimaColetaMin} min`} />
        <Kpi label="Conexões ativas" valor={String(saude.conexoesAtivas)} />
        <Kpi label="Com erro" valor={String(saude.conexoesErro)} tone={saude.conexoesErro > 0 ? "danger" : "ok"} />
        <Kpi label="Storage R2" valor={formatBytes(saude.r2Bytes)} />
      </div>

      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-5 py-3 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)] text-[13px] font-semibold">
          Conexões sociais (mais recentes)
        </div>
        <ul>
          {conns.map((c, i) => (
            <li
              key={c.id}
              className="px-5 py-3 grid grid-cols-[100px_1fr_140px_140px_120px] items-baseline gap-3"
              style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
            >
              <span className="text-[13px] font-medium">{c.network}</span>
              <span className="text-[11px] text-[var(--color-muted)] truncate">
                {c.brand.organization.name} · {c.brand.name}
              </span>
              <span
                className="text-[11px] font-semibold"
                style={{
                  color:
                    c.status === "ACTIVE"
                      ? "var(--color-accent-dark)"
                      : c.status === "ERROR" || c.status === "EXPIRED"
                        ? "var(--color-danger)"
                        : "var(--color-muted)",
                }}
              >
                {c.status}
              </span>
              <span className="text-[11px] text-[var(--color-muted)] tabular">
                sync: {c.lastSyncAt ? c.lastSyncAt.toLocaleString("pt-BR") : "—"}
              </span>
              <span className="text-[11px] text-[var(--color-muted)] tabular">
                exp: {c.expiresAt ? c.expiresAt.toLocaleDateString("pt-BR") : "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Kpi({ label, valor, tone }: { label: string; valor: string; tone?: "ok" | "danger" }) {
  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5">
      <div className="text-[12px] text-[var(--color-muted)]">{label}</div>
      <div
        className="text-[24px] font-semibold tabular mt-1"
        style={{ color: tone === "danger" ? "var(--color-danger)" : undefined }}
      >
        {valor}
      </div>
    </div>
  );
}
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
