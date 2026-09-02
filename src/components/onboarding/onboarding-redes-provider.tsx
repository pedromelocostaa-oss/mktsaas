"use client";

// Onboarding Fase 2 — específico da página /configuracoes/redes.
// Aparece só no primeiro acesso do membro à página, controlado por
// Member.onboardingRedesDone.
//
// 4 passos:
// 1. Modal "As redes do Pauta"
// 2. Spotlight nas redes API (Instagram + Facebook)
// 3. Spotlight nas redes manuais (TikTok, YouTube, LinkedIn, X)
// 4. Spotlight no botão Conectar do Instagram → CTA final "Terminar tour"

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { OnboardingOverlay } from "./onboarding-overlay";
import { OnboardingTooltip } from "./onboarding-tooltip";
import { OnboardingWelcome } from "./onboarding-welcome";
import { completarOnboardingRedes } from "@/server/services/onboarding";

type TooltipPosition = "right" | "left" | "bottom" | "bottom-right" | "center";

interface Step {
  type: "modal" | "spotlight";
  target?: string;
  title: string;
  text: string;
  tooltipPosition?: TooltipPosition;
  primaryLabel: string;
  finaliza?: boolean;
  mostrarVoltar?: boolean;
}

const STEPS: Step[] = [
  {
    type: "modal",
    title: "As redes do Pauta",
    text: "Nem toda rede social entrega dados do mesmo jeito. Umas conectam com um clique. Outras precisam dos números à mão. Vou te mostrar em 30 segundos.",
    primaryLabel: "Entendi, mostra",
    mostrarVoltar: false,
  },
  {
    type: "spotlight",
    target: "redes-api",
    title: "Estas duas conectam sozinhas",
    text: "Instagram e Facebook coletam alcance, engajamento e seguidores automaticamente a cada dia. Você conecta uma vez e não pensa mais nisso — só precisa reconectar em ~60 dias, o Pauta avisa antes.",
    tooltipPosition: "right",
    primaryLabel: "Próximo",
    mostrarVoltar: false,
  },
  {
    type: "spotlight",
    target: "redes-manuais",
    title: "Estas ficam à mão — mas contam igual",
    text: "TikTok, YouTube, LinkedIn e X têm APIs limitadas ou caras demais para o v1. Você digita os números dentro de cada post, e eles entram no painel do mesmo jeito. O relatório diz para o cliente quais números vieram à mão.",
    tooltipPosition: "right",
    primaryLabel: "Próximo",
    mostrarVoltar: true,
  },
  {
    type: "spotlight",
    target: "btn-conectar-instagram",
    title: "Comece por aqui",
    text: "Clica em Conectar do Instagram quando estiver pronto. O Pauta te leva pro login da Meta, você aprova, volta pra cá. Se preferir deixar pra depois, tudo funciona sem nenhuma rede conectada — o calendário e as aprovações rodam normal.",
    tooltipPosition: "bottom-right",
    primaryLabel: "Terminar tour",
    finaliza: true,
    mostrarVoltar: true,
  },
];

const TOOLTIP_W = 380;
const TOOLTIP_H_EST = 260;
const GAP = 16;

export function OnboardingRedesProvider({ show }: { show: boolean }) {
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(show);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pending, setPending] = useState(false);
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

  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  const current = STEPS[step];

  // Localiza alvo com retry.
  useEffect(() => {
    if (!active) return;
    if (current.type !== "spotlight") return;
    if (isMobile) {
      setRect(null);
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setTooltipPos({
        top: Math.max(16, cy - TOOLTIP_H_EST / 2),
        left: Math.max(16, cx - TOOLTIP_W / 2),
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
        setRect(null);
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        setTooltipPos({
          top: Math.max(16, cy - TOOLTIP_H_EST / 2),
          left: Math.max(16, cx - TOOLTIP_W / 2),
        });
      }
    };
    tryFind();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step, isMobile]);

  // Recalcula posição em resize.
  useEffect(() => {
    if (!active || isMobile || current.type !== "spotlight") return;
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
    setTooltipPos(calcularPosicaoTooltip(r, current.tooltipPosition ?? "bottom"));
  }

  function calcularPosicaoTooltip(r: DOMRect, pos: TooltipPosition) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = 0;
    let left = 0;
    switch (pos) {
      case "right":
        left = r.right + GAP;
        top = r.top;
        break;
      case "left":
        left = r.left - TOOLTIP_W - GAP;
        top = Math.max(16, r.top + r.height / 2 - TOOLTIP_H_EST / 2);
        break;
      case "bottom":
        top = r.bottom + GAP;
        left = r.left + r.width / 2 - TOOLTIP_W / 2;
        break;
      case "bottom-right":
        top = r.bottom + GAP;
        left = r.right - TOOLTIP_W;
        break;
      case "center":
        top = r.top + r.height / 2 - TOOLTIP_H_EST / 2;
        left = r.left + r.width / 2 - TOOLTIP_W / 2;
        break;
    }
    if (left + TOOLTIP_W > vw - 8) left = vw - TOOLTIP_W - 8;
    if (left < 8) left = 8;
    if (top + TOOLTIP_H_EST > vh - 8) top = vh - TOOLTIP_H_EST - 8;
    if (top < 8) top = 8;
    return { top, left };
  }

  const next = useCallback(async () => {
    if (current.finaliza) {
      setPending(true);
      try {
        await completarOnboardingRedes();
      } finally {
        setPending(false);
        setActive(false);
      }
      return;
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }, [current.finaliza, step]);

  const back = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  if (!active || !mounted) return null;

  let node: React.ReactNode = null;
  if (current.type === "modal") {
    node = (
      <OnboardingWelcome
        title={current.title}
        text={current.text}
        primaryLabel={current.primaryLabel}
        onPrimary={next}
        loading={pending}
        step={step}
        totalSteps={STEPS.length}
      />
    );
  } else {
    node = (
      <>
        <OnboardingOverlay
          rect={rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null}
          reducedMotion={reducedMotion}
        />
        <OnboardingTooltip
          position={tooltipPos}
          step={step}
          totalSteps={STEPS.length}
          title={current.title}
          text={current.text}
          primaryLabel={pending ? "Salvando…" : current.primaryLabel}
          mostrarVoltar={current.mostrarVoltar ?? true}
          onBack={back}
          onNext={next}
        />
      </>
    );
  }

  return <>{createPortal(node, document.body)}</>;
}
