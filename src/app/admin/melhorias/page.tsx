import { requireSuperAdmin } from "@/server/services/admin-guard";
import { Empty } from "@/components/ui/empty";

export const dynamic = "force-dynamic";

export default async function AdminMelhorias() {
  await requireSuperAdmin();
  return (
    <div className="p-6 max-w-[860px] mx-auto space-y-4">
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 30 }}>Melhorias</h1>
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
        <Empty
          title="Triagem chega junto com a Fase 7"
          detail="Aqui você vai ver pedidos privados dos usuários e transformar em RoadmapItem público."
        />
      </div>
    </div>
  );
}
