// Cron da coleta 6/6h. Protegido por CRON_SECRET.
// Fase 5 aceite: "Coleta a cada 6h grava snapshot novo, sem sobrescrever."

import { NextResponse } from "next/server";
import { coletarTodas } from "@/server/services/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("x-cron-secret");
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado." }, { status: 500 });
  if (header !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await coletarTodas();
  return NextResponse.json(r);
}
export async function GET(req: Request) {
  return POST(req);
}
