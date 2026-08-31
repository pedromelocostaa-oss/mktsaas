// Autentica cron: aceita header manual (x-cron-secret) OU o padrão do Vercel
// Cron (Authorization: Bearer $CRON_SECRET). Sem CRON_SECRET, nega tudo.

export function autorizadoParaCron(req: Request): { ok: boolean; motivo?: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, motivo: "CRON_SECRET não configurado." };

  const manual = req.headers.get("x-cron-secret");
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (manual === secret) return { ok: true };
  if (bearer === secret) return { ok: true };
  return { ok: false, motivo: "unauthorized" };
}
