"use client";

// Input, Field, Senha, ForcaSenha, GoogleBtn — primitivas de formulário.
// Regra de senha aparece enquanto a pessoa digita (docs/04).

import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label: string;
  hint?: string;
  erro?: string;
  htmlFor?: string;
  children: ReactNode;
}
export function Field({ label, hint, erro, htmlFor, children }: FieldProps) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label htmlFor={htmlFor} className="text-[13px] font-medium">
          {label}
        </label>
        {hint && <span className="text-xs text-[var(--color-muted)]">{hint}</span>}
      </div>
      {children}
      {erro && (
        <div className="flex items-start gap-1.5 mt-1.5 text-xs text-[var(--color-danger)]">
          <span aria-hidden>⚠</span>
          {erro}
        </div>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  erro?: boolean;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { icon, erro, className, ...rest },
  ref,
) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 bg-white border rounded-[var(--radius-btn)]",
        erro ? "border-[var(--color-danger)]" : "border-[var(--color-border)]",
        "focus-within:outline focus-within:outline-2 focus-within:outline-[var(--color-accent-light)] focus-within:outline-offset-2",
      )}
    >
      {icon && <span className="shrink-0 text-[var(--color-muted-2)]">{icon}</span>}
      <input
        ref={ref}
        className={cn("flex-1 py-2.5 text-[13px] bg-transparent outline-none", className)}
        {...rest}
      />
    </div>
  );
});

interface SenhaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  erro?: boolean;
  name?: string;
  id?: string;
  autoComplete?: string;
}
export function Senha({ value, onChange, placeholder = "sua senha", erro, name, id, autoComplete = "current-password" }: SenhaProps) {
  const [ver, setVer] = useState(false);
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 bg-white border rounded-[var(--radius-btn)]",
        erro ? "border-[var(--color-danger)]" : "border-[var(--color-border)]",
        "focus-within:outline focus-within:outline-2 focus-within:outline-[var(--color-accent-light)] focus-within:outline-offset-2",
      )}
    >
      <span aria-hidden className="shrink-0 text-[var(--color-muted-2)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
      <input
        id={id}
        name={name}
        autoComplete={autoComplete}
        type={ver ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 py-2.5 text-[13px] bg-transparent outline-none"
      />
      <button
        type="button"
        onClick={() => setVer(!ver)}
        aria-label={ver ? "Esconder senha" : "Mostrar senha"}
        className="shrink-0 text-[var(--color-muted-2)] hover:text-[var(--color-ink)]"
      >
        {ver ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.86 19.86 0 0 1 4.06-5.31" />
            <path d="M9.9 5.24A9.12 9.12 0 0 1 12 5c7 0 11 8 11 8a19.86 19.86 0 0 1-2.24 3.31" />
            <path d="M9.9 9.9a3 3 0 1 0 4.2 4.2" />
            <path d="M2 2l20 20" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

// A regra aparece enquanto a pessoa digita, não depois que ela erra (docs/04).
export function ForcaSenha({ v }: { v: string }) {
  const regras = [
    { ok: v.length >= 10, t: "pelo menos 10 caracteres" },
    { ok: /[a-zA-Z]/.test(v) && /[0-9]/.test(v), t: "letras e números" },
    { ok: !/^(senha|123456|qwerty|pauta|password|admin)/i.test(v), t: "não começa com algo óbvio" },
  ];
  const n = regras.filter((r) => r.ok).length;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[3px] flex-1 rounded-[2px]"
            style={{
              background:
                i < n
                  ? n === 3
                    ? "var(--color-accent)"
                    : "var(--color-warn)"
                  : "var(--color-border)",
            }}
          />
        ))}
      </div>
      <div className="space-y-1">
        {regras.map((r) => (
          <div
            key={r.t}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: r.ok ? "var(--color-accent)" : "var(--color-muted)" }}
          >
            <span aria-hidden className="inline-block w-3">
              {r.ok ? "✓" : ""}
            </span>
            {r.t}
          </div>
        ))}
      </div>
    </div>
  );
}

export function GoogleBtn({ label, onClick, disabled }: { label: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2.5 py-2.5 text-[13px] font-medium bg-white border border-[var(--color-border)] rounded-[var(--radius-btn)] hover:bg-[var(--color-surface-sunken)] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
        <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.8-2 5.1-4.4 6.7v5.6h7.1c4.2-3.8 6.6-9.5 6.6-16.5z" />
        <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.6c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.6-3.9-12.4-9.1H4.3v5.7C7.9 41 15.4 46 24 46z" />
        <path fill="#FBBC05" d="M11.6 28c-.5-1.3-.7-2.7-.7-4s.3-2.7.7-4v-5.7H4.3C2.8 17.2 2 20.5 2 24s.8 6.8 2.3 9.7l7.3-5.7z" />
        <path fill="#EA4335" d="M24 10.7c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 7.9 7 4.3 14.3l7.3 5.7c1.8-5.2 6.6-9.3 12.4-9.3z" />
      </svg>
      {label}
    </button>
  );
}

// Ícone Mail auxiliar para o Input de e-mail.
export function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 6 10-6" />
    </svg>
  );
}

export function useFieldId(prefix = "f") {
  const id = useId();
  return `${prefix}-${id.replace(/:/g, "")}`;
}
