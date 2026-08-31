// Ajuda — placeholder. Acordeão com FAQ vem depois.

import { Empty } from "@/components/ui/empty";

export default function AjudaPage() {
  return (
    <div className="p-6 max-w-[760px] mx-auto">
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
        <Empty
          title="Ajuda em breve"
          detail="Um acordeão com as perguntas mais comuns. Enquanto isso, o time responde por e-mail."
        />
      </div>
    </div>
  );
}
