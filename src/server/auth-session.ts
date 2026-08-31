// Helper para obter a sessão dentro de Server Components / Server Actions.
// Nunca proteja rota só por middleware (docs/04, CVE-2025-29927).

import { headers } from "next/headers";
import { auth } from "./auth";

export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Redireciona para /entrar se não houver sessão. */
export async function requireSession() {
  const s = await getServerSession();
  if (!s?.user) {
    const { redirect } = await import("next/navigation");
    redirect("/entrar");
  }
  return s;
}
