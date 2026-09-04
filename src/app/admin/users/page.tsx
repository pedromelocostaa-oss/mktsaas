import Link from "next/link";
import { requireSuperAdmin } from "@/server/services/admin-guard";
import { listarUsers } from "@/server/services/admin-metrics";

export const dynamic = "force-dynamic";

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSuperAdmin();
  const { q } = await searchParams;
  const users = await listarUsers(q);
  return (
    <div className="p-6 max-w-[1240px] mx-auto space-y-4">
      <header className="flex items-baseline gap-4">
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 30 }}>Usuários</h1>
        <span className="text-[13px] text-[var(--color-muted)]">{users.length} exibidos</span>
        <form className="ml-auto" method="GET">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou e-mail"
            className="text-[13px] px-3 py-2 bg-white border border-[var(--color-border)] rounded-full outline-none w-[280px]"
          />
        </form>
      </header>
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_100px_100px_120px] px-5 py-3 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)] text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
          <span>Nome</span>
          <span>E-mail</span>
          <span className="text-right">Orgs</span>
          <span className="text-right">Verificado</span>
          <span className="text-right">Cadastro</span>
        </div>
        <ul>
          {users.map((u, i) => (
            <li
              key={u.id}
              style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
            >
              <Link
                href={`/admin/users/${u.id}`}
                className="grid grid-cols-[1fr_1fr_100px_100px_120px] px-5 py-3 hover:bg-[var(--color-surface-sunken)]"
              >
                <span className="text-[13px] font-medium truncate">
                  {u.name}
                  {u.isSuperAdmin && (
                    <span
                      className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "var(--color-danger)", color: "white" }}
                    >
                      admin
                    </span>
                  )}
                </span>
                <span className="text-[13px] text-[var(--color-muted)] truncate">{u.email}</span>
                <span className="text-[13px] tabular text-right">{u._count.members}</span>
                <span className="text-[11px] text-right">
                  {u.emailVerified ? (
                    <span className="text-[var(--color-accent-dark)]">✓</span>
                  ) : (
                    <span className="text-[var(--color-warn)]">pendente</span>
                  )}
                </span>
                <span className="text-[11px] tabular text-right text-[var(--color-muted)]">
                  {u.createdAt.toLocaleDateString("pt-BR")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
