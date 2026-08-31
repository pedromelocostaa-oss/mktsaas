import { Empty } from "@/components/ui/empty";

export default function EquipePage() {
  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
      <Empty title="Equipe em breve" detail="Convite por e-mail, papéis (Dono / Edita e publica / Só aprova)." />
    </div>
  );
}
