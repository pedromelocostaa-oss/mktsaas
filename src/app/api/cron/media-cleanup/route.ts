// Endpoint de cron protegido. Aciona por qualquer scheduler (Vercel Cron, GitHub Action, Inngest depois).
// Autentica pelo header `x-cron-secret` — igual ao CRON_SECRET.

import { NextResponse } from "next/server";
import { limparOrfaos } from "@/server/services/media-cleanup";
import { autorizadoParaCron } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const a = autorizadoParaCron(req);
  if (!a.ok) return NextResponse.json({ error: a.motivo }, { status: 401 });
  const r = await limparOrfaos();
  return NextResponse.json(r);
}

// Aceita GET para facilitar teste manual (mesmo com secret).
export async function GET(req: Request) {
  return POST(req);
}
