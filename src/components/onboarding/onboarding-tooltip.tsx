"use client";

// Tooltip do onboarding — 380px max, título + texto + botões + progresso.
// Focus autofocus no botão Próximo (acessibilidade).

import { useEffect, useRef } from "react";
import { Btn } from "@/components/ui/btn";

interface Props {
  position: { top: number; left: number };
  step: number;
  totalSteps: number;
  title: string;
  text: string;
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function OnboardingTooltip({
  position,
  step,
  totalSteps,
  title,
  text,
  isFirst,
  isLast,
  onBack,
  onNext,
}: Props) {
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    nextRef.current?.focus();
  }, [step]);

  return (
    <div
      role="dialog"
      aria-labelledby="onboarding-title"
      className="fixed bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-dropdown)] p-6"
      style={{
        top: position.top,
        left: position.left,
        width: "min(380px, calc(100vw - 32px))",
        zIndex: 9999,
      }}
    >
      <div className="text-[12px] text-[var(--color-muted)] mb-2">
        {step + 1} de {totalSteps}
      </div>
      <h2
        id="onboarding-title"
        style={{ fontFamily: "var(--font-serif)", fontSize: 20, lineHeight: 1.2 }}
        className="text-[var(--color-ink)] mb-2"
      >
        {title}
      </h2>
      <p className="text-[14px] leading-relaxed text-[var(--color-ink-2)]">{text}</p>

      <div className="flex items-center gap-2 mt-5">
        {!isFirst && (
          <Btn kind="ghost" onClick={onBack}>
            Voltar
          </Btn>
        )}
        <div className="flex-1" />
        <Btn kind="primary" ref={nextRef} onClick={onNext}>
          {isLast ? "Começar a usar o Pauta" : "Próximo"}
        </Btn>
      </div>

      <div className="flex gap-1.5 justify-center mt-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className="rounded-full"
            style={{
              width: 6,
              height: 6,
              background: i <= step ? "var(--color-ink)" : "var(--color-border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
