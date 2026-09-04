import Link from "next/link";
import { requireSuperAdmin } from "@/server/services/admin-guard";
import { listarOrgs } from "@/server/services/admin-metrics";

export const dynamic = "force-dynamic";

export default async function AdminOrgs({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSuperAdmin();
  const { q } = await searchParams;
  const orgs = await listarOrgs(q);
  return (
    <div className="p-6 max-w-[1240px] mx-auto space-y-4">
      <header className="flex items-baseline gap-4">
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 30 }}>Organizações</h1>
        <span className="text-[13px] text-[var(--color-muted)]">{orgs.length} exibidas</span>
        <form className="ml-auto" method="GET">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou slug"
            className="text-[13px] px-3 py-2 bg-white border border-[var(--color-border)] rounded-full outline-none w-[280px]"
          />
        </form>
      </header>
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="grid grid-cols-[1fr_160px_100px_100px_120px_100px] px-5 py-3 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)] text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
          <span>Nome</span>
          <span>Slug</span>
          <span className="text-right">Contas</span>
          <span className="text-right">Membros</span>
          <span className="text-right">Criada</span>
          <span className="text-right">Plano</span>
        </div>
        {orgs.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-[var(--color-muted)]">
            Nenhuma organização encontrada.
          </div>
        ) : (
          <ul>
            {orgs.map((o, i) => (
              <li
                key={o.id}
                style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
              >
                <Link
                  href={`/admin/orgs/${o.id}`}
                  className="grid grid-cols-[1fr_160px_100px_100px_120px_100px] px-5 py-3 hover:bg-[var(--color-surface-sunken)]"
                >
                  <span className="text-[13px] font-medium truncate">{o.name}</span>
                  <span className="text-[11px] text-[var(--color-muted)] truncate">{o.slug}</span>
                  <span className="text-[13px] tabular text-right">{o._count.brands}</span>
                  <span className="text-[13px] tabular text-right">{o._count.members}</span>
                  <span className="text-[11px] tabular text-right text-[var(--color-muted)]">
                    {o.createdAt.toLocaleDateString("pt-BR")}
                  </span>
                  <span className="text-[11px] tabular text-right">{o.plan}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
