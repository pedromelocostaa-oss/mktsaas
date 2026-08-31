// Resolução e serialização de leituras públicas de ShareLink.
// Não é "use server" — chamado direto de páginas server em /r e /p.

import { db } from "@/server/db";
import { hashToken } from "@/lib/token";
import { publicUrl } from "@/lib/r2";
import type { Baseline, Network, ShareKind } from "@prisma/client";

export interface PublicPostView {
  id: string;
  title: string;
  scheduledAt: string;
  networks: Network[];
  campaign: string | null;
  baseCaption: string;
  captions: Partial<Record<Network, string>>;
  media: { id: string; url: string; kind: "IMAGE" | "VIDEO"; altText: string | null }[];
  permalink: string | null;
  metrics: null | { reach: number; likes: number; comments: number; shares: number; saves: number; views: number };
  metricSource: "API" | "MANUAL";
  reachVsBrandAverage: number;
}

export interface ShareContext {
  brand: { name: string };
  kind: ShareKind;
  baseline: Baseline;
  rangeDays: number;
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * Resolve o ShareLink pelo token em claro. Devolve null se qualquer coisa
 * impedir (não existe, expirado, revogado). O caller mostra a MESMA tela
 * neutra em todos os casos (docs/03: não vaza existência).
 */
export async function resolverShareLink(token: string) {
  const hash = hashToken(token);
  const link = await db.shareLink.findUnique({
    where: { token: hash },
    include: { brand: { select: { name: true } } },
  });
  if (!link) return null;
  if (link.revokedAt) return null;
  if (link.expiresAt && link.expiresAt < new Date()) return null;
  return link;
}

/** Registra visualização — chamado uma vez por página pública (fire-and-forget). */
export async function registrarVisita(linkId: string) {
  try {
    await db.shareLink.update({
      where: { id: linkId },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    });
  } catch {
    // ignora — não queremos que uma falha de update quebre a página do cliente
  }
}

/**
 * Retorna a lista de posts que este ShareLink expõe. Nunca inclui archived,
 * nunca inclui posts fora do brand. Para DASHBOARD, só posts PUBLISHED
 * (base de comparação é sobre o que já está no ar).
 */
export async function listarPostsDoShare(
  link: { id: string; brandId: string; kind: ShareKind; postIds: string[]; rangeDays: number },
) {
  const posts =
    link.kind === "POSTS"
      ? await db.post.findMany({
          where: { id: { in: link.postIds }, brandId: link.brandId, archivedAt: null },
          orderBy: { scheduledAt: "asc" },
          include: publicInclude(),
        })
      : await db.post.findMany({
          where: {
            brandId: link.brandId,
            archivedAt: null,
            stage: "PUBLISHED",
            publishedAt: { gte: dataInicio(link.rangeDays) },
          },
          orderBy: { publishedAt: "desc" },
          take: 40,
          include: publicInclude(),
        });
  return posts;
}

/**
 * docs/03/08: valida se um postId dado é acessível pelo link.
 * - DASHBOARD: só posts do MESMO brand E JÁ PUBLICADOS.
 * - POSTS: só ids presentes em postIds.
 */
export async function autorizarPostNoShare(
  link: { id: string; brandId: string; kind: ShareKind; postIds: string[] },
  postId: string,
) {
  if (link.kind === "POSTS") {
    if (!link.postIds.includes(postId)) return null;
  }
  const post = await db.post.findFirst({
    where: {
      id: postId,
      brandId: link.brandId,
      archivedAt: null,
      ...(link.kind === "DASHBOARD" ? { stage: "PUBLISHED" as const } : {}),
    },
    include: publicInclude(),
  });
  return post;
}

/** Mapeia o Post do banco para PublicPostView — só campos permitidos (docs/03). */
export async function serializePublicPost(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: any,
): Promise<PublicPostView> {
  const targets: { network: Network; caption: string | null }[] = p.targets ?? [];
  const captions: Partial<Record<Network, string>> = {};
  for (const t of targets) if (t.caption) captions[t.network] = t.caption;

  return {
    id: p.id,
    title: p.title,
    scheduledAt: (p.scheduledAt as Date).toISOString(),
    networks: targets.map((t) => t.network),
    campaign: p.campaign?.name ?? null,
    baseCaption: p.baseCaption ?? "",
    captions,
    media: (p.media ?? []).map((m: { id: string; storageKey: string; thumbnailKey: string | null; kind: "IMAGE" | "VIDEO"; altText: string | null }) => ({
      id: m.id,
      kind: m.kind,
      altText: m.altText,
      url: publicUrl(m.storageKey),
    })),
    permalink: primeiroPermalink(targets as unknown as { permalink?: string | null }[]),
    metrics: null, // Fase 6 traz agregações reais; hoje só a estrutura
    metricSource: "API",
    reachVsBrandAverage: 1,
  };
}

function primeiroPermalink(ts: { permalink?: string | null }[]) {
  const t = ts.find((t) => t.permalink);
  return t?.permalink ?? null;
}

function dataInicio(dias: number) {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
}

function publicInclude() {
  return {
    targets: { select: { network: true, caption: true, permalink: true } },
    campaign: { select: { name: true } },
    media: { orderBy: { position: "asc" as const } },
  };
}

export const BASELINE_LABEL: Record<Baseline, string> = {
  PREVIOUS: "período anterior",
  AVG12W: "média das últimas 12 semanas",
  LAST_YEAR: "mesmo período do ano passado",
};
