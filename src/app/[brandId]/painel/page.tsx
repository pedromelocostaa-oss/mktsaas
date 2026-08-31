// Painel — placeholder até a Fase 6. Mostra estado vazio elegante.

import { Empty } from "@/components/ui/empty";

export default function PainelPage() {
  return (
    <div className="p-6 max-w-[1240px] mx-auto">
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
        <Empty
          title="O painel chega na Fase 6"
          detail="Alcance, engajamento, gráfico com tooltip, quebra por rede e tabela dos melhores posts. Enquanto isso, use o calendário e as configurações."
        />
      </div>
    </div>
  );
}
