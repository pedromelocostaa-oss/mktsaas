// Shell do app. Guarda o brandId (docs/02 #11): scoped() garante 404 (not_found)
// se o brand não pertence à org da sessão.

import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@/server/auth-session";
import { listarBrandsAtivas, pegarBrand } from "@/server/services/queries";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/topbar";
import { ToastProvider } from "@/components/ui/toast";
import { requireTenant } from "@/server/tenant";
import { db } from "@/server/db";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ brandId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user) redirect("/entrar");

  const { brandId } = await params;
  const brand = await pegarBrand(brandId);
  if (!brand) notFound();

  const brands = await listarBrandsAtivas();

  // Contagem de aprovações pendentes para o badge do menu.
  const t = await requireTenant();
  const pendentes = await t.post.count({
    where: { brandId, archivedAt: null, review: { is: { state: "PENDING" } } },
  });

  // Posts recentes para o modal Compartilhar (POSTS escolhidas).
  const postsRecentes = await t.post.findMany({
    where: { brandId, archivedAt: null },
    orderBy: { scheduledAt: "desc" },
    take: 60,
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      targets: { select: { network: true } },
    },
  });
  const postsParaShare = postsRecentes.map((p) => ({
    id: p.id,
    title: p.title,
    scheduledAt: p.scheduledAt.toISOString(),
    networks: p.targets.map((t) => t.network),
  }));

  // Onboarding — só aparece no primeiro acesso do membro.
  const member = await db.member.findFirst({
    where: { userId: session.user.id, organizationId: brand.organizationId },
    select: { onboardingDone: true },
  });
  const mostrarOnboarding = member ? !member.onboardingDone : false;

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar brandId={brandId} pendentes={pendentes} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar currentBrand={brand} brands={brands} postsParaShare={postsParaShare} />
          <main className="flex-1 overflow-y-auto" style={{ background: "var(--color-bg)" }}>
            {children}
          </main>
        </div>
      </div>
      {mostrarOnboarding && <OnboardingProvider brandId={brandId} show />}
    </ToastProvider>
  );
}
