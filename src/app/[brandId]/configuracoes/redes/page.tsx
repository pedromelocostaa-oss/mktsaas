import { Empty } from "@/components/ui/empty";

export default function RedesPage() {
  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
      <Empty title="Redes conectadas chegam na Fase 5" detail="OAuth do Instagram/Facebook, aviso de expiração, entrada manual para redes sem API." />
    </div>
  );
}
