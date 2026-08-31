// Aprovações — placeholder até a Fase 3.

import { Empty } from "@/components/ui/empty";

export default function AprovacoesPage() {
  return (
    <div className="p-6 max-w-[920px] mx-auto">
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
        <Empty
          title="Aprovações chegam na Fase 3"
          detail="Marca um post como precisando de aprovação, envia por link, quem aprova responde sem criar conta."
        />
      </div>
    </div>
  );
}
