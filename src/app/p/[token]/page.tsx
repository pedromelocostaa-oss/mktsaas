// /p/[token] — publicações escolhidas. Só o que está em postIds.
// Nada da conta em volta (docs/08 #6).

import Link from "next/link";
import { Indisponivel, PublicShell } from "@/components/public/shell";
import {
  listarPostsDoShare,
  registrarVisita,
  resolverShareLink,
  serializePublicPost,
} from "@/server/services/share-public";
import { netMeta } from "@/lib/network";

export const dynamic = "force-dynamic";

export default async function PublicacoesEscolhidasPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await resolverShareLink(token);
  if (!link || link.kind !== "POSTS") return <Indisponivel motivo="inexistente" />;

  registrarVisita(link.id);
  const posts = await listarPostsDoShare(link);
  const publicos = await Promise.all(posts.map((p) => serializePublicPost(p)));

  return (
    <PublicShell>
      <header className="mb-6">
        <div className="text-[13px] text-[var(--color-muted)]">Publicações</div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 42, lineHeight: 1.05 }}>{link.brand.name}</h1>
        <div className="text-[13px] text-[var(--color-muted)] mt-2">
          {publicos.length} publica{publicos.length === 1 ? "ção" : "ções"} selecionada{publicos.length === 1 ? "" : "s"}.
        </div>
      </header>

      {publicos.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-modal)] shadow-[var(--shadow-card)] p-6 text-[13px] text-[var(--color-muted)]">
          Nenhuma publicação disponível.
        </div>
      ) : (
        <ul className="space-y-3">
          {publicos.map((p) => (
            <li key={p.id}>
              <Link
                href={`/p/${token}/${p.id}`}
                className="flex items-center gap-4 bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-4 hover:bg-[var(--color-surface-sunken)]"
              >
                {p.media[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.media[0].url}
                    alt=""
                    className="w-16 h-16 object-cover rounded-[10px] shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-[10px] bg-[var(--color-surface-sunken)] shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{p.title}</div>
                  <div className="text-[11px] text-[var(--color-muted)] mt-1 flex items-center gap-2">
                    <span className="tabular">
                      {new Date(p.scheduledAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                    <span>·</span>
                    <span className="flex gap-1">
                      {p.networks.map((n) => (
                        <span
                          key={n}
                          aria-label={netMeta[n].label}
                          className="inline-block rounded-full"
                          style={{ width: 7, height: 7, background: netMeta[n].color }}
                        />
                      ))}
                    </span>
                  </div>
                </div>
                <span className="text-[13px] text-[var(--color-muted)]">Ver ›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-[11px] text-[var(--color-muted)] text-center">
        Somente leitura
        {link.expiresAt
          ? `, expira em ${link.expiresAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}`
          : ", sem data de expiração"}
        . Este link mostra só as publicações listadas acima — nada da conta em volta.
      </p>
    </PublicShell>
  );
}
