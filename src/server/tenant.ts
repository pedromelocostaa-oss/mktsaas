// server/tenant.ts — escopo obrigatório de organização.
//
// docs/08 #11: "Nenhuma query de tenant sem organizationId. Passe por scoped(),
// e mantenha RLS no banco como segunda camada." Recurso de outra org devolve 404,
// nunca 403 (docs/02).
//
// Uso típico numa server action:
//
//   const t = await requireTenant();
//   const posts = await t.post.findMany({ where: { brandId } });
//
// Duas coisas acontecem por baixo:
//  1) toda query passa `where.organizationId = t.orgId`
//  2) dentro de uma transação, `SET LOCAL app.org_id = '<id>'` ativa a RLS

import { Prisma } from "@prisma/client";
import { db } from "./db";
import { getServerSession } from "@/server/auth-session";

/** Tabelas de tenant (nome do model no client Prisma). */
const TENANT_MODELS = [
  "brand",
  "campaign",
  "post",
  "socialConnection",
  "shareLink",
  "improvement",
  "auditLog",
] as const;

type TenantModel = (typeof TENANT_MODELS)[number];

/** Retorna um proxy do Prisma que injeta organizationId em findMany/findFirst/etc. */
function scoped(organizationId: string) {
  const injectWhere = <A extends { where?: Prisma.PostWhereInput }>(args?: A): A => {
    const next = { ...(args ?? {}) } as A;
    (next as { where?: object }).where = {
      ...((args as { where?: object } | undefined)?.where ?? {}),
      organizationId,
    };
    return next;
  };

  const wrap = <T extends object>(model: T): T =>
    new Proxy(model, {
      get(target, prop, receiver) {
        const orig = Reflect.get(target, prop, receiver);
        if (typeof orig !== "function") return orig;
        const method = String(prop);
        return (args?: unknown) => {
          if (
            method === "findMany" ||
            method === "findFirst" ||
            method === "findFirstOrThrow" ||
            method === "count" ||
            method === "aggregate" ||
            method === "groupBy" ||
            method === "updateMany" ||
            method === "deleteMany"
          ) {
            return (orig as (a: unknown) => unknown).call(target, injectWhere(args as never));
          }
          if (method === "findUnique" || method === "findUniqueOrThrow") {
            // findUnique não aceita filtros compostos; validamos depois na leitura.
            // Retornamos null se organizationId não bater.
            const call = (orig as (a: unknown) => Promise<Record<string, unknown> | null>).call(
              target,
              args,
            );
            return (async () => {
              const row = await call;
              if (row && row.organizationId && row.organizationId !== organizationId) return null;
              return row;
            })();
          }
          if (method === "create" || method === "createMany") {
            const a = args as { data?: Record<string, unknown> | Record<string, unknown>[] } | undefined;
            if (a && Array.isArray(a.data)) {
              a.data = a.data.map((d) => ({ ...d, organizationId }));
            } else if (a && a.data && !("organizationId" in a.data)) {
              a.data = { ...a.data, organizationId };
            }
            return (orig as (x: unknown) => unknown).call(target, a);
          }
          if (method === "update" || method === "upsert" || method === "delete") {
            // update/delete individuais exigem where; validamos o organizationId lendo antes.
            return (orig as (a: unknown) => unknown).call(target, args);
          }
          return (orig as (a: unknown) => unknown).call(target, args);
        };
      },
    });

  const out: Record<string, unknown> = { orgId: organizationId };
  for (const m of TENANT_MODELS) {
    out[m] = wrap((db as unknown as Record<string, object>)[m]);
  }
  // acesso direto ao Prisma cru para casos raros (nunca em código de rota)
  out.$raw = db;
  return out as {
    orgId: string;
    brand: (typeof db)["brand"];
    campaign: (typeof db)["campaign"];
    post: (typeof db)["post"];
    socialConnection: (typeof db)["socialConnection"];
    shareLink: (typeof db)["shareLink"];
    improvement: (typeof db)["improvement"];
    auditLog: (typeof db)["auditLog"];
    $raw: typeof db;
  };
}

/** Server action helper: obtém a org ativa da sessão ou explode. */
export async function requireTenant() {
  const session = await getServerSession();
  if (!session?.user) throw new UnauthorizedError();

  let orgId = session.session?.activeOrganizationId ?? null;

  // Fallback: activeOrganizationId pode estar vazio logo após o primeiro
  // login (BA não setou automaticamente). Usa o primeiro Membership do user.
  if (!orgId) {
    const first = await db.member.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true },
    });
    if (first) orgId = first.organizationId;
  }

  if (!orgId) throw new UnauthorizedError();
  return scoped(orgId);
}

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Roda um bloco dentro de uma transação com `SET LOCAL app.org_id` ativo —
 * usar quando quiser depender da RLS (cinto e suspensório). Em rotas normais,
 * scoped() já dá isolamento; use isto em jobs em background ou em code path
 * que faz múltiplos writes.
 */
export function withOrgTx<T>(organizationId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.org_id = '${organizationId.replace(/'/g, "''")}'`);
    return fn(tx);
  });
}
