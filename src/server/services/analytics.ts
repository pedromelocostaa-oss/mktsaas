// Agregações do painel (Fase 6, docs/09).
// Fonte: BrandDailyMetric (diário por conta e rede) + PostMetricSnapshot.
//
// Regras (docs/08 #5, #16, #27, #28):
// - Base de comparação é EXPLÍCITA e sai impressa no relatório.
// - Filtro de rede recalcula o herói e o rótulo.
// - Sempre `tabular-nums` na UI (garantido nas classes .tabular do globals.css).

import { db } from "@/server/db";
import { requireTenant } from "@/server/tenant";
import type { Baseline, Network } from "@prisma/client";

export interface HeroeInput {
  brandId: string;
  rangeDays: number;
  network: Network | null;
  baseline: Baseline;
}

export interface HeroeSaida {
  reach: number;
  reachAnterior: number;
  deltaPct: number | null; // null quando anterior=0
  engagement: number;
  engagementRate: number | null; // engajamento/alcance
  newFollowers: number;
  postsPublicados: number;
  serieAtual: { date: string; reach: number; engagement: number }[];
  serieAnterior: { date: string; reach: number; engagement: number }[];
  quebraPorRede: { network: Network; reach: number; percent: number }[];
  topPosts: TopPost[];
}

export interface TopPost {
  id: string;
  title: string;
  scheduledAt: string;
  networks: Network[];
  reach: number;
  interactions: number;
  taxa: number | null;
}

export async function calcularHeroe(input: HeroeInput): Promise<HeroeSaida> {
  const t = await requireTenant();
  const brand = await t.brand.findUnique({ where: { id: input.brandId } });
  if (!brand) throw new Error("not_found");

  const hoje = fimDoDia(new Date());
  const inicioAtual = new Date(hoje.getTime() - (input.rangeDays - 1) * 86400_000);
  inicioAtual.setHours(0, 0, 0, 0);

  const { inicioBase, fimBase } = janelaBase(input.baseline, inicioAtual, hoje, input.rangeDays);

  const [atual, anterior] = await Promise.all([
    lerSerieDiaria(input.brandId, input.network, inicioAtual, hoje),
    lerSerieDiaria(input.brandId, input.network, inicioBase, fimBase),
  ]);

  const reach = soma(atual, (r) => r.reach);
  const reachAnterior = soma(anterior, (r) => r.reach);
  const deltaPct = reachAnterior === 0 ? null : ((reach - reachAnterior) / reachAnterior) * 100;
  const engagement = soma(atual, (r) => r.engagement);
  const engagementRate = reach === 0 ? null : engagement / reach;

  const [newFollowers, postsPublicados, quebra, top] = await Promise.all([
    somarFollowersDelta(input.brandId, input.network, inicioAtual, hoje),
    contarPostsPublicados(input.brandId, inicioAtual, hoje, input.network),
    quebraPorRede(input.brandId, inicioAtual, hoje),
    topPostsPorAlcance(input.brandId, inicioAtual, hoje, input.network),
  ]);

  return {
    reach,
    reachAnterior,
    deltaPct,
    engagement,
    engagementRate,
    newFollowers,
    postsPublicados,
    serieAtual: agregarPorDia(atual),
    serieAnterior: agregarPorDia(anterior),
    quebraPorRede: quebra,
    topPosts: top,
  };
}

/** Janela para a base de comparação (docs/08 #16). */
function janelaBase(baseline: Baseline, inicioAtual: Date, fim: Date, rangeDays: number) {
  switch (baseline) {
    case "PREVIOUS": {
      const fimBase = new Date(inicioAtual.getTime() - 1);
      const inicioBase = new Date(fimBase.getTime() - (rangeDays - 1) * 86400_000);
      inicioBase.setHours(0, 0, 0, 0);
      return { inicioBase, fimBase };
    }
    case "AVG12W": {
      // 12 semanas antes de HOJE, mesma extensão de dias
      const fimBase = new Date(inicioAtual.getTime() - 1);
      const inicioBase = new Date(fimBase.getTime() - 12 * 7 * 86400_000);
      inicioBase.setHours(0, 0, 0, 0);
      return { inicioBase, fimBase };
    }
    case "LAST_YEAR": {
      const inicioBase = new Date(inicioAtual);
      inicioBase.setFullYear(inicioBase.getFullYear() - 1);
      const fimBase = new Date(fim);
      fimBase.setFullYear(fimBase.getFullYear() - 1);
      return { inicioBase, fimBase };
    }
  }
}

async function lerSerieDiaria(
  brandId: string,
  network: Network | null,
  ini: Date,
  fim: Date,
) {
  return db.brandDailyMetric.findMany({
    where: {
      brandId,
      ...(network ? { network } : {}),
      date: { gte: normalizeDia(ini), lte: normalizeDia(fim) },
    },
    orderBy: { date: "asc" },
  });
}

/** Agrega N registros (uma linha por rede-dia) em uma linha por dia. */
function agregarPorDia(rows: { date: Date; reach: number; engagement: number }[]) {
  const m = new Map<string, { date: string; reach: number; engagement: number }>();
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10);
    const cur = m.get(key) ?? { date: key, reach: 0, engagement: 0 };
    cur.reach += r.reach;
    cur.engagement += r.engagement;
    m.set(key, cur);
  }
  return [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function somarFollowersDelta(
  brandId: string,
  network: Network | null,
  ini: Date,
  fim: Date,
) {
  const rows = await db.brandDailyMetric.findMany({
    where: {
      brandId,
      ...(network ? { network } : {}),
      date: { gte: normalizeDia(ini), lte: normalizeDia(fim) },
    },
    select: { followersDelta: true },
  });
  return rows.reduce((acc, r) => acc + r.followersDelta, 0);
}

async function contarPostsPublicados(brandId: string, ini: Date, fim: Date, network: Network | null) {
  return db.post.count({
    where: {
      brandId,
      archivedAt: null,
      stage: "PUBLISHED",
      publishedAt: { gte: ini, lte: fim },
      ...(network ? { targets: { some: { network } } } : {}),
    },
  });
}

async function quebraPorRede(brandId: string, ini: Date, fim: Date): Promise<HeroeSaida["quebraPorRede"]> {
  const rows = await db.brandDailyMetric.groupBy({
    by: ["network"],
    where: { brandId, date: { gte: normalizeDia(ini), lte: normalizeDia(fim) } },
    _sum: { reach: true },
  });
  const total = rows.reduce((acc, r) => acc + (r._sum.reach ?? 0), 0);
  return rows
    .map((r) => ({
      network: r.network as Network,
      reach: r._sum.reach ?? 0,
      percent: total === 0 ? 0 : ((r._sum.reach ?? 0) / total) * 100,
    }))
    .sort((a, b) => b.reach - a.reach);
}

async function topPostsPorAlcance(
  brandId: string,
  ini: Date,
  fim: Date,
  network: Network | null,
  limite = 5,
): Promise<TopPost[]> {
  // Pega posts publicados no período com seus targets e snapshots mais recentes.
  const posts = await db.post.findMany({
    where: {
      brandId,
      archivedAt: null,
      stage: "PUBLISHED",
      publishedAt: { gte: ini, lte: fim },
      ...(network ? { targets: { some: { network } } } : {}),
    },
    include: {
      targets: {
        include: {
          snapshots: { orderBy: { collectedAt: "desc" }, take: 1 },
        },
      },
    },
    take: 200, // teto de segurança
  });

  const out: TopPost[] = posts.map((p) => {
    let reach = 0;
    let interactions = 0;
    for (const t of p.targets) {
      if (network && t.network !== network) continue;
      const s = t.snapshots[0];
      if (!s) continue;
      reach += s.reach ?? 0;
      interactions += (s.likes ?? 0) + (s.comments ?? 0) + (s.shares ?? 0) + (s.saves ?? 0);
    }
    return {
      id: p.id,
      title: p.title,
      scheduledAt: p.scheduledAt.toISOString(),
      networks: p.targets.map((t) => t.network),
      reach,
      interactions,
      taxa: reach === 0 ? null : interactions / reach,
    };
  });

  return out.sort((a, b) => b.reach - a.reach).slice(0, limite);
}

function soma<T>(arr: T[], f: (t: T) => number) {
  return arr.reduce((a, b) => a + f(b), 0);
}
function normalizeDia(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function fimDoDia(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export const BASELINE_LABEL: Record<Baseline, string> = {
  PREVIOUS: "período anterior",
  AVG12W: "média das últimas 12 semanas",
  LAST_YEAR: "mesmo período do ano passado",
};
