"use client";

// Toast — pill escura, ponto verde, rodapé central. 3.2s; 6s com Desfazer.
// Ações reversíveis SEMPRE oferecem Desfazer (docs/08 #23).

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

interface ToastItem {
  id: number;
  text: string;
  onUndo?: () => void;
}

interface ToastCtx {
  push: (t: Omit<ToastItem, "id">) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast fora de ToastProvider");
  return c;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(1);

  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = idRef.current++;
    setItems((prev) => [...prev, { ...t, id }]);
    const duration = t.onUndo ? 6000 : 3200;
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), duration);
  }, []);

  const dismiss = (id: number) => setItems((prev) => prev.filter((x) => x.id !== id));

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center"
        style={{ zIndex: 70 }}
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-2.5 bg-[var(--color-ink)] text-white text-[13px] rounded-full shadow-[var(--shadow-toast)] anim-rise-in"
          >
            <span aria-hidden className="inline-block rounded-full" style={{ width: 8, height: 8, background: "var(--color-accent-soft)" }} />
            <span>{t.text}</span>
            {t.onUndo && (
              <button
                type="button"
                onClick={() => {
                  t.onUndo?.();
                  dismiss(t.id);
                }}
                className="underline underline-offset-2 hover:text-white/80"
              >
                Desfazer
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
