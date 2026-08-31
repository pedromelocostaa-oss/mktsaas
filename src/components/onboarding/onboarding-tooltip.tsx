"use client";

// Tooltip do onboarding — usado nos passos 2-5 (spotlight).
// z-index 10000 (acima do overlay 9998 e do drawer 9999 no passo 2).

import { useEffect, useRef } from "react";
import { Btn } from "@/components/ui/btn";

interface Props {
  position: { top: number; left: number };
  step: number;
  totalSteps: number;
  title: string;
  text: string;
  primaryLabel: string;
  mostrarVoltar: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function OnboardingTooltip({
  position,
  step,
  totalSteps,
  title,
  text,
  primaryLabel,
  mostrarVoltar,
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
        zIndex: 10000,
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
        {mostrarVoltar && (
          <Btn kind="ghost" onClick={onBack}>
            Voltar
          </Btn>
        )}
        <div className="flex-1" />
        <Btn kind="primary" ref={nextRef} onClick={onNext}>
          {primaryLabel}
        </Btn>
      </div>

      <div className="flex gap-1.5 justify-center mt-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className="rounded-full"
            style={{
              width: 8,
              height: 8,
              background: i <= step ? "var(--color-ink)" : "var(--color-border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
