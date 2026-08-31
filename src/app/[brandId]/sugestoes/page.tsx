// Sugestões — placeholder. Handoff §6 descreve o bloqueio com CTA
// "Me avise quando abrir". Fica assim até integrarmos IA de verdade.

import { Empty } from "@/components/ui/empty";

export default function SugestoesPage() {
  return (
    <div className="p-6 max-w-[860px] mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26 }}>Sugestões</h1>
        <span
          className="text-[11px] font-semibold rounded-full px-2 py-0.5"
          style={{ background: "var(--color-warn-bg)", color: "var(--color-warn)" }}
        >
          Em breve
        </span>
      </div>
      <p className="text-[13px] text-[var(--color-muted)] mb-4 max-w-[68ch] leading-relaxed">
        Ideias de conteúdo baseadas nos posts que mais renderam e no que anda
        pegando na sua rede. Nada aqui está ligado ainda. Vai abrir com 30 dias
        de histórico da sua conta.
      </p>
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
        <Empty
          title="Sugestões chegam depois"
          detail="Enquanto isso, use o Calendário para planejar seus próximos posts."
        />
      </div>
    </div>
  );
}
