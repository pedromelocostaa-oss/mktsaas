// Endpoint de cron protegido. Aciona por qualquer scheduler (Vercel Cron, GitHub Action, Inngest depois).
// Autentica pelo header `x-cron-secret` — igual ao CRON_SECRET.

import { NextResponse } from "next/server";
import { limparOrfaos } from "@/server/services/media-cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("x-cron-secret");
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado." }, { status: 500 });
  if (header !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const r = await limparOrfaos();
  return NextResponse.json(r);
}

// Aceita GET para facilitar teste manual (mesmo com secret).
export async function GET(req: Request) {
  return POST(req);
}
