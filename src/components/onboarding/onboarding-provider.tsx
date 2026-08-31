"use client";

// Provider do onboarding — modelo Learn by Doing.
// Passo 1 é modal centralizado; ao clicar cria um post real e abre o drawer.
// Passos 2-5 são spotlights com tooltip.

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { OnboardingContext, type OnboardingCtx } from "./use-onboarding";
import { OnboardingOverlay } from "./onboarding-overlay";
import { OnboardingTooltip } from "./onboarding-tooltip";
import { OnboardingWelcome } from "./onboarding-welcome";
import { completarOnboarding } from "@/server/services/onboarding";
import { criarIdeiaRapida } from "@/server/services/posts";

type TooltipPosition = "right" | "left" | "bottom" | "bottom-right" | "center";

interface Step {
  type: "modal" | "spotlight";
  route: "calendario" | "aprovacoes";
  wantsPostParam: boolean; // se true, mantém ?post={postId} na URL; se false, remove
  target?: string;
  title: string;
  text: string;
  tooltipPosition?: TooltipPosition;
  primaryLabel: string;
  criaPost?: boolean;
  finaliza?: boolean;
  interativo?: boolean; // overlay não bloqueia clicks (usado no drawer)
  mostrarVoltar?: boolean;
}

const STEPS: Step[] = [
  {
    type: "modal",
    route: "calendario",
    wantsPostParam: false,
    title: "Bem-vindo ao Pauta!",
    text: "O Pauta organiza seus posts de redes sociais num calendário. Você cria o post, escolhe a data e a rede, e acompanha tudo num lugar só. Vamos criar seu primeiro post juntos.",
    primaryLabel: "Criar meu primeiro post",
    criaPost: true,
    mostrarVoltar: false,
  },
  {
    type: "spotlight",
    route: "calendario",
    wantsPostParam: true, // abre o drawer no post recém-criado
    target: "post-drawer",
    title: "Este é o editor de post",
    text: "Aqui você monta cada publicação. Escolha a data, selecione as redes e escreva o texto. Tudo salva automaticamente. Explore os campos e quando quiser continue o tour.",
    tooltipPosition: "left",
    primaryLabel: "Próximo",
    interativo: true,
    mostrarVoltar: false,
  },
  {
    type: "spotlight",
    route: "calendario",
    wantsPostParam: false, // fecha o drawer
    target: "calendario-area",
    title: "Seu post está no calendário",
    text: "Cada card mostra o horário, a rede e o estágio de produção. Clique em qualquer post para abrir o editor de novo. Use as setas para trocar de mês, ou alterne entre visão Mês e Lista.",
    tooltipPosition: "center",
    primaryLabel: "Próximo",
    mostrarVoltar: true,
  },
  {
    type: "spotlight",
    route: "aprovacoes",
    wantsPostParam: false,
    target: "aprovacoes-area",
    title: "Aprovação sem criar conta",
    text: "Quando um post precisa de OK do cliente, você envia um link direto do editor. A pessoa clica, vê o post e responde sim ou não. Sem cadastro, sem senha. O status atualiza aqui em tempo real.",
    tooltipPosition: "center",
    primaryLabel: "Próximo",
    mostrarVoltar: true,
  },
  {
    type: "spotlight",
    route: "calendario",
    wantsPostParam: false,
    target: "btn-compartilhar",
    title: "Compartilhe com seu cliente",
    text: "Gere um link para o cliente ver o calendário completo ou posts específicos. Ele não precisa de login. Você controla o que aparece e por quanto tempo o link fica ativo.",
    tooltipPosition: "bottom-right",
    primaryLabel: "Começar a usar o Pauta",
    finaliza: true,
    mostrarVoltar: true,
  },
];

const TOOLTIP_W = 380;
const TOOLTIP_H_EST = 240;
const GAP = 16;

export function OnboardingProvider({ brandId, show }: { brandId: string; show: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(show);
  const [postId, setPostId] = useState<string | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [criandoPost, startCriar] = useTransition();
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

  const current = STEPS[step];

  // body scroll-lock + classe pra ativar override de z-index no drawer no passo 2
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const drawerStep = current.target === "post-drawer";
    document.body.classList.toggle("onboarding-drawer-active", drawerStep);
    return () => {
      document.body.classList.remove("onboarding-drawer-active");
    };
  }, [active, current.target]);

  // Sincroniza rota e ?post= com o passo atual.
  useEffect(() => {
    if (!active) return;
    const expectedPath = `/${brandId}/${current.route}`;
    const expectedPost = current.wantsPostParam ? postId : null;
    const atualPost = sp.get("post");

    const precisaMudarPath = pathname !== expectedPath;
    const precisaMudarPost =
      (expectedPost && atualPost !== expectedPost) || (!expectedPost && atualPost);

    if (precisaMudarPath || precisaMudarPost) {
      const params = new URLSearchParams(sp.toString());
      if (expectedPost) params.set("post", expectedPost);
      else params.delete("post");
      const qs = params.toString();
      router.push(`${expectedPath}${qs ? `?${qs}` : ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, brandId, current.route, current.wantsPostParam, pathname, postId]);

  // Se o usuário fechar o drawer manualmente durante o passo 2, avança sozinho.
  useEffect(() => {
    if (!active) return;
    if (step !== 1) return; // só o passo do drawer
    if (!postId) return;
    const atual = sp.get("post");
    if (atual !== postId) {
      // drawer foi fechado — pula pro passo 3
      setStep(2);
    }
  }, [active, step, postId, sp]);

  // Localiza o alvo (com retry) e posiciona o tooltip.
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
  }, [active, step, pathname, sp, isMobile]);

  // Recalcula posição em resize / mudança do alvo.
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

  const next = useCallback(() => {
    if (current.finaliza) {
      completarOnboarding().finally(() => {
        setActive(false);
        router.push(`/${brandId}/configuracoes/redes`);
      });
      return;
    }
    if (current.criaPost) {
      startCriar(async () => {
        // Se já criou antes (voltando), reaproveita
        if (postId) {
          setStep((s) => s + 1);
          return;
        }
        const r = await criarIdeiaRapida(brandId);
        if (r.ok) {
          setPostId(r.id);
          setStep((s) => s + 1);
        } else {
          // eslint-disable-next-line no-console
          console.error("onboarding: falha ao criar post", r.error);
        }
      });
      return;
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }, [brandId, current.criaPost, current.finaliza, postId, router, step]);

  const back = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const ctx = useMemo<OnboardingCtx>(
    () => ({ step, totalSteps: STEPS.length, isActive: active, next, back }),
    [step, active, next, back],
  );

  if (!active || !mounted) return null;

  // Modal do passo 1 pode aparecer em qualquer rota — o passo 2 é que exige
  // a rota certa antes de mostrar spotlight/drawer.
  let node: React.ReactNode = null;
  if (current.type === "modal") {
    node = (
      <OnboardingWelcome
        title={current.title}
        text={current.text}
        primaryLabel={current.primaryLabel}
        onPrimary={next}
        loading={criandoPost}
        step={step}
        totalSteps={STEPS.length}
      />
    );
  } else {
    // Só renderiza o overlay quando a rota bate — evita "ghost" spotlight
    const expectedPath = `/${brandId}/${current.route}`;
    if (pathname !== expectedPath) return null;
    // Passo do drawer: só renderiza depois que o drawer estiver aberto
    if (current.wantsPostParam && sp.get("post") !== postId) return null;
    node = (
      <>
        <OnboardingOverlay
          rect={rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null}
          reducedMotion={reducedMotion}
          interativo={current.interativo}
        />
        <OnboardingTooltip
          position={tooltipPos}
          step={step}
          totalSteps={STEPS.length}
          title={current.title}
          text={current.text}
          primaryLabel={current.primaryLabel}
          mostrarVoltar={current.mostrarVoltar ?? true}
          onBack={back}
          onNext={next}
        />
      </>
    );
  }

  return (
    <OnboardingContext.Provider value={ctx}>
      {createPortal(node, document.body)}
    </OnboardingContext.Provider>
  );
}
