"use client";

// Hook interno do onboarding — expõe o contexto para consumidores.
// Não é usado fora de src/components/onboarding/.

import { createContext, useContext } from "react";

export interface OnboardingCtx {
  step: number;
  totalSteps: number;
  isActive: boolean;
  next: () => void;
  back: () => void;
}

export const OnboardingContext = createContext<OnboardingCtx | null>(null);

export function useOnboarding(): OnboardingCtx {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding fora de <OnboardingProvider>");
  return ctx;
}
