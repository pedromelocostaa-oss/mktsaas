"use client";

// Segmented control — pill sobre trilho #F1EFE9. Padding e cores do handoff.

import { cn } from "@/lib/cn";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  ariaLabel?: string;
  className?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex p-[3px] bg-[var(--color-bg)] rounded-full", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "px-[15px] py-[7px] text-[13px] rounded-full transition-colors",
              active
                ? "bg-[var(--color-ink)] text-white font-semibold"
                : "text-[var(--color-muted)] font-medium hover:text-[var(--color-ink)]",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
