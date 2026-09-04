import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSuperAdmin } from "@/server/services/admin-guard";
import { detalheOrg } from "@/server/services/admin-metrics";

export const dynamic = "force-dynamic";

export default async function AdminOrgDetalhe({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const org = await detalheOrg(id);
  if (!org) notFound();

  return (
    <div className="p-6 max-w-[1240px] mx-auto space-y-4">
      <header>
        <Link href="/admin/orgs" className="text-[13px] text-[var(--color-muted)] hover:underline">
          ‹ Todas as organizações
        </Link>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 30 }} className="mt-1">
          {org.name}
        </h1>
        <div className="text-[13px] text-[var(--color-muted)]">
          {org.slug} · criada em {org.createdAt.toLocaleDateString("pt-BR")} · plano {org.plan}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-5 py-3 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)] text-[13px] font-semibold">
            Contas ({org.brands.length})
          </div>
          {org.brands.length === 0 ? (
            <div className="p-6 text-[13px] text-[var(--color-muted)]">Nenhuma conta.</div>
          ) : (
            <ul>
              {org.brands.map((b, i) => (
                <li
                  key={b.id}
                  className="px-5 py-3 flex items-center gap-3"
                  style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">
                      {b.name} {b.archivedAt && <span className="text-[11px] text-[var(--color-muted)]">(arquivada)</span>}
                    </div>
                    <div className="text-[11px] text-[var(--color-muted)]">
                      {b.kind} · {b._count.posts} posts · {b._count.connections} conexões
                    </div>
                  </div>
                  <Link
                    href={`/${b.id}/calendario`}
                    className="text-[11px] text-[var(--color-muted)] underline"
                    target="_blank"
                  >
                    abrir
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-5 py-3 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)] text-[13px] font-semibold">
            Membros ({org.members.length})
          </div>
          <ul>
            {org.members.map((m, i) => (
              <li
                key={m.id}
                className="px-5 py-3 flex items-center gap-3"
                style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{m.user.name}</div>
                  <div className="text-[11px] text-[var(--color-muted)] truncate">
                    {m.user.email}
                    {!m.user.emailVerified && <span className="text-[var(--color-warn)]"> · não verificado</span>}
                  </div>
                </div>
                <span className="text-[11px] text-[var(--color-muted)]">{m.role}</span>
                <Link href={`/admin/users/${m.user.id}`} className="text-[11px] underline">
                  ver
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
