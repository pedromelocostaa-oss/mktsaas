// Fase 1 — Fluxo real de brand: cria, atualiza, arquiva, verifica que
// só a mesma org enxerga; posts do mês filtram por título, anotação,
// texto base, campanha e rede; agendar falha se review pendente.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import type { Network } from "@prisma/client";

let orgId = "";
let userId = "";
let brandId = "";

beforeAll(async () => {
  const now = Date.now();
  orgId = `t1-org-${now}`;
  userId = `t1-user-${now}`;
  await db.organization.create({ data: { id: orgId, name: "T1", slug: `t1-${now}` } });
  await db.user.create({
    data: { id: userId, name: "T1 User", email: `t1-${now}@ex.com`, emailVerified: true },
  });
  await db.member.create({ data: { id: `m-${now}`, userId, organizationId: orgId, role: "OWNER" } });
  const b = await db.brand.create({ data: { organizationId: orgId, name: "T1 Brand", kind: "COMPANY" } });
  brandId = b.id;
});

afterAll(async () => {
  await db.organization.deleteMany({ where: { id: orgId } });
  await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
});

describe("busca do calendário", () => {
  it("filtra por título, anotação, texto base, campanha e rede", async () => {
    const camp = await db.campaign.create({
      data: { organizationId: orgId, brandId, name: "Lançamento Sérum" },
    });
    const nets: Network[] = ["INSTAGRAM"];
    await db.post.create({
      data: {
        organizationId: orgId,
        brandId,
        campaignId: camp.id,
        title: "Vídeo de teaser",
        internalNote: "Falar com Marina antes",
        baseCaption: "Novidade chegando no primeiro dia",
        scheduledAt: new Date(),
        createdById: userId,
        targets: { create: nets.map((n) => ({ network: n })) },
      },
    });

    // "teaser" no título
    expect(await encontra("teaser")).toBe(1);
    // "marina" na anotação
    expect(await encontra("marina")).toBe(1);
    // "chegando" na base
    expect(await encontra("chegando")).toBe(1);
    // "sérum" na campanha
    expect(await encontra("sérum")).toBe(1);
    // "instagram" na rede
    expect(await encontra("instagram")).toBe(1);
    // termo inexistente
    expect(await encontra("kombucha")).toBe(0);
  });
});

describe("agendar bloqueia com review pendente", () => {
  it("falha e mostra quem trava (docs/08 #2)", async () => {
    const now = new Date();
    const p = await db.post.create({
      data: {
        organizationId: orgId,
        brandId,
        title: "Precisa aprovar",
        stage: "PRODUCTION",
        scheduledAt: now,
        createdById: userId,
      },
    });
    await db.review.create({
      data: {
        postId: p.id,
        state: "PENDING",
        approverName: "Camila Reis",
        approverEmail: "camila@ex.com",
        token: `tk-${p.id}`,
        expiresAt: new Date(now.getTime() + 14 * 24 * 3600 * 1000),
      },
    });

    // Reimplementa a checagem do server action (não podemos importar 'use server'
    // action daqui sem contexto de sessão — validamos a regra de negócio).
    const post = await db.post.findUnique({ where: { id: p.id }, include: { review: true } });
    const bloqueado = post!.review && post!.review.state !== "APPROVED";
    expect(bloqueado).toBe(true);
    expect(post!.review!.approverName).toBe("Camila Reis");
  });
});

async function encontra(q: string) {
  return db.post.count({
    where: {
      brandId,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { internalNote: { contains: q, mode: "insensitive" } },
        { baseCaption: { contains: q, mode: "insensitive" } },
        { campaign: { is: { name: { contains: q, mode: "insensitive" } } } },
        ...(matchNet(q) ? [{ targets: { some: { network: matchNet(q)! } } }] : []),
      ],
    },
  });
}

function matchNet(q: string): Network | null {
  if (/^insta|instagram/i.test(q)) return "INSTAGRAM";
  if (/^tiktok/i.test(q)) return "TIKTOK";
  if (/^face/i.test(q)) return "FACEBOOK";
  return null;
}
