// POST /api/public/review/[token] — resposta do aprovador (docs/03).
// Regras (docs/03, 04, 08):
// - Sem sessão. Autentica só pelo token (sha256).
// - "Pedir ajuste" exige texto (docs/08 #20).
// - Rate-limit 10/min por token (docs/03).
// - Não distingue token inválido de expirado de revogado — mesma resposta neutra.
// - Nunca vaza dados de outros posts nem do aprovador.

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { hashToken } from "@/lib/token";
import { permitir } from "@/lib/rate-limit";
import { enviarEmail } from "@/server/email/send";
import { tmplAprovado, tmplAjustePedido } from "@/server/email/templates";
import { criarNotificacao, podeAvisar } from "@/server/services/notifications";

const schema = z.object({
  decision: z.enum(["approve", "changes"]),
  note: z.string().trim().max(2000).optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Rate-limit por token (10 req/min — docs/03).
  if (!permitir(`review:${token}`, 10, 60_000)) {
    return NextResponse.json({ error: "muitas_tentativas" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalido" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalido" }, { status: 400 });
  }

  // "Pedir ajuste" sem texto — bloqueia (docs/08 #20).
  if (parsed.data.decision === "changes") {
    if (!parsed.data.note || parsed.data.note.length === 0) {
      return NextResponse.json({ error: "note_obrigatorio" }, { status: 400 });
    }
  }

  const tokenHash = hashToken(token);
  const review = await db.review.findUnique({ where: { token: tokenHash } });

  // Neutro: qualquer razão para não aceitar (inexistente, expirado, respondido)
  // devolve a mesma resposta — não vazar existência (docs/03).
  if (!review || review.respondedAt || review.expiresAt < new Date()) {
    return NextResponse.json({ error: "indisponivel" }, { status: 410 });
  }

  const novoEstado = parsed.data.decision === "approve" ? "APPROVED" : "CHANGES";

  await db.review.update({
    where: { id: review.id },
    data: {
      state: novoEstado,
      note: parsed.data.decision === "changes" ? parsed.data.note ?? null : null,
      respondedAt: new Date(),
    },
  });

  const post = await db.post.findUnique({
    where: { id: review.postId },
    select: {
      organizationId: true,
      title: true,
      brandId: true,
      createdById: true,
    },
  });
  const autor = post
    ? await db.user.findUnique({
        where: { id: post.createdById },
        select: { name: true, email: true },
      })
    : null;

  await db.auditLog.create({
    data: {
      organizationId: post!.organizationId,
      actorId: null, // resposta vem de link público
      action: parsed.data.decision === "approve" ? "review.approved" : "review.changes",
      targetType: "post",
      targetId: review.postId,
      metadata: {
        approverEmail: review.approverEmail,
      },
    },
  });

  // Notifica o autor (fire-and-forget). Passa pela preferência em ambos canais.
  if (post) {
    const base =
      process.env.BETTER_AUTH_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "https://pauta-wheat.vercel.app";
    const link = `${base}/${post.brandId}/calendario?post=${review.postId}`;
    const kind = parsed.data.decision === "approve" ? "APPROVAL_APPROVED" : "APPROVAL_CHANGES";
    const autorizado = await podeAvisar(post.createdById, kind).catch(() => true);

    if (autorizado && autor?.email) {
      const t =
        parsed.data.decision === "approve"
          ? tmplAprovado({
              autorNome: autor.name,
              aprovadorNome: review.approverName,
              postTitle: post.title,
              link,
            })
          : tmplAjustePedido({
              autorNome: autor.name,
              aprovadorNome: review.approverName,
              postTitle: post.title,
              nota: parsed.data.note ?? "",
              link,
            });
      enviarEmail({
        to: autor.email,
        subject: t.subject,
        html: t.html,
        text: t.text,
      }).catch(() => {});
    }

    criarNotificacao({
      userId: post.createdById,
      organizationId: post.organizationId,
      kind,
      title:
        parsed.data.decision === "approve"
          ? `${review.approverName} aprovou`
          : `${review.approverName} pediu ajuste`,
      body:
        parsed.data.decision === "approve"
          ? `Já dá para agendar a publicação de "${post.title}".`
          : parsed.data.note?.slice(0, 200) ?? "Abra o post para ver o que mudar.",
      href: `/${post.brandId}/calendario?post=${review.postId}`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, state: novoEstado });
}
