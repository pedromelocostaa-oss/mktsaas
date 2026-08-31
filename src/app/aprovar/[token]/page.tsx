// Tela do aprovador — mobile-first (375px+). Sem sessão. Sem menu.
// Regras (docs/03, 04, 08 #7):
// - Só serve o post do token. Trocar id na URL não muda o que aparece.
// - Estados "não existe / expirado / já respondido" caem na mesma tela neutra.
// - Nunca expõe internalNote, colaboradores, ou outras contas (docs/08 #6).

import { db } from "@/server/db";
import { hashToken } from "@/lib/token";
import { AprovadorForm } from "./form";
import { publicUrl } from "@/lib/r2";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function AprovarPage({ params }: PageProps) {
  const { token } = await params;
  const review = await db.review.findUnique({
    where: { token: hashToken(token) },
    include: {
      post: {
        include: {
          brand: { select: { name: true } },
          targets: { select: { network: true, caption: true } },
          media: { select: { id: true, storageKey: true, thumbnailKey: true, kind: true, altText: true }, orderBy: { position: "asc" } },
          campaign: { select: { name: true } },
        },
      },
    },
  });

  const invalid = !review;
  const respondido = review && !!review.respondedAt;
  const expirado = review && review.expiresAt < new Date();

  if (invalid || expirado) return <Neutra motivo="expirado" />;
  if (respondido) return <Neutra motivo="respondido" state={review!.state} />;

  const p = review!.post;
  return (
    <Container>
      <Cabecalho brandName={p.brand.name} />
      <div className="mt-4 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] mb-1">Publicação</div>
        <h1 className="text-[19px] leading-tight font-semibold">{p.title}</h1>
        {p.campaign && (
          <div className="text-[13px] text-[var(--color-muted)] mt-1">{p.campaign.name}</div>
        )}
        <div className="text-[13px] mt-3 text-[var(--color-muted)]">
          Publica em{" "}
          <strong className="text-[var(--color-ink-2)]">
            {p.scheduledAt.toLocaleString("pt-BR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}
          </strong>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.targets.map((t) => (
            <RedeChip key={t.network} network={t.network} />
          ))}
        </div>

        {p.media.length > 0 && (
          <div className="mt-4 space-y-2">
            {p.media.map((m) => (
              <div key={m.id} className="rounded-[10px] overflow-hidden bg-black/5 flex items-center justify-center min-h-[180px]">
                {m.kind === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={publicUrl(m.storageKey)}
                    alt={m.altText ?? ""}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                ) : m.thumbnailKey ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicUrl(m.thumbnailKey)} alt={m.altText ?? ""} className="max-w-full" />
                ) : (
                  <div className="text-[13px] text-[var(--color-muted)] p-6">Vídeo</div>
                )}
              </div>
            ))}
          </div>
        )}

        {p.baseCaption && (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] mb-1">Texto</div>
            <div className="text-[13px] whitespace-pre-wrap leading-relaxed">{p.baseCaption}</div>
          </div>
        )}

        {p.targets.some((t) => t.caption) && (
          <div className="mt-4 space-y-3">
            {p.targets
              .filter((t) => t.caption)
              .map((t) => (
                <div key={t.network}>
                  <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] mb-1">
                    Versão para {networkLabel(t.network)}
                  </div>
                  <div className="text-[13px] whitespace-pre-wrap leading-relaxed">{t.caption}</div>
                </div>
              ))}
          </div>
        )}
      </div>

      <AprovadorForm token={token} approverName={review!.approverName} />

      <p className="mt-6 text-[11px] text-[var(--color-muted)] text-center">
        Este link mostra só essa publicação e expira em{" "}
        {review!.expiresAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}. Você não
        precisa criar conta.
      </p>
    </Container>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen py-6 px-4" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-[520px] mx-auto">{children}</div>
    </div>
  );
}

function Cabecalho({ brandName }: { brandName: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontFamily: "var(--font-serif)", fontSize: 22 }}>Pauta</span>
      <span className="text-[13px] text-[var(--color-muted)]">·</span>
      <span className="text-[13px] text-[var(--color-muted)]">{brandName}</span>
    </div>
  );
}

function RedeChip({ network }: { network: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border"
      style={{ borderColor: "var(--color-border)", color: "var(--color-ink-2)" }}
    >
      <span
        aria-hidden
        className="inline-block rounded-full"
        style={{ width: 7, height: 7, background: `var(--color-net-${network.toLowerCase()})` }}
      />
      {networkLabel(network)}
    </span>
  );
}

function networkLabel(n: string) {
  return { INSTAGRAM: "Instagram", TIKTOK: "TikTok", FACEBOOK: "Facebook", YOUTUBE: "YouTube", LINKEDIN: "LinkedIn", X: "X" }[n] ?? n;
}

function Neutra({ motivo, state }: { motivo: "expirado" | "respondido"; state?: string }) {
  const jaResp = motivo === "respondido";
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-[420px] w-full text-center bg-white p-8 rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 22 }} className="mb-2">
          Pauta
        </div>
        <h1 className="text-[17px] font-semibold mb-2">
          {jaResp ? "Essa resposta já foi registrada" : "Este link não está mais disponível"}
        </h1>
        <p className="text-[13px] text-[var(--color-muted)] leading-relaxed">
          {jaResp
            ? state === "APPROVED"
              ? "Você aprovou essa publicação. Não precisa fazer nada agora."
              : "Você pediu ajuste nessa publicação. A equipe já foi avisada."
            : "O link pode ter expirado ou sido substituído. Peça outro para quem enviou."}
        </p>
      </div>
    </div>
  );
}
