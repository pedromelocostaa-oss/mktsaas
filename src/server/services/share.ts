"use server";

// share.* — Fase 4. Links compartilhados (docs/03).
// Regras (docs/04, docs/08 #6/#7/#8/#16/#17/#18/#19):
// - Token base64url(32), banco guarda sha256.
// - "Nunca expira" (expiresAt null) exige confirmação escrita (front + flag).
// - Revogar mata o link imediatamente (revokedAt).
// - viewCount/lastViewedAt: quem compartilhou vê se o cliente abriu.
// - share.create bloqueada sem emailVerified (docs/12).
// - Default de compartilhamento é o menos exposto (docs/08 #17) — o modal
//   marca DASHBOARD (só métricas) por default.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireTenant } from "@/server/tenant";
import { getServerSession } from "@/server/auth-session";
import { hashToken, novoToken } from "@/lib/token";
import type { Baseline, ShareKind } from "@prisma/client";

const criarSchema = z.object({
  brandId: z.string(),
  kind: z.enum(["DASHBOARD", "POSTS"]),
  postIds: z.array(z.string()).optional().default([]),
  baseline: z.enum(["PREVIOUS", "AVG12W", "LAST_YEAR"]).default("PREVIOUS"),
  rangeDays: z.number().int().min(1).max(365).default(30),
  expira: z.enum(["7", "30", "nunca"]),
  confirmaNunca: z.boolean().optional().default(false),
});

export async function criarShareLink(input: z.infer<typeof criarSchema>) {
  const parsed = criarSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "erro" };

  const session = await getServerSession();
  if (!session?.user) return { ok: false as const, error: "sem_sessao" };
  // docs/12 — verificar e-mail bloqueia share.create.
  if (!session.user.emailVerified) {
    return {
      ok: false as const,
      error: "Confirme seu e-mail antes de compartilhar — a mensagem sai com o seu nome.",
    };
  }

  const t = await requireTenant();
  const brand = await t.brand.findUnique({ where: { id: parsed.data.brandId } });
  if (!brand) return { ok: false as const, error: "not_found" };

  // "Nunca expira" exige a confirmação escrita (docs/08 #18).
  if (parsed.data.expira === "nunca" && !parsed.data.confirmaNunca) {
    return { ok: false as const, error: "confirmacao_nunca_obrigatoria" };
  }

  // POSTS exige pelo menos uma publicação e todas têm que pertencer ao brand.
  if (parsed.data.kind === "POSTS") {
    if (parsed.data.postIds.length === 0) {
      return { ok: false as const, error: "escolha_pelo_menos_uma_publicacao" };
    }
    const meus = await t.post.findMany({
      where: { id: { in: parsed.data.postIds }, brandId: parsed.data.brandId },
      select: { id: true },
    });
    if (meus.length !== parsed.data.postIds.length) {
      return { ok: false as const, error: "post_fora_do_brand" };
    }
  }

  const token = novoToken();
  const expiresAt =
    parsed.data.expira === "nunca"
      ? null
      : new Date(Date.now() + Number(parsed.data.expira) * 24 * 60 * 60 * 1000);

  const link = await db.shareLink.create({
    data: {
      organizationId: t.orgId,
      brandId: parsed.data.brandId,
      token: hashToken(token),
      kind: parsed.data.kind as ShareKind,
      postIds: parsed.data.kind === "POSTS" ? parsed.data.postIds : [],
      baseline: parsed.data.baseline as Baseline,
      rangeDays: parsed.data.rangeDays,
      expiresAt,
      createdById: session.user.id,
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: t.orgId,
      actorId: session.user.id,
      action: "share_link.created",
      targetType: "share_link",
      targetId: link.id,
      metadata: {
        kind: link.kind,
        expira: parsed.data.expira,
        postCount: parsed.data.postIds.length,
      },
    },
  });

  const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const path = parsed.data.kind === "DASHBOARD" ? `/r/${token}` : `/p/${token}`;
  revalidatePath("/", "layout");
  return { ok: true as const, id: link.id, url: `${baseUrl}${path}`, token };
}

export async function revogarShareLink(id: string) {
  const t = await requireTenant();
  const link = await db.shareLink.findFirst({ where: { id, organizationId: t.orgId } });
  if (!link) return { ok: false as const, error: "not_found" };
  if (link.revokedAt) return { ok: true as const };

  await db.shareLink.update({ where: { id }, data: { revokedAt: new Date() } });
  const session = await getServerSession();
  await db.auditLog.create({
    data: {
      organizationId: t.orgId,
      actorId: session?.user?.id ?? null,
      action: "share_link.revoked",
      targetType: "share_link",
      targetId: id,
      metadata: {},
    },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function listarShareLinks(brandId: string) {
  const t = await requireTenant();
  const b = await t.brand.findUnique({ where: { id: brandId } });
  if (!b) return [];
  return db.shareLink.findMany({
    where: { brandId, organizationId: t.orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
