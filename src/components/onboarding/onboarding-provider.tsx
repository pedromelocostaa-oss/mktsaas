"use client";

// Provider do onboarding — controla passo atual, navega entre páginas do app,
// localiza elemento-alvo e posiciona o tooltip.
//
// Regras (spec):
// - Aparece só no primeiro acesso (server passa `show`).
// - Não é possível pular. Só termina ao clicar "Começar" no passo 5.
// - body{overflow:hidden} durante o tour.
// - Retry no querySelector via requestAnimationFrame (até ~160ms).
// - ResizeObserver + resize listener com debounce 100ms.
// - prefers-reduced-motion respeitado.
// - Mobile (<768px): tooltip centralizado, sem spotlight.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { OnboardingContext, type OnboardingCtx } from "./use-onboarding";
import { OnboardingOverlay } from "./onboarding-overlay";
import { OnboardingTooltip } from "./onboarding-tooltip";
import { completarOnboarding } from "@/server/services/onboarding";

type TooltipPosition = "right" | "bottom" | "bottom-right" | "center";

interface Step {
  route: "calendario" | "aprovacoes";
  target: string;
  title: string;
  text: string;
  tooltipPosition: TooltipPosition;
}

const STEPS: Step[] = [
  {
    route: "calendario",
    target: "sidebar",
    title: "Bem-vindo ao Pauta!",
    text: "Este é o seu menu. Cada item leva a uma área diferente: o Calendário onde você organiza seus posts, as Aprovações onde acompanha quem precisa aprovar, e as Configurações onde conecta suas redes sociais.",
    tooltipPosition: "right",
  },
  {
    route: "calendario",
    target: "calendario-area",
    title: "Seu calendário de conteúdo",
    text: "Aqui ficam todos os seus posts, organizados por data e hora. Você pode ver por mês ou por lista. Clique em qualquer post para editar a legenda, trocar a rede ou mudar a data.",
    tooltipPosition: "center",
  },
  {
    route: "calendario",
    target: "btn-novo-post",
    title: "Crie um novo post",
    text: "Clique aqui para criar um post. Ele começa como uma ideia agendada para amanhã às 10h. Depois você ajusta a data, escreve a legenda e escolhe em quais redes publicar.",
    tooltipPosition: "bottom-right",
  },
  {
    route: "aprovacoes",
    target: "aprovacoes-area",
    title: "Peça aprovação sem complicação",
    text: "Quando um post precisa de aprovação, você envia um link. Quem aprova clica no link, vê o post e responde sem precisar criar conta. O status aparece aqui em tempo real.",
    tooltipPosition: "center",
  },
  {
    route: "calendario",
    target: "btn-compartilhar",
    title: "Compartilhe com seu cliente",
    text: "Gere um link para o cliente ver o calendário completo ou posts específicos. Ele não precisa de login. Você controla o que aparece e por quanto tempo o link fica ativo.",
    tooltipPosition: "bottom-right",
  },
];

const TOOLTIP_MAX_W = 380;
const TOOLTIP_ESTIMATE_H = 220; // aproximação; usada só pra decidir top vs bottom
const GAP = 12;

export function OnboardingProvider({ brandId, show }: { brandId: string; show: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(show);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mob = window.matchMedia("(max-width: 767px)");
    const upd = () => {
      setReducedMotion(rm.matches);
      setIsMobile(mob.matches);
    };
    upd();
    rm.addEventListener("change", upd);
    mob.addEventListener("change", upd);
    return () => {
      rm.removeEventListener("change", upd);
      mob.removeEventListener("change", upd);
    };
  }, []);

  // body scroll-lock enquanto o onboarding roda
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  const current = STEPS[step];

  // Navega automaticamente quando a rota do passo atual não bate com pathname.
  useEffect(() => {
    if (!active) return;
    const expected = `/${brandId}/${current.route}`;
    if (pathname !== expected) {
      router.push(expected);
    }
  }, [active, brandId, current.route, pathname, router]);

  // Localiza o elemento-alvo (com retry) e mede seu boundingRect.
  useEffect(() => {
    if (!active) return;
    if (isMobile) {
      setRect(null);
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setTooltipPos({
        top: Math.max(16, cy - TOOLTIP_ESTIMATE_H / 2),
        left: Math.max(16, cx - TOOLTIP_MAX_W / 2),
      });
      return;
    }

    let tries = 0;
    let raf = 0;

    const tryFind = () => {
      const el = document.querySelector<HTMLElement>(`[data-onboarding="${current.target}"]`);
      if (el) {
        atualizarPosicao(el);
        return;
      }
      if (tries < 30) {
        tries++;
        raf = requestAnimationFrame(tryFind);
      } else {
        // fallback: tooltip centralizado, sem spotlight
        setRect(null);
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        setTooltipPos({
          top: Math.max(16, cy - TOOLTIP_ESTIMATE_H / 2),
          left: Math.max(16, cx - TOOLTIP_MAX_W / 2),
        });
      }
    };

    tryFind();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step, pathname, isMobile]);

  // Recalcula posição em resize (debounce 100ms). ResizeObserver no alvo também.
  useEffect(() => {
    if (!active || isMobile) return;
    const handler = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        const el = document.querySelector<HTMLElement>(`[data-onboarding="${current.target}"]`);
        if (el) atualizarPosicao(el);
      }, 100);
    };
    window.addEventListener("resize", handler);
    const el = document.querySelector<HTMLElement>(`[data-onboarding="${current.target}"]`);
    let ro: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(handler);
      ro.observe(el);
    }
    return () => {
      window.removeEventListener("resize", handler);
      ro?.disconnect();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step, isMobile]);

  function atualizarPosicao(el: HTMLElement) {
    const r = el.getBoundingClientRect();
    setRect(r);
    setTooltipPos(calcularPosicaoTooltip(r, current.tooltipPosition));
  }

  function calcularPosicaoTooltip(r: DOMRect, pos: TooltipPosition) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = 0;
    let left = 0;
    switch (pos) {
      case "right":
        left = r.right + GAP;
        top = r.top + Math.max(0, r.height / 2 - TOOLTIP_ESTIMATE_H / 2);
        break;
      case "bottom":
        top = r.bottom + GAP;
        left = r.left + r.width / 2 - TOOLTIP_MAX_W / 2;
        break;
      case "bottom-right":
        top = r.bottom + GAP;
        left = r.right - TOOLTIP_MAX_W;
        break;
      case "center":
        top = r.top + r.height / 2 - TOOLTIP_ESTIMATE_H / 2;
        left = r.left + r.width / 2 - TOOLTIP_MAX_W / 2;
        break;
    }
    // Fallback se não couber no viewport
    if (left + TOOLTIP_MAX_W > vw - 8) left = vw - TOOLTIP_MAX_W - 8;
    if (left < 8) left = 8;
    if (top + TOOLTIP_ESTIMATE_H > vh - 8) top = vh - TOOLTIP_ESTIMATE_H - 8;
    if (top < 8) top = 8;
    return { top, left };
  }

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    // Último passo → completa e navega para redes
    completarOnboarding().finally(() => {
      setActive(false);
      router.push(`/${brandId}/configuracoes/redes`);
    });
  }, [brandId, router, step]);

  const back = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const ctx = useMemo<OnboardingCtx>(
    () => ({ step, totalSteps: STEPS.length, isActive: active, next, back }),
    [step, active, next, back],
  );

  if (!active || !mounted) return null;

  const overlay = (
    <>
      <OnboardingOverlay rect={rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null} reducedMotion={reducedMotion} />
      <OnboardingTooltip
        position={tooltipPos}
        step={step}
        totalSteps={STEPS.length}
        title={current.title}
        text={current.text}
        isFirst={step === 0}
        isLast={step === STEPS.length - 1}
        onBack={back}
        onNext={next}
      />
    </>
  );

  return (
    <OnboardingContext.Provider value={ctx}>
      {createPortal(overlay, document.body)}
    </OnboardingContext.Provider>
  );
}
