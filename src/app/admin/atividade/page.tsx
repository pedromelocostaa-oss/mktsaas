import { requireSuperAdmin } from "@/server/services/admin-guard";
import { atividadeRecente } from "@/server/services/admin-metrics";

export const dynamic = "force-dynamic";

export default async function AdminAtividade() {
  await requireSuperAdmin();
  const eventos = await atividadeRecente(200);
  return (
    <div className="p-6 max-w-[1240px] mx-auto space-y-4">
      <header>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 30 }}>Atividade recente</h1>
        <p className="text-[13px] text-[var(--color-muted)] mt-1">
          Últimos {eventos.length} eventos do AuditLog. Ordenado do mais recente para o mais antigo.
        </p>
      </header>
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
        <ul>
          {eventos.length === 0 ? (
            <li className="p-6 text-center text-[13px] text-[var(--color-muted)]">
              Nenhum evento registrado ainda.
            </li>
          ) : (
            eventos.map((e, i) => (
              <li
                key={e.id}
                className="px-5 py-3 grid grid-cols-[140px_1fr_1fr] gap-4 items-baseline"
                style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
              >
                <span className="text-[11px] tabular text-[var(--color-muted)]">
                  {e.createdAt.toLocaleString("pt-BR")}
                </span>
                <span className="text-[13px] font-medium">
                  <span className="px-1.5 py-0.5 text-[10px] rounded-[6px] mr-2 bg-[var(--color-bg)]">
                    {e.action}
                  </span>
                  {e.targetType}:{e.targetId.slice(0, 12)}…
                </span>
                <span className="text-[11px] text-[var(--color-muted)] truncate">
                  org {e.organizationId?.slice(0, 8) || "?"}… · actor {e.actorId?.slice(0, 8) ?? "público"}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
