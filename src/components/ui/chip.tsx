"use client";

// Chip — pill/badge. Cores neutras (bg + border) e variantes semânticas.
// Ponto colorido opcional. Estado nunca é comunicado só por cor (docs/08 #25).

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "neutral" | "accent" | "warn" | "danger" | "outline";

interface ChipProps {
  children: ReactNode;
  dotColor?: string;
  variant?: Variant;
  className?: string;
}

const styles: Record<Variant, string> = {
  neutral: "bg-[var(--color-bg)] text-[var(--color-ink-2)]",
  accent: "bg-[var(--color-accent-bg)] text-[var(--color-accent-dark)]",
  warn: "bg-[var(--color-warn-bg)] text-[var(--color-warn)]",
  danger: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  outline: "bg-white text-[var(--color-ink-2)] border border-[var(--color-border)]",
};

export function Chip({ children, dotColor, variant = "neutral", className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full",
        styles[variant],
        className,
      )}
    >
      {dotColor && (
        <span aria-hidden className="inline-block rounded-full" style={{ width: 7, height: 7, background: dotColor }} />
      )}
      {children}
    </span>
  );
}
