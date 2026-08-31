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

  await db.auditLog.create({
    data: {
      organizationId: (await db.post.findUnique({ where: { id: review.postId }, select: { organizationId: true } }))!.organizationId,
      actorId: null, // resposta vem de link público
      action: parsed.data.decision === "approve" ? "review.approved" : "review.changes",
      targetType: "post",
      targetId: review.postId,
      metadata: {
        approverEmail: review.approverEmail,
      },
    },
  });

  return NextResponse.json({ ok: true, state: novoEstado });
}
