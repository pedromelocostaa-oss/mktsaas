// Cron diário — despacha as notificações do dia:
//   1. Conexão vencendo em 14/7/1 dias (docs/05).
//   2. Véspera de publicação (docs/07 e-mail 2.9): posts agendados para amanhã.
// Consolidado num único endpoint para não estourar a cota de crons do Hobby.

import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { enviarEmail } from "@/server/email/send";
import { autorizadoParaCron } from "@/lib/cron-auth";
import { tmplVespera } from "@/server/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JANELAS = [14, 7, 1] as const;

const NETWORK_LABEL = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  LINKEDIN: "LinkedIn",
  X: "X",
} as const;

export async function POST(req: Request) {
  const a = autorizadoParaCron(req);
  if (!a.ok) return NextResponse.json({ error: a.motivo }, { status: 401 });

  const agora = Date.now();
  let avisados = 0;

  for (const dias of JANELAS) {
    // Janela de 1 dia em volta do alvo (evita reenviar todo dia).
    const alvoIni = new Date(agora + (dias - 0.5) * 24 * 60 * 60 * 1000);
    const alvoFim = new Date(agora + (dias + 0.5) * 24 * 60 * 60 * 1000);
    const conns = await db.socialConnection.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: { gte: alvoIni, lte: alvoFim },
      },
      include: {
        brand: {
          select: {
            name: true,
            organization: {
              select: {
                members: { where: { role: "OWNER" }, include: { user: true }, take: 5 },
              },
            },
          },
        },
      },
    });
    for (const c of conns) {
      const netLabel = NETWORK_LABEL[c.network as keyof typeof NETWORK_LABEL] ?? c.network;
      const owners = c.brand.organization.members;
      const consequencia = `Se vencer, a coleta automática para e o histórico fica com um buraco que não dá para preencher depois.`;
      for (const m of owners) {
        await enviarEmail({
          to: m.user.email,
          subject: `A conexão do ${netLabel} vence em ${dias} dia${dias === 1 ? "" : "s"}`,
          text: [
            `Olá, ${m.user.name || ""}`,
            ``,
            `A conexão do ${netLabel} da conta "${c.brand.name}" vence em ${dias} dia${dias === 1 ? "" : "s"}.`,
            consequencia,
            ``,
            `Reconecte em Configurações → Redes conectadas.`,
          ].join("\n"),
          html: `<p>Olá, ${m.user.name || ""}</p><p>A conexão do <strong>${netLabel}</strong> da conta "<strong>${escape(c.brand.name)}</strong>" vence em ${dias} dia${dias === 1 ? "" : "s"}.</p><p>${consequencia}</p><p>Reconecte em Configurações → Redes conectadas.</p>`,
        }).catch(() => {});
        avisados++;
      }
    }
  }

  // ── Véspera de publicação (docs/07 e-mail 2.9) ──
  // Posts SCHEDULED cuja hora está entre agora+24h e agora+48h, autor com e-mail.
  const veIni = new Date(agora + 24 * 60 * 60 * 1000);
  const veFim = new Date(agora + 48 * 60 * 60 * 1000);
  const vesperas = await db.post.findMany({
    where: {
      stage: "SCHEDULED",
      archivedAt: null,
      scheduledAt: { gte: veIni, lte: veFim },
    },
    take: 500,
  });
  const base =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://pauta-wheat.vercel.app";
  let avisadosVespera = 0;
  for (const p of vesperas) {
    const autor = await db.user.findUnique({
      where: { id: p.createdById },
      select: { name: true, email: true },
    });
    if (!autor?.email) continue;
    const horaPt = p.scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const t = tmplVespera({
      autorNome: autor.name,
      postTitle: p.title,
      horaPt,
      link: `${base}/${p.brandId}/calendario?post=${p.id}`,
    });
    await enviarEmail({ to: autor.email, subject: t.subject, html: t.html, text: t.text }).catch(() => {});
    avisadosVespera++;
  }

  return NextResponse.json({ avisados, avisadosVespera });
}

export async function GET(req: Request) {
  return POST(req);
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
