// Leituras usadas nas telas. Sempre via scoped().

import { db } from "@/server/db";
import { requireTenant } from "@/server/tenant";
import type { Network } from "@prisma/client";

export async function listarBrandsAtivas() {
  const t = await requireTenant();
  return t.brand.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: "asc" },
    include: { connections: { select: { network: true } } },
  });
}

export async function listarBrandsArquivadas() {
  const t = await requireTenant();
  return t.brand.findMany({
    where: { archivedAt: { not: null } },
    orderBy: { archivedAt: "desc" },
  });
}

export async function pegarBrand(brandId: string) {
  const t = await requireTenant();
  const b = await t.brand.findUnique({
    where: { id: brandId },
    include: { connections: { select: { network: true } } },
  });
  return b;
}

/** Posts do mês, com filtro opcional de busca (título, anotação, base, campanha, rede). */
export async function listarPostsDoMes(brandId: string, ancoraDoMes: Date, query?: string) {
  const t = await requireTenant();

  const inicio = new Date(ancoraDoMes.getFullYear(), ancoraDoMes.getMonth(), 1);
  const fim = new Date(ancoraDoMes.getFullYear(), ancoraDoMes.getMonth() + 1, 1);

  const q = query?.trim().toLowerCase();
  const netEnum = q ? matchNetwork(q) : null;

  const where: import("@prisma/client").Prisma.PostWhereInput = {
    brandId,
    archivedAt: null,
    scheduledAt: { gte: inicio, lt: fim },
  };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { internalNote: { contains: q, mode: "insensitive" } },
      { baseCaption: { contains: q, mode: "insensitive" } },
      { campaign: { is: { name: { contains: q, mode: "insensitive" } } } },
      ...(netEnum ? [{ targets: { some: { network: netEnum } } }] : []),
    ];
  }

  return t.post.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
    include: {
      targets: { select: { network: true, caption: true } },
      review: { select: { state: true, approverName: true } },
      campaign: { select: { name: true } },
    },
  });
}

const NET_ALIASES: Array<[Network, RegExp]> = [
  ["INSTAGRAM", /^insta|instagram/i],
  ["TIKTOK", /^tiktok/i],
  ["FACEBOOK", /^face|facebook/i],
  ["YOUTUBE", /^you|youtube|yt/i],
  ["LINKEDIN", /^linked|linkedin/i],
  ["X", /^x$|^twitter$/i],
];
function matchNetwork(q: string): Network | null {
  for (const [n, r] of NET_ALIASES) if (r.test(q)) return n;
  return null;
}

/** Contagens do rodapé — para "Esta é sua Nª conta". */
export async function contarContasAtivas() {
  const t = await requireTenant();
  return t.brand.count({ where: { archivedAt: null } });
}

/** Membership + organização, com plano e includedBrands. */
export async function pegarOrgAtiva() {
  const t = await requireTenant();
  return db.organization.findUnique({ where: { id: t.orgId } });
}

/**
 * Resolve caption efetiva de um target: usa `caption` quando não é null,
 * senão herda o `baseCaption` do post.
 */
export function captionEfetiva(baseCaption: string, targetCaption: string | null | undefined) {
  return targetCaption ?? baseCaption;
}
