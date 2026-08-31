"use server";

// review.* — Fase 3.
// Regras (docs/04, docs/08 #2, docs/12):
// - Token base64url(32), banco guarda sha256 (docs/04).
// - Expira em 14 dias e some ao responder (docs/04).
// - "Pedir ajuste" exige texto (docs/08 #20).
// - review.request bloqueado se e-mail não verificado (docs/04 e docs/12).
// - Auditoria: request/approve/changes (docs/02).

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireTenant } from "@/server/tenant";
import { getServerSession } from "@/server/auth-session";
import { hashToken, novoToken } from "@/lib/token";
import { enviarPedidoAprovacao, enviarLembreteAprovador } from "@/server/email/review";

const requestSchema = z.object({
  postId: z.string(),
  approverName: z.string().trim().min(2, "Nome do aprovador é obrigatório."),
  approverEmail: z.string().trim().email("E-mail do aprovador inválido."),
});

export async function pedirAprovacao(input: z.infer<typeof requestSchema>) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "erro" };

  const session = await getServerSession();
  if (!session?.user) return { ok: false as const, error: "sem_sessao" };
  // docs/12 — verificar e-mail bloqueia review.request (ação que sai com o nome do usuário).
  if (!session.user.emailVerified) {
    return {
      ok: false as const,
      error: "Confirme seu e-mail antes de pedir aprovação — a mensagem sai com o seu nome.",
    };
  }

  const t = await requireTenant();
  const post = await t.post.findUnique({ where: { id: parsed.data.postId } });
  if (!post) return { ok: false as const, error: "not_found" };

  const token = novoToken();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 dias

  // Um Review por Post (unique postId). Se existir, substitui — pediu de novo,
  // token antigo perde efeito.
  await db.review.upsert({
    where: { postId: post.id },
    create: {
      postId: post.id,
      approverName: parsed.data.approverName,
      approverEmail: parsed.data.approverEmail,
      state: "PENDING",
      token: hashToken(token),
      expiresAt,
    },
    update: {
      approverName: parsed.data.approverName,
      approverEmail: parsed.data.approverEmail,
      state: "PENDING",
      token: hashToken(token),
      sentAt: new Date(),
      respondedAt: null,
      remindedAt: null,
      note: null,
      expiresAt,
    },
  });

  await auditar(t.orgId, "review.requested", "post", post.id, session.user.id, {
    approverEmail: parsed.data.approverEmail,
  });

  // Dispara e-mail. Se RESEND_API_KEY faltar, apenas loga.
  const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  enviarPedidoAprovacao({
    to: parsed.data.approverEmail,
    approverName: parsed.data.approverName,
    autorNome: session.user.name || session.user.email,
    postTitle: post.title,
    scheduledAt: post.scheduledAt,
    link: `${baseUrl}/aprovar/${token}`,
    expiresAt,
  }).catch(() => {});

  revalidatePath("/", "layout");
  return { ok: true as const, link: `${baseUrl}/aprovar/${token}`, token };
}

export async function cancelarAprovacao(postId: string) {
  const t = await requireTenant();
  const post = await t.post.findUnique({ where: { id: postId }, include: { review: true } });
  if (!post) return { ok: false as const, error: "not_found" };
  if (!post.review) return { ok: true as const };

  await db.review.delete({ where: { id: post.review.id } });
  await auditar(t.orgId, "review.cancelled", "post", post.id, null, {});
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Envia lembrete manual (botão "Cobrar" na fila). */
export async function lembrarAprovador(postId: string) {
  const t = await requireTenant();
  const post = await t.post.findUnique({
    where: { id: postId },
    include: { review: true },
  });
  if (!post || !post.review) return { ok: false as const, error: "not_found" };
  if (post.review.state !== "PENDING") return { ok: false as const, error: "not_pending" };

  await db.review.update({ where: { id: post.review.id }, data: { remindedAt: new Date() } });

  const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  // Nota: reenvio manual não regenera token — mantém o mesmo link que já foi.
  // Para gerar link novo, chamar pedirAprovacao de novo.
  await enviarLembreteAprovador({
    to: post.review.approverEmail,
    approverName: post.review.approverName,
    postTitle: post.title,
    // Não sabemos mais o token em claro — o link é o `?post=`, dá pra copiar
    // pela UI. Aqui só o assunto do lembrete importa.
    hint: "Consulte o link original recebido.",
    appUrl: baseUrl,
  }).catch(() => {});

  return { ok: true as const };
}

async function auditar(
  organizationId: string,
  action: string,
  targetType: string,
  targetId: string,
  actorId: string | null,
  metadata: Record<string, unknown>,
) {
  await db.auditLog.create({
    data: {
      organizationId,
      actorId,
      action,
      targetType,
      targetId,
      metadata: metadata as never,
    },
  });
}
