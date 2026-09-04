// Agregações do painel de admin. Todas as queries usam db diretamente
// (sem scoped) porque o superadmin vê tudo. Chamadas SEMPRE atrás de
// requireSuperAdmin() no page/layout.

import { db } from "@/server/db";

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(n: number) {
  return new Date(Date.now() - n * DAY);
}

export interface HeroMetric {
  label: string;
  value: number;
  deltaPct: number | null; // vs janela anterior de mesmo tamanho; null se anterior=0
}

export async function calcularHero(): Promise<HeroMetric[]> {
  const [
    ativos7,
    ativos7Ant,
    cadastros7,
    cadastros7Ant,
    publicados7,
    publicados7Ant,
    aprovacoes7,
    aprovacoes7Ant,
  ] = await Promise.all([
    db.session.groupBy({
      by: ["userId"],
      where: { updatedAt: { gte: daysAgo(7) } },
    }),
    db.session.groupBy({
      by: ["userId"],
      where: { updatedAt: { gte: daysAgo(14), lt: daysAgo(7) } },
    }),
    db.user.count({ where: { createdAt: { gte: daysAgo(7) } } }),
    db.user.count({ where: { createdAt: { gte: daysAgo(14), lt: daysAgo(7) } } }),
    db.post.count({
      where: { stage: "PUBLISHED", publishedAt: { gte: daysAgo(7) } },
    }),
    db.post.count({
      where: { stage: "PUBLISHED", publishedAt: { gte: daysAgo(14), lt: daysAgo(7) } },
    }),
    db.review.count({ where: { sentAt: { gte: daysAgo(7) } } }),
    db.review.count({ where: { sentAt: { gte: daysAgo(14), lt: daysAgo(7) } } }),
  ]);

  const pct = (atual: number, anterior: number) =>
    anterior === 0 ? null : ((atual - anterior) / anterior) * 100;

  return [
    { label: "Usuários ativos (7d)", value: ativos7.length, deltaPct: pct(ativos7.length, ativos7Ant.length) },
    { label: "Novos cadastros (7d)", value: cadastros7, deltaPct: pct(cadastros7, cadastros7Ant) },
    { label: "Posts publicados (7d)", value: publicados7, deltaPct: pct(publicados7, publicados7Ant) },
    { label: "Aprovações enviadas (7d)", value: aprovacoes7, deltaPct: pct(aprovacoes7, aprovacoes7Ant) },
  ];
}

export async function serieCrescimento(dias = 30) {
  const inicio = daysAgo(dias);

  const [users, posts] = await Promise.all([
    db.user.findMany({
      where: { createdAt: { gte: inicio } },
      select: { createdAt: true },
    }),
    db.post.findMany({
      where: { stage: "PUBLISHED", publishedAt: { gte: inicio } },
      select: { publishedAt: true },
    }),
  ]);

  const buckets = new Map<string, { cadastros: number; publicados: number }>();
  const hoje = new Date();
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje.getTime() - i * DAY);
    buckets.set(d.toISOString().slice(0, 10), { cadastros: 0, publicados: 0 });
  }
  for (const u of users) {
    const k = u.createdAt.toISOString().slice(0, 10);
    const b = buckets.get(k);
    if (b) b.cadastros++;
  }
  for (const p of posts) {
    if (!p.publishedAt) continue;
    const k = p.publishedAt.toISOString().slice(0, 10);
    const b = buckets.get(k);
    if (b) b.publicados++;
  }
  return [...buckets.entries()].map(([date, v]) => ({ date, ...v }));
}

export interface FunilRow {
  label: string;
  users: number;
  pctDoTopo: number;
}

/**
 * Funil de ativação:
 *   Cadastrou  →  Criou 1ª conta  →  Criou 1º post  →  Publicou 1º post
 * Cada nível conta usuários únicos que chegaram ali (via qualquer org).
 */
export async function funilAtivacao(): Promise<FunilRow[]> {
  const [total, comBrand, comPost, comPublicado] = await Promise.all([
    db.user.count(),
    db.user.count({
      where: {
        members: { some: { organization: { brands: { some: {} } } } },
      },
    }),
    db.user.count({
      where: {
        OR: [
          { members: { some: { organization: { brands: { some: { posts: { some: {} } } } } } } },
        ],
      },
    }),
    db.user.count({
      where: {
        members: {
          some: {
            organization: { brands: { some: { posts: { some: { stage: "PUBLISHED" } } } } },
          },
        },
      },
    }),
  ]);
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);
  return [
    { label: "Cadastrou", users: total, pctDoTopo: 100 },
    { label: "Criou 1ª conta", users: comBrand, pctDoTopo: pct(comBrand) },
    { label: "Criou 1º post", users: comPost, pctDoTopo: pct(comPost) },
    { label: "Publicou 1º post", users: comPublicado, pctDoTopo: pct(comPublicado) },
  ];
}

export async function onboardingCompletion() {
  // Base: membros com pelo menos 24h de existência (senão inflaria "pendente")
  const base = await db.member.count({ where: { createdAt: { lt: daysAgo(1) } } });
  const [f1, f2] = await Promise.all([
    db.member.count({
      where: { createdAt: { lt: daysAgo(1) }, onboardingDone: true },
    }),
    db.member.count({
      where: {
        createdAt: { lt: daysAgo(1) },
        onboardingDone: true,
        onboardingRedesDone: true,
      },
    }),
  ]);
  return { base, fase1: f1, fase2: f2 };
}

export async function ultimosCadastros(n = 10) {
  return db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: n,
    select: { id: true, name: true, email: true, createdAt: true, emailVerified: true },
  });
}

export async function topOrgsPorAtividade(n = 5) {
  const rows = await db.post.groupBy({
    by: ["organizationId"],
    where: { createdAt: { gte: daysAgo(30) } },
    _count: { _all: true },
    orderBy: { _count: { organizationId: "desc" } },
    take: n,
  });
  const ids = rows.map((r) => r.organizationId);
  const orgs = await db.organization.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const nome = new Map(orgs.map((o) => [o.id, o.name]));
  return rows.map((r) => ({
    id: r.organizationId,
    name: nome.get(r.organizationId) ?? "(sem nome)",
    posts30d: r._count._all,
  }));
}

export async function saudeDoSistema() {
  const [
    ultimaColeta,
    conexoesAtivas,
    conexoesErro,
    r2Bytes,
    erros24h,
  ] = await Promise.all([
    db.socialConnection.findFirst({
      orderBy: { lastSyncAt: "desc" },
      select: { lastSyncAt: true },
    }),
    db.socialConnection.count({ where: { status: "ACTIVE" } }),
    db.socialConnection.count({ where: { status: { in: ["ERROR", "EXPIRED"] } } }),
    db.postMedia.aggregate({ _sum: { bytes: true } }),
    db.auditLog.count({
      where: {
        createdAt: { gte: daysAgo(1) },
        action: { contains: "error", mode: "insensitive" },
      },
    }),
  ]);
  return {
    ultimaColetaMin: ultimaColeta?.lastSyncAt
      ? Math.round((Date.now() - ultimaColeta.lastSyncAt.getTime()) / 60000)
      : null,
    conexoesAtivas,
    conexoesErro,
    r2Bytes: r2Bytes._sum.bytes ?? 0,
    erros24h,
  };
}

export async function listarOrgs(q?: string) {
  return db.organization.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      createdAt: true,
      _count: { select: { brands: true, members: true } },
    },
  });
}

export async function detalheOrg(id: string) {
  return db.organization.findUnique({
    where: { id },
    include: {
      brands: {
        orderBy: { createdAt: "asc" },
        include: {
          _count: { select: { posts: true, connections: true } },
        },
      },
      members: {
        include: { user: { select: { id: true, name: true, email: true, emailVerified: true } } },
      },
    },
  });
}

export async function listarUsers(q?: string) {
  return db.user.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      createdAt: true,
      isSuperAdmin: true,
      _count: { select: { members: true } },
    },
  });
}

export async function detalheUser(id: string) {
  return db.user.findUnique({
    where: { id },
    include: {
      members: { include: { organization: { select: { id: true, name: true, slug: true } } } },
      sessions: {
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, ipAddress: true, userAgent: true, updatedAt: true, expiresAt: true },
      },
    },
  });
}

export async function atividadeRecente(n = 200) {
  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: n,
    select: {
      id: true,
      createdAt: true,
      action: true,
      targetType: true,
      targetId: true,
      actorId: true,
      organizationId: true,
      metadata: true,
    },
  });
}
