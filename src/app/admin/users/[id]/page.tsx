import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/server/services/admin-guard";
import { detalheUser } from "@/server/services/admin-metrics";

export const dynamic = "force-dynamic";

export default async function AdminUserDetalhe({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const u = await detalheUser(id);
  if (!u) notFound();

  return (
    <div className="p-6 max-w-[1240px] mx-auto space-y-4">
      <header>
        <Link href="/admin/users" className="text-[13px] text-[var(--color-muted)] hover:underline">
          ‹ Todos os usuários
        </Link>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 30 }} className="mt-1">
          {u.name}
        </h1>
        <div className="text-[13px] text-[var(--color-muted)]">
          {u.email}
          {!u.emailVerified && <span className="text-[var(--color-warn)]"> · não verificado</span>}
          {u.isSuperAdmin && <span className="text-[var(--color-danger)]"> · admin</span>}
          · cadastrado em {u.createdAt.toLocaleDateString("pt-BR")}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-5 py-3 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)] text-[13px] font-semibold">
            Organizações ({u.members.length})
          </div>
          <ul>
            {u.members.map((m, i) => (
              <li
                key={m.id}
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
              >
                <div>
                  <div className="text-[13px] font-medium">{m.organization.name}</div>
                  <div className="text-[11px] text-[var(--color-muted)]">
                    {m.role} · desde {m.createdAt.toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <Link href={`/admin/orgs/${m.organization.id}`} className="text-[11px] underline">
                  ver org
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-5 py-3 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-soft)] text-[13px] font-semibold">
            Sessões recentes ({u.sessions.length})
          </div>
          <ul>
            {u.sessions.length === 0 ? (
              <li className="px-5 py-6 text-center text-[13px] text-[var(--color-muted)]">
                Nenhuma sessão ativa.
              </li>
            ) : (
              u.sessions.map((s, i) => (
                <li
                  key={s.id}
                  className="px-5 py-3"
                  style={{ borderTop: i ? "1px solid var(--color-border-hairline)" : "none" }}
                >
                  <div className="text-[13px] tabular">
                    {s.updatedAt.toLocaleString("pt-BR")}
                  </div>
                  <div className="text-[11px] text-[var(--color-muted)] truncate">
                    {s.ipAddress ?? "sem IP"} · {resumirUA(s.userAgent)}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function resumirUA(ua: string | null | undefined) {
  if (!ua) return "sem user agent";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox/.test(ua)) return "Firefox";
  if (/Safari/.test(ua)) return "Safari";
  return ua.slice(0, 40);
}
