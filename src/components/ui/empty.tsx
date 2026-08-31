"use client";

// Estado vazio — a primeira ação vem no CTA. Conta nova mostra Empty,
// nunca tela em branco (docs/08 e Fase 6).

import type { ReactNode } from "react";

interface EmptyProps {
  icon?: ReactNode;
  title: string;
  detail?: string;
  action?: ReactNode;
}
export function Empty({ icon, title, detail, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center text-center py-11 px-4 gap-3">
      {icon && (
        <span
          className="flex items-center justify-center rounded-full"
          style={{ width: 46, height: 46, background: "var(--color-accent-bg)", color: "var(--color-accent)" }}
        >
          {icon}
        </span>
      )}
      <div className="text-[15px] font-semibold">{title}</div>
      {detail && <p className="text-[13px] text-[var(--color-muted)] max-w-[42ch] leading-relaxed">{detail}</p>}
      {action}
    </div>
  );
}
