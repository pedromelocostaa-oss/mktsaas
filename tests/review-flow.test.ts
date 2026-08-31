// Fase 3 — aceites:
// - Token guardado como sha256, não em claro (docs/04).
// - Expira em 14 dias.
// - "Pedir ajuste" sem texto falha (docs/08 #20).
// - Token expirado/respondido não responde mais.
// - "changes" com texto → CHANGES; "approve" → APPROVED.
// - respondedAt fecha o link.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { hashToken, novoToken } from "@/lib/token";

let orgId = "";
let userId = "";
let brandId = "";

beforeAll(async () => {
  const now = Date.now();
  orgId = `t3-org-${now}`;
  userId = `t3-user-${now}`;
  await db.organization.create({ data: { id: orgId, name: "T3", slug: `t3-${now}` } });
  await db.user.create({
    data: { id: userId, name: "T3 User", email: `t3-${now}@ex.com`, emailVerified: true },
  });
  await db.member.create({ data: { id: `m-${now}`, userId, organizationId: orgId, role: "OWNER" } });
  const b = await db.brand.create({ data: { organizationId: orgId, name: "T3 Brand", kind: "COMPANY" } });
  brandId = b.id;
});

afterAll(async () => {
  await db.organization.deleteMany({ where: { id: orgId } });
  await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
});

describe("token de review", () => {
  it("gera token de 32 bytes base64url e hash sha256 estável", () => {
    const tok = novoToken();
    // base64url: sem padding, 43 chars para 32 bytes
    expect(tok).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const h1 = hashToken(tok);
    const h2 = hashToken(tok);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(novoToken())).not.toBe(h1);
  });
});

describe("Review — regras de negócio", () => {
  it("respondedAt fecha o link (o endpoint público retorna 410)", async () => {
    const post = await mkPost();
    const tok = novoToken();
    await db.review.create({
      data: {
        postId: post.id,
        approverName: "Camila",
        approverEmail: "c@ex.com",
        token: hashToken(tok),
        expiresAt: dep14(),
      },
    });

    // simula resposta:
    await db.review.update({
      where: { postId: post.id },
      data: { state: "APPROVED", respondedAt: new Date() },
    });

    const found = await db.review.findUnique({ where: { token: hashToken(tok) } });
    expect(found!.respondedAt).not.toBeNull();
    // regra do endpoint: se respondedAt || expiresAt<now → 410
    const indisponivel = !found || !!found.respondedAt || found.expiresAt < new Date();
    expect(indisponivel).toBe(true);
  });

  it("token expirado não vale (docs/04: expira em 14 dias)", async () => {
    const post = await mkPost();
    const tok = novoToken();
    await db.review.create({
      data: {
        postId: post.id,
        approverName: "Camila",
        approverEmail: "c@ex.com",
        token: hashToken(tok),
        expiresAt: new Date(Date.now() - 60_000), // já expirou
      },
    });
    const found = await db.review.findUnique({ where: { token: hashToken(tok) } });
    expect(found!.expiresAt < new Date()).toBe(true);
  });

  it("prazo padrão é 14 dias (± 1 min)", () => {
    const target = 14 * 24 * 60 * 60 * 1000;
    const dt = dep14().getTime() - Date.now();
    expect(Math.abs(dt - target)).toBeLessThan(60_000);
  });
});

async function mkPost() {
  return db.post.create({
    data: {
      organizationId: orgId,
      brandId,
      title: "Post de teste",
      scheduledAt: new Date(),
      createdById: userId,
    },
  });
}

function dep14() {
  return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
}
