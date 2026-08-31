"use server";

// media.* — Fase 2 (docs/03). Upload direto para R2 por URL assinada.
// A app não vê o binário — só recebe metadata e a confirmação.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireTenant } from "@/server/tenant";
import { buildKey, deleteObject, publicUrl, r2ConfiguredSync, signPutUrl } from "@/lib/r2";
import type { MediaKind, Network } from "@prisma/client";

const requestSchema = z.object({
  postId: z.string(),
  originalName: z.string().min(1),
  mimeType: z.string().min(3),
  bytes: z.number().int().positive().max(2 * 1024 * 1024 * 1024), // teto 2GB
  kind: z.enum(["IMAGE", "VIDEO"]),
});

/**
 * Passo 1 do upload: gera URL assinada. Não cria PostMedia ainda — só cria
 * depois que o browser confirmar sucesso (evita órfão persistente por falha
 * de upload). Se o browser sumir, o key nunca vira PostMedia; o R2 pode
 * lidar com blobs sem referência via lifecycle rule (fora do escopo aqui).
 */
export async function requestUpload(input: z.infer<typeof requestSchema>) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "erro" };
  if (!r2ConfiguredSync()) {
    return {
      ok: false as const,
      error: "R2 não configurado. Preencha as variáveis R2_* em .env.local.",
    };
  }
  const t = await requireTenant();
  const post = await t.post.findUnique({ where: { id: parsed.data.postId } });
  if (!post) return { ok: false as const, error: "not_found" };

  const key = buildKey({
    orgId: t.orgId,
    brandId: post.brandId,
    postId: post.id,
    originalName: parsed.data.originalName,
  });
  const url = await signPutUrl(key, parsed.data.mimeType);
  return { ok: true as const, url, key, expiresIn: 900 };
}

const confirmSchema = z.object({
  postId: z.string(),
  key: z.string().min(3),
  kind: z.enum(["IMAGE", "VIDEO"]),
  mimeType: z.string(),
  bytes: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationMs: z.number().int().positive().optional(),
  altText: z.string().optional(),
});

export async function confirmUpload(input: z.infer<typeof confirmSchema>) {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "erro" };
  const t = await requireTenant();
  const post = await t.post.findUnique({ where: { id: parsed.data.postId } });
  if (!post) return { ok: false as const, error: "not_found" };

  // Valida que a key pertence ao mesmo org/brand/post (defesa em profundidade
  // caso alguém tente confirmar upload de outro tenant).
  if (!parsed.data.key.startsWith(`${t.orgId}/${post.brandId}/${post.id}/`)) {
    return { ok: false as const, error: "invalid_key" };
  }

  const last = await db.postMedia.findFirst({
    where: { postId: post.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const media = await db.postMedia.create({
    data: {
      postId: post.id,
      kind: parsed.data.kind as MediaKind,
      storageKey: parsed.data.key,
      mimeType: parsed.data.mimeType,
      bytes: parsed.data.bytes,
      width: parsed.data.width,
      height: parsed.data.height,
      durationMs: parsed.data.durationMs,
      altText: parsed.data.altText ?? null,
      position: (last?.position ?? -1) + 1,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true as const, media: { id: media.id, url: publicUrl(media.storageKey) } };
}

export async function removeMedia(mediaId: string) {
  const t = await requireTenant();
  // pertence a algum post da minha org?
  const m = await db.postMedia.findFirst({
    where: { id: mediaId, post: { organizationId: t.orgId } },
  });
  if (!m) return { ok: false as const, error: "not_found" };

  await db.postMedia.delete({ where: { id: m.id } });
  // best-effort no R2 (não impede a operação se falhar)
  try {
    await deleteObject(m.storageKey);
    if (m.thumbnailKey) await deleteObject(m.thumbnailKey);
  } catch {
    // ignora — o job de limpeza pode passar depois
  }
  revalidatePath("/", "layout");
  return { ok: true as const };
}

const reorderSchema = z.object({
  postId: z.string(),
  order: z.array(z.string()).min(1),
});

export async function reorderMedia(input: z.infer<typeof reorderSchema>) {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "erro" };
  const t = await requireTenant();
  const post = await t.post.findUnique({
    where: { id: parsed.data.postId },
    include: { media: true },
  });
  if (!post) return { ok: false as const, error: "not_found" };

  // Confere que todos os ids pertencem ao post — evita reordenar mídia de outro tenant.
  const ownIds = new Set(post.media.map((m) => m.id));
  if (!parsed.data.order.every((id) => ownIds.has(id))) {
    return { ok: false as const, error: "invalid_ids" };
  }

  await db.$transaction(
    parsed.data.order.map((id, i) => db.postMedia.update({ where: { id }, data: { position: i } })),
  );
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function setAltText(mediaId: string, altText: string | null) {
  const t = await requireTenant();
  const m = await db.postMedia.findFirst({
    where: { id: mediaId, post: { organizationId: t.orgId } },
  });
  if (!m) return { ok: false as const, error: "not_found" };
  await db.postMedia.update({ where: { id: mediaId }, data: { altText: altText?.trim() || null } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Grava o thumbnailKey depois que o browser gera e sobe o preview. */
export async function setThumbnailKey(mediaId: string, thumbnailKey: string) {
  const t = await requireTenant();
  const m = await db.postMedia.findFirst({
    where: { id: mediaId, post: { organizationId: t.orgId } },
  });
  if (!m) return { ok: false as const, error: "not_found" };
  await db.postMedia.update({ where: { id: mediaId }, data: { thumbnailKey } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/**
 * Lista mídia de um post — usado pelo painel do drawer. Devolve URLs públicas
 * já resolvidas e o warning de rede (fica no cliente por rede alvo).
 */
export async function listarMedia(postId: string) {
  const t = await requireTenant();
  const post = await t.post.findUnique({
    where: { id: postId },
    include: { targets: { select: { network: true } } },
  });
  if (!post) return { ok: false as const, error: "not_found" };
  const media = await db.postMedia.findMany({
    where: { postId },
    orderBy: { position: "asc" },
  });
  return {
    ok: true as const,
    networks: post.targets.map((t) => t.network as Network),
    media: media.map((m) => ({
      id: m.id,
      kind: m.kind,
      mimeType: m.mimeType,
      bytes: m.bytes,
      width: m.width,
      height: m.height,
      durationMs: m.durationMs,
      altText: m.altText,
      position: m.position,
      url: publicUrl(m.storageKey),
      thumbnailUrl: m.thumbnailKey ? publicUrl(m.thumbnailKey) : null,
    })),
  };
}
