// Cron da coleta 6/6h. Protegido por CRON_SECRET.
// Fase 5 aceite: "Coleta a cada 6h grava snapshot novo, sem sobrescrever."

import { NextResponse } from "next/server";
import { coletarTodas } from "@/server/services/metrics";
import { autorizadoParaCron } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const a = autorizadoParaCron(req);
  if (!a.ok) return NextResponse.json({ error: a.motivo }, { status: 401 });
  const r = await coletarTodas();
  return NextResponse.json(r);
}
export async function GET(req: Request) {
  return POST(req);
}
