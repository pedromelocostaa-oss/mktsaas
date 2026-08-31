"use server";

// brands.* — server actions (docs/03). Escopo garantido por scoped() (docs/02 #11).
// Auditoria e revalidação da rota vêm por default.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireTenant } from "@/server/tenant";
import { getServerSession } from "@/server/auth-session";
import type { Network } from "@prisma/client";

const createSchema = z.object({
  name: z.string().trim().min(2, "O nome precisa ter pelo menos 2 caracteres."),
  kind: z.enum(["COMPANY", "PERSON"]),
  handle: z.string().trim().optional(),
  defaultApprover: z.string().trim().email().optional().or(z.literal("")),
});

export async function criarBrand(input: z.infer<typeof createSchema>) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Erro." };

  const t = await requireTenant();

  const brand = await db.brand.create({
    data: {
      organizationId: t.orgId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      handle: parsed.data.handle || null,
      defaultApprover: parsed.data.defaultApprover || null,
    },
  });

  await auditar(t.orgId, "brand.created", "brand", brand.id, { name: brand.name });
  revalidatePath("/", "layout");
  return { ok: true as const, brandId: brand.id };
}

export async function arquivarBrand(brandId: string) {
  const t = await requireTenant();
  // valida a pertinência lendo primeiro pelo scoped — 404-safe
  const existing = await t.brand.findUnique({ where: { id: brandId } });
  if (!existing) return { ok: false as const, error: "not_found" };
  const before = existing.archivedAt;

  await db.brand.update({ where: { id: brandId }, data: { archivedAt: new Date() } });
  await auditar(t.orgId, "brand.archived", "brand", brandId, { name: existing.name });
  revalidatePath("/", "layout");
  return { ok: true as const, restoredFrom: before };
}

export async function desarquivarBrand(brandId: string) {
  const t = await requireTenant();
  const existing = await t.brand.findUnique({ where: { id: brandId } });
  if (!existing) return { ok: false as const, error: "not_found" };

  await db.brand.update({ where: { id: brandId }, data: { archivedAt: null } });
  await auditar(t.orgId, "brand.restored", "brand", brandId, { name: existing.name });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Verifica se já existe uma conta ativa com esse nome. */
export async function checarNomeDuplicado(name: string) {
  const t = await requireTenant();
  const exists = await t.brand.findFirst({
    where: {
      name: { equals: name.trim(), mode: "insensitive" },
      archivedAt: null,
    },
  });
  return { duplicado: !!exists };
}

async function auditar(
  organizationId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>,
) {
  const s = await getServerSession();
  await db.auditLog.create({
    data: {
      organizationId,
      actorId: s?.user?.id ?? null,
      action,
      targetType,
      targetId,
      metadata: metadata as never,
    },
  });
}

/** Conexão inicial vinda do wizard — só grava displayName; OAuth real é Fase 5. */
export async function conectarPlaceholder(brandId: string, network: Network, displayName: string) {
  const t = await requireTenant();
  const brand = await t.brand.findUnique({ where: { id: brandId } });
  if (!brand) return { ok: false as const, error: "not_found" };

  // marcamos como MANUAL até o OAuth real; token vazio (não-nulo por constraint).
  await db.socialConnection.upsert({
    where: { brandId_network: { brandId, network } },
    create: {
      organizationId: t.orgId,
      brandId,
      network,
      externalId: `manual:${brandId}:${network}`,
      displayName,
      accessToken: "",
      status: "ACTIVE",
    },
    update: { displayName, status: "ACTIVE" },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
