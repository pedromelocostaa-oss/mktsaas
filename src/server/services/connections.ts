"use server";

// connections.* — docs/03 (Fase 5).
// Guarda tokens SEMPRE cifrados (docs/08 #10). O nonce de state guarda a
// pertinência do brand + user + rede, evitando que a callback grave conexão
// no brand errado.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireTenant } from "@/server/tenant";
import { getServerSession } from "@/server/auth-session";
import { adapterFor, isAutomatic } from "@/server/social";
import { encryptToken } from "@/lib/crypto";
import { novoToken, hashToken } from "@/lib/token";
import type { Network } from "@prisma/client";

const startSchema = z.object({
  brandId: z.string(),
  network: z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "LINKEDIN", "X"]),
});

/**
 * Passo 1 do OAuth. Guarda um "state" em OAuthState (curta duração) e devolve
 * a URL para o browser. Se a rede não é automática, devolve null e a UI
 * navega para "Nova entrada manual" no drawer/post.
 */
export async function iniciarOAuth(input: z.infer<typeof startSchema>) {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "erro" };

  const s = await getServerSession();
  if (!s?.user) return { ok: false as const, error: "sem_sessao" };
  const t = await requireTenant();

  const b = await t.brand.findUnique({ where: { id: parsed.data.brandId } });
  if (!b) return { ok: false as const, error: "not_found" };

  if (!isAutomatic(parsed.data.network)) {
    return { ok: false as const, error: "manual_only" };
  }

  const state = novoToken();
  await db.oAuthState.create({
    data: {
      stateHash: hashToken(state),
      organizationId: t.orgId,
      brandId: b.id,
      network: parsed.data.network as Network,
      userId: s.user.id,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const url = adapterFor(parsed.data.network).authUrl(b.id, state);
  if (!url) {
    return {
      ok: false as const,
      error: "META_APP_ID/SECRET ausentes. Preencha .env.local para conectar Instagram/Facebook.",
    };
  }
  return { ok: true as const, url };
}

/** Passo 2 do OAuth — chamado pelo route handler /api/oauth/[net]/callback. */
export async function finalizarOAuth(opts: { network: Network; code: string; state: string; redirectUri: string }) {
  const st = await db.oAuthState.findUnique({ where: { stateHash: hashToken(opts.state) } });
  if (!st) return { ok: false as const, error: "state_invalido" };
  if (st.expiresAt < new Date()) {
    await db.oAuthState.delete({ where: { stateHash: st.stateHash } }).catch(() => {});
    return { ok: false as const, error: "state_expirado" };
  }
  if (st.network !== opts.network) return { ok: false as const, error: "state_desalinhado" };

  let tokens;
  try {
    tokens = await adapterFor(opts.network).exchangeCode(opts.code, opts.redirectUri);
  } catch (e) {
    await db.oAuthState.delete({ where: { stateHash: st.stateHash } }).catch(() => {});
    return { ok: false as const, error: `oauth: ${String(e instanceof Error ? e.message : e)}` };
  }

  // Salva/atualiza a conexão. accessToken cifrado.
  await db.socialConnection.upsert({
    where: { brandId_network: { brandId: st.brandId, network: opts.network } },
    create: {
      organizationId: st.organizationId,
      brandId: st.brandId,
      network: opts.network,
      externalId: tokens.externalId,
      displayName: tokens.displayName ?? null,
      accessToken: encryptToken(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
      expiresAt: tokens.expiresAt ?? null,
      scopes: tokens.scopes ?? [],
      status: "ACTIVE",
      lastSyncAt: null,
      lastSyncError: null,
    },
    update: {
      externalId: tokens.externalId,
      displayName: tokens.displayName ?? null,
      accessToken: encryptToken(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
      expiresAt: tokens.expiresAt ?? null,
      status: "ACTIVE",
      lastSyncError: null,
    },
  });

  await db.oAuthState.delete({ where: { stateHash: st.stateHash } }).catch(() => {});
  await db.auditLog.create({
    data: {
      organizationId: st.organizationId,
      actorId: st.userId,
      action: "connection.connected",
      targetType: "social_connection",
      targetId: `${st.brandId}:${opts.network}`,
      metadata: { network: opts.network },
    },
  });

  revalidatePath("/", "layout");
  return { ok: true as const, brandId: st.brandId };
}

export async function desconectar(brandId: string, network: Network) {
  const t = await requireTenant();
  const conn = await db.socialConnection.findFirst({
    where: { brandId, network, organizationId: t.orgId },
  });
  if (!conn) return { ok: false as const, error: "not_found" };

  await db.socialConnection.delete({ where: { id: conn.id } });
  await db.auditLog.create({
    data: {
      organizationId: t.orgId,
      actorId: null,
      action: "connection.disconnected",
      targetType: "social_connection",
      targetId: conn.id,
      metadata: { network },
    },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
