"use client";

// Dialog via Radix — Esc fecha, foco preso, foco volta ao gatilho (docs/08 #26).
// Sombra e raio do handoff. Overlay rgba(26,29,36,.30) para modais gerais.

import * as RadixDialog from "@radix-ui/react-dialog";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;
export const DialogTitle = RadixDialog.Title;
export const DialogDescription = RadixDialog.Description;

export const DialogContent = forwardRef<
  HTMLDivElement,
  RadixDialog.DialogContentProps & { widthPx?: number }
>(function DialogContent({ children, className, widthPx = 480, ...rest }, ref) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay
        className="fixed inset-0 anim-pop-in"
        style={{ background: "rgba(26,29,36,.30)", zIndex: 50 }}
      />
      <RadixDialog.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white shadow-[var(--shadow-modal-day)] anim-pop-in max-h-[80vh] overflow-hidden flex flex-col",
          className,
        )}
        style={{
          zIndex: 51,
          width: `min(${widthPx}px, calc(100vw - 32px))`,
          borderRadius: "var(--radius-modal)",
        }}
        {...rest}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
});

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="px-6 py-5 border-b border-[var(--color-border-soft)]">{children}</div>;
}

export function DialogBody({ children }: { children: ReactNode }) {
  return <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>;
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 py-4 border-t border-[var(--color-border-soft)] bg-[var(--color-surface-sunken)] flex items-center gap-3 justify-end">
      {children}
    </div>
  );
}
