// Shell comum das telas públicas /r e /p. Handoff §12.

import type { ReactNode } from "react";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <TopStrip />
      <div className="max-w-[920px] mx-auto px-6 py-10">{children}</div>
    </div>
  );
}

function TopStrip() {
  return (
    <div
      className="w-full px-6 py-2 text-[12px] flex items-center justify-between"
      style={{ background: "var(--color-ink)", color: "white" }}
    >
      <span>Você está vendo como quem recebe o link.</span>
      <span className="text-[var(--color-nav-idle)]">Pauta</span>
    </div>
  );
}

export function Indisponivel({ motivo }: { motivo: "expirado" | "inexistente" | "revogado" }) {
  // docs/03: neutro — mesma tela em todos os casos. Ignora motivo além de log.
  void motivo;
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-[420px] w-full text-center bg-white p-8 rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 22 }} className="mb-2">
          Pauta
        </div>
        <h1 className="text-[17px] font-semibold mb-2">Este link não está mais disponível</h1>
        <p className="text-[13px] text-[var(--color-muted)] leading-relaxed">
          O link pode ter expirado ou sido revogado. Peça outro para quem enviou.
        </p>
      </div>
    </div>
  );
}
