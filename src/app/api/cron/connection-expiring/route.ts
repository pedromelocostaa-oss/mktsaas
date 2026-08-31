// Cron diário: avisa em 14/7/1 dias antes do token vencer (docs/05).
// docs/05 exige que o texto do aviso diga a CONSEQUÊNCIA, não a ação.

import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { enviarEmail } from "@/server/email/send";

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
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("x-cron-secret");
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado." }, { status: 500 });
  if (header !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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

  return NextResponse.json({ avisados });
}

export async function GET(req: Request) {
  return POST(req);
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
