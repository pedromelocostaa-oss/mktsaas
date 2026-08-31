// Renderiza o detalhe público de uma publicação — usado em
// /r/[token]/[postId], /p/[token]/[postId] e (com ligeira adaptação) na
// tela do aprovador. Só campos permitidos (docs/03).

import type { PublicPostView } from "@/server/services/share-public";
import { netMeta } from "@/lib/network";

export function PostPublicView({ post }: { post: PublicPostView }) {
  return (
    <article className="bg-white rounded-[var(--radius-modal)] shadow-[var(--shadow-card)] p-6">
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] mb-1">Publicação</div>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 28, lineHeight: 1.15 }}>{post.title}</h1>
      {post.campaign && <div className="text-[13px] mt-1 text-[var(--color-muted)]">{post.campaign}</div>}
      <div className="text-[13px] mt-3 text-[var(--color-muted)]">
        Publica em{" "}
        <strong className="text-[var(--color-ink-2)]">
          {new Date(post.scheduledAt).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </strong>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {post.networks.map((n) => (
          <span
            key={n}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border"
            style={{ borderColor: "var(--color-border)", color: "var(--color-ink-2)" }}
          >
            <span
              aria-hidden
              className="inline-block rounded-full"
              style={{ width: 7, height: 7, background: netMeta[n].color }}
            />
            {netMeta[n].label}
          </span>
        ))}
      </div>

      {post.media.length > 0 && (
        <div className="mt-5 space-y-3">
          {post.media.map((m) => (
            <div
              key={m.id}
              className="rounded-[16px] overflow-hidden bg-black/5 flex items-center justify-center min-h-[220px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.url}
                alt={m.altText ?? ""}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          ))}
        </div>
      )}

      {post.baseCaption && (
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] mb-1">Texto</div>
          <div className="text-[14px] whitespace-pre-wrap leading-relaxed">{post.baseCaption}</div>
        </div>
      )}

      {Object.keys(post.captions).length > 0 && (
        <div className="mt-4 space-y-3">
          {Object.entries(post.captions).map(([net, txt]) => (
            <div key={net}>
              <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] mb-1">
                Versão para {netMeta[net as keyof typeof netMeta].label}
              </div>
              <div className="text-[14px] whitespace-pre-wrap leading-relaxed">{txt}</div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
