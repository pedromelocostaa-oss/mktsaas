"use server";

// Notificações in-app (Grupo 3 do backlog).
// Coexiste com e-mail — os dois canais respeitam a mesma preferência em
// User.notifPrefs (docs/07: "preferências que de fato desligam o envio").
// Labels/tipos ficam em lib/notif-labels.ts (arquivos "use server" só podem
// exportar async functions).

import { db } from "@/server/db";
import { getServerSession } from "@/server/auth-session";
import { KIND_TO_PREF, type CanalAviso } from "@/lib/notif-labels";
import type { NotificationKind } from "@prisma/client";

/**
 * Consulta preferência. Null/undefined = tudo ligado (default docs/07).
 * Devolve false só quando a pref existe e está explicitamente desligada.
 */
export async function podeAvisar(userId: string, kind: NotificationKind): Promise<boolean> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { notifPrefs: true } });
  const prefs = (u?.notifPrefs as Partial<Record<CanalAviso, boolean>> | null) ?? {};
  const canal = KIND_TO_PREF[kind];
  return prefs[canal] !== false;
}

interface CriarInput {
  userId: string;
  organizationId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Cria uma notificação in-app. Silenciosamente ignora se a pref do usuário
 * estiver desligada. Fire-and-forget: chamadores não devem esperar por isto.
 */
export async function criarNotificacao(input: CriarInput) {
  const ok = await podeAvisar(input.userId, input.kind);
  if (!ok) return { ok: true as const, skipped: true as const };
  await db.notification.create({
    data: {
      userId: input.userId,
      organizationId: input.organizationId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      href: input.href,
      metadata: input.metadata as never,
    },
  });
  return { ok: true as const, skipped: false as const };
}

export async function listarMinhas(limite = 20) {
  const session = await getServerSession();
  if (!session?.user) return { itens: [], naoLidas: 0 };
  const [itens, naoLidas] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limite,
    }),
    db.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ]);
  return {
    itens: itens.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      href: n.href,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    naoLidas,
  };
}

export async function marcarLida(id: string) {
  const session = await getServerSession();
  if (!session?.user) return { ok: false as const };
  await db.notification.updateMany({
    where: { id, userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true as const };
}

export async function marcarTodasLidas() {
  const session = await getServerSession();
  if (!session?.user) return { ok: false as const };
  await db.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true as const };
}

export async function pegarPreferencias() {
  const session = await getServerSession();
  if (!session?.user) return null;
  const u = await db.user.findUnique({
    where: { id: session.user.id },
    select: { notifPrefs: true },
  });
  const raw = (u?.notifPrefs as Partial<Record<CanalAviso, boolean>> | null) ?? {};
  return {
    approvals: raw.approvals !== false,
    publishing: raw.publishing !== false,
    shares: raw.shares !== false,
    connections: raw.connections !== false,
  };
}

export async function salvarPreferencias(prefs: Record<CanalAviso, boolean>) {
  const session = await getServerSession();
  if (!session?.user) return { ok: false as const };
  await db.user.update({
    where: { id: session.user.id },
    data: { notifPrefs: prefs as never },
  });
  return { ok: true as const };
}
