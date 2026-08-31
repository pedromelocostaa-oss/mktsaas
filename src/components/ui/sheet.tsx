"use client";

// Sheet — drawer lateral direito. Radix Dialog + estilo do drawer do handoff.
// 520px, fundo #FBFAF8, Esc/foco corretos.

import * as RadixDialog from "@radix-ui/react-dialog";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Sheet = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetClose = RadixDialog.Close;
export const SheetTitle = RadixDialog.Title;

export const SheetContent = forwardRef<HTMLDivElement, RadixDialog.DialogContentProps>(
  function SheetContent({ children, className, ...rest }, ref) {
    return (
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className="fixed inset-0 anim-pop-in"
          style={{ background: "rgba(26,29,36,.30)", zIndex: 50 }}
        />
        <RadixDialog.Content
          ref={ref}
          className={cn(
            "fixed right-0 top-0 h-screen w-[520px] max-w-[100vw] bg-[var(--color-surface-sunken)] shadow-[var(--shadow-modal-day)] anim-slide-in flex flex-col overflow-hidden",
            className,
          )}
          style={{ zIndex: 51 }}
          {...rest}
        >
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    );
  },
);

export function SheetHeader({ children }: { children: ReactNode }) {
  return <div className="px-6 py-5 bg-white border-b border-[var(--color-border-soft)]">{children}</div>;
}

export function SheetBody({ children }: { children: ReactNode }) {
  return <div className="px-6 py-4 flex-1 overflow-y-auto space-y-3">{children}</div>;
}
