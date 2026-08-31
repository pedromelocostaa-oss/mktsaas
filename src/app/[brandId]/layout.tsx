// Shell do app. Guarda o brandId (docs/02 #11): scoped() garante 404 (not_found)
// se o brand não pertence à org da sessão.

import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@/server/auth-session";
import { listarBrandsAtivas, pegarBrand } from "@/server/services/queries";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/topbar";
import { ToastProvider } from "@/components/ui/toast";

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

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar brandId={brandId} pendentes={0} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar currentBrand={brand} brands={brands} />
          <main className="flex-1 overflow-y-auto" style={{ background: "var(--color-bg)" }}>
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
