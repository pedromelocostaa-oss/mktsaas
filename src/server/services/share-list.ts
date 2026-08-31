"use server";

// Server action separada — precisa ser 'use server' para o Client Component
// da lista chamar. `listarShareLinks` já existe em share.ts mas não é action;
// aqui está a versão actionável, que serializa datas.

import { db } from "@/server/db";
import { requireTenant } from "@/server/tenant";

export async function listarShareLinks(brandId: string) {
  const t = await requireTenant();
  const b = await t.brand.findUnique({ where: { id: brandId } });
  if (!b) return [];
  const rows = await db.shareLink.findMany({
    where: { brandId, organizationId: t.orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      kind: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
      viewCount: true,
      lastViewedAt: true,
      postIds: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt?.toISOString() ?? null,
    revokedAt: r.revokedAt?.toISOString() ?? null,
    viewCount: r.viewCount,
    lastViewedAt: r.lastViewedAt?.toISOString() ?? null,
    postIds: r.postIds,
  }));
}
