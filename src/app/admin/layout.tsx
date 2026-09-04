// Layout do painel de admin. Gate único: requireSuperAdmin() em cada page.tsx.
// Este layout só desenha a estrutura visual.

import { AdminSidebar } from "@/components/admin/sidebar";
import { requireSuperAdmin } from "@/server/services/admin-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireSuperAdmin();
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar adminName={admin.name} />
      <main className="flex-1 overflow-y-auto" style={{ background: "var(--color-bg)" }}>
        {children}
      </main>
    </div>
  );
}
