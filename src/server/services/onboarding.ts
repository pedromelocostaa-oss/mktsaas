"use server";

// completarOnboarding — chamado pelo passo 5 do tour.
// Usa fallback pro primeiro Membership do user quando activeOrganizationId
// não foi setado ainda (mesma lógica do requireTenant).

import { db } from "@/server/db";
import { getServerSession } from "@/server/auth-session";

export async function completarOnboarding() {
  const session = await getServerSession();
  if (!session?.user) return { ok: false as const, error: "sem_sessao" };

  let orgId = session.session?.activeOrganizationId ?? null;
  if (!orgId) {
    const first = await db.member.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true },
    });
    orgId = first?.organizationId ?? null;
  }
  if (!orgId) return { ok: false as const, error: "sem_org" };

  await db.member.updateMany({
    where: { userId: session.user.id, organizationId: orgId },
    data: { onboardingDone: true },
  });
  return { ok: true as const };
}

/** Fase 2 do onboarding — guiado dentro de /configuracoes/redes. */
export async function completarOnboardingRedes() {
  const session = await getServerSession();
  if (!session?.user) return { ok: false as const, error: "sem_sessao" };

  let orgId = session.session?.activeOrganizationId ?? null;
  if (!orgId) {
    const first = await db.member.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true },
    });
    orgId = first?.organizationId ?? null;
  }
  if (!orgId) return { ok: false as const, error: "sem_org" };

  await db.member.updateMany({
    where: { userId: session.user.id, organizationId: orgId },
    data: { onboardingRedesDone: true },
  });
  return { ok: true as const };
}
