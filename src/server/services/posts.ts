"use server";

// posts.* — server actions (docs/03).
// Regra fundamental (docs/08 #1): Post.stage e Post.review são dois campos.
// Regra fundamental (docs/08 #4): PostTarget.caption nulo herda o baseCaption.
// posts.schedule falha se review pendente (docs/08 #2).

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireTenant } from "@/server/tenant";
import { getServerSession } from "@/server/auth-session";
import { NETWORKS } from "@/lib/network";
import type { Network } from "@prisma/client";

const networkEnum = z.enum(NETWORKS as unknown as [Network, ...Network[]]);

const createSchema = z.object({
  brandId: z.string(),
  title: z.string().trim().min(1),
  scheduledAt: z.coerce.date(),
  baseCaption: z.string().optional(),
  internalNote: z.string().optional(),
  campaignId: z.string().optional().nullable(),
  networks: z.array(networkEnum).default([]),
});

export async function criarPost(input: z.infer<typeof createSchema>) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Erro." };
  const t = await requireTenant();
  const s = await getServerSession();

  // valida pertinência do brand
  const b = await t.brand.findUnique({ where: { id: parsed.data.brandId } });
  if (!b) return { ok: false as const, error: "not_found" };

  const post = await db.post.create({
    data: {
      organizationId: t.orgId,
      brandId: parsed.data.brandId,
      title: parsed.data.title,
      scheduledAt: parsed.data.scheduledAt,
      baseCaption: parsed.data.baseCaption ?? "",
      internalNote: parsed.data.internalNote ?? "",
      campaignId: parsed.data.campaignId ?? null,
      createdById: s!.user.id,
      targets: {
        create: parsed.data.networks.map((n) => ({ network: n })),
      },
    },
  });
  revalidatePath("/", "layout");
  return { ok: true as const, id: post.id };
}

const updateSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).optional(),
  scheduledAt: z.coerce.date().optional(),
  baseCaption: z.string().optional(),
  internalNote: z.string().optional(),
  networks: z.array(networkEnum).optional(),
});

export async function atualizarPost(input: z.infer<typeof updateSchema>) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Erro." };
  const t = await requireTenant();

  const existing = await t.post.findUnique({ where: { id: parsed.data.id }, include: { targets: true } });
  if (!existing) return { ok: false as const, error: "not_found" };

  const nextNetworks = parsed.data.networks;
  await db.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: parsed.data.id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.scheduledAt !== undefined ? { scheduledAt: parsed.data.scheduledAt } : {}),
        ...(parsed.data.baseCaption !== undefined ? { baseCaption: parsed.data.baseCaption } : {}),
        ...(parsed.data.internalNote !== undefined ? { internalNote: parsed.data.internalNote } : {}),
      },
    });
    if (nextNetworks) {
      const existingSet = new Set(existing.targets.map((t) => t.network));
      const nextSet = new Set(nextNetworks);
      const toCreate = [...nextSet].filter((n) => !existingSet.has(n));
      const toDelete = [...existingSet].filter((n) => !nextSet.has(n));
      if (toCreate.length)
        await tx.postTarget.createMany({
          data: toCreate.map((n) => ({ postId: parsed.data.id, network: n })),
        });
      if (toDelete.length)
        await tx.postTarget.deleteMany({ where: { postId: parsed.data.id, network: { in: toDelete } } });
    }
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/**
 * Define caption por rede. `caption === null` remove a versão específica
 * (volta a herdar o baseCaption). NUNCA copie o baseCaption ao criar o
 * target — a herança precisa ser dinâmica (docs/08 #4).
 */
export async function setTargetCaption(postId: string, network: Network, caption: string | null) {
  const t = await requireTenant();
  const post = await t.post.findUnique({ where: { id: postId } });
  if (!post) return { ok: false as const, error: "not_found" };

  await db.postTarget.upsert({
    where: { postId_network: { postId, network } },
    create: { postId, network, caption: caption ?? null },
    update: { caption: caption ?? null },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Move para SCHEDULED — falha (com motivo) se há revisão não aprovada (docs/08 #2). */
export async function agendarPost(postId: string) {
  const t = await requireTenant();
  const post = await t.post.findUnique({ where: { id: postId }, include: { review: true } });
  if (!post) return { ok: false as const, error: "not_found" };

  if (post.review && post.review.state !== "APPROVED") {
    return {
      ok: false as const,
      error: `Agendamento bloqueado até ${post.review.approverName} responder.`,
    };
  }

  await db.post.update({ where: { id: postId }, data: { stage: "SCHEDULED" } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function arquivarPost(postId: string) {
  const t = await requireTenant();
  const post = await t.post.findUnique({ where: { id: postId } });
  if (!post) return { ok: false as const, error: "not_found" };
  await db.post.update({ where: { id: postId }, data: { archivedAt: new Date() } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function desarquivarPost(postId: string) {
  const t = await requireTenant();
  const post = await t.post.findUnique({ where: { id: postId } });
  if (!post) return { ok: false as const, error: "not_found" };
  await db.post.update({ where: { id: postId }, data: { archivedAt: null } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Cria uma ideia rápida no dia seguinte (botão Novo post do header). */
export async function criarIdeiaRapida(brandId: string) {
  const t = await requireTenant();
  const s = await getServerSession();
  const b = await t.brand.findUnique({ where: { id: brandId } });
  if (!b) return { ok: false as const, error: "not_found" };

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(10, 0, 0, 0);

  const post = await db.post.create({
    data: {
      organizationId: t.orgId,
      brandId,
      title: "Nova ideia",
      scheduledAt: amanha,
      stage: "IDEA",
      createdById: s!.user.id,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true as const, id: post.id };
}
