"use client";

// Btn — botão único do sistema. Variantes tabuladas no handoff:
// primary (ink), secondary (branco+borda), ghost (só texto), danger, link.
// Raio 12px (--radius-btn), padding e peso do handoff.

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Kind = "primary" | "secondary" | "ghost" | "danger" | "link";

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: Kind;
  full?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

const variants: Record<Kind, string> = {
  primary:
    "bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink-hover)] px-4 py-2.5 rounded-[var(--radius-btn)]",
  secondary:
    "bg-white text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] hover:border-[color:#BDB9B0] px-4 py-2.5 rounded-[var(--radius-btn)]",
  ghost:
    "bg-transparent text-[var(--color-muted)] hover:bg-[var(--color-surface-sunken)] px-4 py-2.5 rounded-[var(--radius-btn)]",
  danger:
    "bg-transparent text-[var(--color-danger)] border border-[var(--color-border)] hover:bg-[var(--color-danger-bg)] px-4 py-2.5 rounded-[var(--radius-btn)]",
  link: "bg-transparent text-[var(--color-muted)] underline underline-offset-2 hover:text-[var(--color-ink)]",
};

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn(
  { kind = "secondary", full, icon, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[kind], full && "w-full", className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});
