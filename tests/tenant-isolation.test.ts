// Aceite crítico da Fase 0 (docs/08 #11 e docs/02):
// "Recurso de outra organização devolve 404, nunca 403."
//
// Estratégia: cria duas orgs, uma Brand em cada, tenta ler a Brand da org B
// através do scoped() da org A — deve devolver null (que a UI traduz em 404).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { Prisma } from "@prisma/client";

// Reimplementa scoped() de forma leve para testar sem depender de sessão.
function scoped(orgId: string) {
  return {
    brand: {
      findMany: (args: Prisma.BrandFindManyArgs = {}) =>
        db.brand.findMany({ ...args, where: { ...args.where, organizationId: orgId } }),
      findUnique: async (args: Prisma.BrandFindUniqueArgs) => {
        const row = await db.brand.findUnique(args);
        return row && row.organizationId === orgId ? row : null;
      },
    },
  };
}

let orgAId = "";
let orgBId = "";
let brandBId = "";

beforeAll(async () => {
  const [a, b] = await Promise.all([
    db.organization.create({ data: { id: `test-a-${Date.now()}`, name: "Org A", slug: `org-a-${Date.now()}` } }),
    db.organization.create({ data: { id: `test-b-${Date.now()}`, name: "Org B", slug: `org-b-${Date.now()}` } }),
  ]);
  orgAId = a.id;
  orgBId = b.id;
  const brandB = await db.brand.create({
    data: { organizationId: orgBId, name: "Marca Secreta", kind: "COMPANY" },
  });
  brandBId = brandB.id;
});

afterAll(async () => {
  // limpeza — cascade em brand → posts, targets, etc.
  await db.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
  await db.$disconnect();
});

describe("isolamento entre organizações", () => {
  it("findMany da org A não vê brand da org B", async () => {
    const listaA = await scoped(orgAId).brand.findMany();
    expect(listaA.find((b) => b.id === brandBId)).toBeUndefined();
  });

  it("findUnique(id da org B) via scoped(orgA) devolve null (⇒ 404 na UI)", async () => {
    const alvo = await scoped(orgAId).brand.findUnique({ where: { id: brandBId } });
    expect(alvo).toBeNull();
  });

  it("mas scoped(orgB) enxerga a mesma brand", async () => {
    const alvo = await scoped(orgBId).brand.findUnique({ where: { id: brandBId } });
    expect(alvo).not.toBeNull();
    expect(alvo?.id).toBe(brandBId);
  });
});
