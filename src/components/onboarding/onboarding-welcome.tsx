"use client";

// Modal centralizado do passo 1 (Learn by Doing).
// Sem spotlight — só o modal branco com overlay escuro atrás.

import { Btn } from "@/components/ui/btn";

interface Props {
  title: string;
  text: string;
  primaryLabel: string;
  onPrimary: () => void;
  loading?: boolean;
  step: number;
  totalSteps: number;
}

export function OnboardingWelcome({
  title,
  text,
  primaryLabel,
  onPrimary,
  loading,
  step,
  totalSteps,
}: Props) {
  return (
    <>
      <div
        className="fixed inset-0"
        style={{ background: "rgba(26,29,36,.55)", zIndex: 9998 }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-labelledby="onboarding-welcome-title"
        className="fixed bg-white rounded-[var(--radius-modal)] p-10"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(440px, calc(100vw - 32px))",
          boxShadow: "0 24px 60px rgba(26,29,36,.24)",
          zIndex: 9999,
        }}
      >
        <h1
          id="onboarding-welcome-title"
          style={{ fontFamily: "var(--font-serif)", fontSize: 26, textAlign: "center", lineHeight: 1.15 }}
          className="text-[var(--color-ink)]"
        >
          {title}
        </h1>
        <p
          className="text-[14px] text-[var(--color-ink-2)] mx-auto mt-4 mb-6 text-center"
          style={{ lineHeight: 1.7, maxWidth: 340 }}
        >
          {text}
        </p>
        <Btn kind="primary" full onClick={onPrimary} disabled={loading} autoFocus>
          {loading ? "Criando…" : primaryLabel}
        </Btn>
        <div className="flex gap-1.5 justify-center mt-5">
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
    </>
  );
}
