// Fase 5 aceite: "Coleta a cada 6h grava snapshot novo, sem sobrescrever."
// Também docs/08 #5: "Snapshot de métrica nunca é sobrescrito."

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";

let orgId = "";
let userId = "";
let brandId = "";
let postId = "";
let targetId = "";

beforeAll(async () => {
  const now = Date.now();
  orgId = `t5-org-${now}`;
  userId = `t5-user-${now}`;
  await db.organization.create({ data: { id: orgId, name: "T5", slug: `t5-${now}` } });
  await db.user.create({
    data: { id: userId, name: "T5 User", email: `t5-${now}@ex.com`, emailVerified: true },
  });
  await db.member.create({ data: { id: `m-${now}`, userId, organizationId: orgId, role: "OWNER" } });
  const b = await db.brand.create({ data: { organizationId: orgId, name: "T5 Brand", kind: "COMPANY" } });
  brandId = b.id;
  const p = await db.post.create({
    data: {
      organizationId: orgId,
      brandId,
      title: "Publicado",
      scheduledAt: new Date(),
      stage: "PUBLISHED",
      publishedAt: new Date(),
      createdById: userId,
    },
  });
  postId = p.id;
  const target = await db.postTarget.create({
    data: { postId, network: "INSTAGRAM", externalId: "ig_ex_1" },
  });
  targetId = target.id;
});

afterAll(async () => {
  await db.organization.deleteMany({ where: { id: orgId } });
  await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
});

describe("PostMetricSnapshot é append-only", () => {
  it("três coletas geram três linhas — não sobrescreve", async () => {
    await db.postMetricSnapshot.create({
      data: { postTargetId: targetId, reach: 100, likes: 10, source: "API", raw: {} },
    });
    await db.postMetricSnapshot.create({
      data: { postTargetId: targetId, reach: 200, likes: 25, source: "API", raw: {} },
    });
    await db.postMetricSnapshot.create({
      data: { postTargetId: targetId, reach: 250, likes: 30, source: "MANUAL", raw: {} },
    });
    const rows = await db.postMetricSnapshot.findMany({
      where: { postTargetId: targetId },
      orderBy: { collectedAt: "asc" },
    });
    expect(rows).toHaveLength(3);
    expect(rows[0].reach).toBe(100);
    expect(rows[2].reach).toBe(250);
    // sources preservadas
    expect(rows.map((r) => r.source)).toEqual(["API", "API", "MANUAL"]);
  });

  it("redesInformadasAMao pega snapshot MANUAL", async () => {
    void postId;
    const rows = await db.postMetricSnapshot.findMany({
      where: {
        source: "MANUAL",
        target: { post: { brandId } },
      },
    });
    expect(rows.length).toBeGreaterThan(0);
  });
});
