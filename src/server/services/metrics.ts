"use server";

// metrics.* — Fase 5 (docs/03).
// - metrics.collect roda a cada 6h por conexão ativa. NUNCA sobrescreve
//   snapshot (docs/08 #5, docs/05 depreciação).
// - metrics.backfill roda ao conectar (30 dias).
// - metrics.enterManual grava com source=MANUAL — o relatório cita no rodapé.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireTenant } from "@/server/tenant";
import { adapterFor } from "@/server/social";
import { AdapterError } from "@/server/social/adapter";
import type { Network, SocialConnection } from "@prisma/client";

/** Backfill dos últimos N dias ao conectar. */
export async function limparBackfill(opts: { brandId: string; network: Network; dias?: number }) {
  const conn = await db.socialConnection.findFirst({
    where: { brandId: opts.brandId, network: opts.network, status: "ACTIVE" },
  });
  if (!conn) return { ok: false as const, error: "conexao_inexistente" };

  const to = new Date();
  const from = new Date(to.getTime() - (opts.dias ?? 30) * 24 * 60 * 60 * 1000);
  try {
    await coletarDiario(conn, from, to);
    return { ok: true as const };
  } catch (e) {
    await db.socialConnection.update({
      where: { id: conn.id },
      data: { lastSyncError: e instanceof Error ? e.message : String(e) },
    });
    return { ok: false as const, error: "falha_backfill" };
  }
}

/**
 * Roda o ciclo de coleta em TODAS as conexões automáticas ativas.
 * Chamado pelo cron. Nunca joga erro para cima: falha por conexão marca
 * lastSyncError e segue para a próxima.
 */
export async function coletarTodas(): Promise<{ processadas: number; falharam: number; snapshots: number }> {
  const conns = await db.socialConnection.findMany({ where: { status: "ACTIVE" } });
  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
  ontem.setHours(0, 0, 0, 0);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let processadas = 0;
  let falharam = 0;
  let snapshots = 0;

  for (const conn of conns) {
    if (!adapterFor(conn.network).automatic) continue;
    processadas++;
    try {
      const diarios = await coletarDiario(conn, ontem, hoje);
      const posts = await coletarPostsPublicados(conn);
      snapshots += diarios + posts;
      await db.socialConnection.update({
        where: { id: conn.id },
        data: { lastSyncAt: new Date(), lastSyncError: null },
      });
    } catch (e) {
      falharam++;
      await db.socialConnection.update({
        where: { id: conn.id },
        data: {
          lastSyncError: e instanceof Error ? e.message : String(e),
          status: e instanceof AdapterError && e.code === "refresh" ? "ERROR" : conn.status,
        },
      });
    }
  }

  return { processadas, falharam, snapshots };
}

async function coletarDiario(conn: SocialConnection, from: Date, to: Date): Promise<number> {
  const linhas = await adapterFor(conn.network).fetchProfileDaily(conn, from, to);
  let n = 0;
  for (const l of linhas) {
    // upsert em (brandId, network, date). BrandDailyMetric é agregação diária —
    // pode ser sobrescrita (é o valor final do dia), diferente do PostMetricSnapshot.
    await db.brandDailyMetric.upsert({
      where: { brandId_network_date: { brandId: conn.brandId, network: conn.network, date: l.date } },
      create: {
        brandId: conn.brandId,
        network: conn.network,
        date: l.date,
        reach: l.reach,
        engagement: l.engagement,
        followers: l.followers,
        followersDelta: l.followersDelta,
        source: "API",
      },
      update: {
        reach: l.reach,
        engagement: l.engagement,
        followers: l.followers,
        followersDelta: l.followersDelta,
      },
    });
    n++;
  }
  return n;
}

async function coletarPostsPublicados(conn: SocialConnection): Promise<number> {
  const targets = await db.postTarget.findMany({
    where: {
      network: conn.network,
      externalId: { not: null },
      post: { brandId: conn.brandId, stage: "PUBLISHED", archivedAt: null },
    },
    take: 50,
  });
  let n = 0;
  for (const t of targets) {
    if (!t.externalId) continue;
    try {
      const m = await adapterFor(conn.network).fetchPostMetrics(conn, t.externalId);
      // Sempre CREATE: histórico intocado (docs/08 #5).
      await db.postMetricSnapshot.create({
        data: {
          postTargetId: t.id,
          reach: m.reach ?? undefined,
          views: m.views ?? undefined,
          likes: m.likes ?? undefined,
          comments: m.comments ?? undefined,
          shares: m.shares ?? undefined,
          saves: m.saves ?? undefined,
          raw: m.raw as never,
          source: "API",
        },
      });
      n++;
    } catch {
      // segue para o próximo target — não deve derrubar a coleta inteira
    }
  }
  return n;
}

const manualSchema = z.object({
  postTargetId: z.string(),
  reach: z.number().int().min(0).optional(),
  views: z.number().int().min(0).optional(),
  likes: z.number().int().min(0).optional(),
  comments: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
  saves: z.number().int().min(0).optional(),
});

/**
 * Entrada manual de métricas para redes sem API (docs/05).
 * O relatório marca no rodapé quais números vieram à mão (aceite Fase 5).
 */
export async function enterManualMetrics(input: z.infer<typeof manualSchema>) {
  const parsed = manualSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "erro" };
  const t = await requireTenant();

  // Confere pertinência: o postTarget precisa ser de um post da minha org.
  const target = await db.postTarget.findFirst({
    where: { id: parsed.data.postTargetId, post: { organizationId: t.orgId } },
  });
  if (!target) return { ok: false as const, error: "not_found" };

  await db.postMetricSnapshot.create({
    data: {
      postTargetId: target.id,
      reach: parsed.data.reach,
      views: parsed.data.views,
      likes: parsed.data.likes,
      comments: parsed.data.comments,
      shares: parsed.data.shares,
      saves: parsed.data.saves,
      raw: parsed.data as never,
      source: "MANUAL",
    },
  });
  await db.postTarget.update({ where: { id: target.id }, data: { metricSource: "MANUAL" } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/**
 * Retorna as redes que têm ALGUM snapshot MANUAL no período — usado no rodapé
 * do relatório compartilhado.
 */
export async function redesInformadasAMao(brandId: string, dias: number): Promise<Network[]> {
  const since = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  const rows = await db.postMetricSnapshot.findMany({
    where: {
      source: "MANUAL",
      collectedAt: { gte: since },
      target: { post: { brandId } },
    },
    select: { target: { select: { network: true } } },
    take: 500,
  });
  const set = new Set<Network>();
  for (const r of rows) set.add(r.target.network as Network);
  return [...set];
}
