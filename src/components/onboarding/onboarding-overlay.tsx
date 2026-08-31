"use client";

// Overlay escuro cobrindo toda a viewport, com um recorte (spotlight) na
// posição do elemento alvo. SVG mask.
//
// Modo `interativo`: quando true, o SVG tem pointer-events:none — cliques
// passam através. Usado no passo do PostDrawer, para que os campos sejam
// editáveis dentro do spotlight. Nos outros passos, `interativo` fica false
// e o overlay bloqueia toda interação com a UI atrás.

interface Props {
  rect: { x: number; y: number; width: number; height: number } | null;
  reducedMotion: boolean;
  interativo?: boolean;
}

const PADDING = 8;
const RADIUS = 16;

export function OnboardingOverlay({ rect, reducedMotion, interativo }: Props) {
  const transition = reducedMotion
    ? undefined
    : "x 200ms ease-out, y 200ms ease-out, width 200ms ease-out, height 200ms ease-out";

  return (
    <svg
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 9998, pointerEvents: interativo ? "none" : "auto" }}
      aria-hidden
    >
      <defs>
        <mask id="onboarding-spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          {rect && (
            <rect
              x={rect.x - PADDING}
              y={rect.y - PADDING}
              width={rect.width + PADDING * 2}
              height={rect.height + PADDING * 2}
              rx={RADIUS}
              ry={RADIUS}
              fill="black"
              style={{ transition }}
            />
          )}
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="rgba(26,29,36,.55)"
        mask="url(#onboarding-spotlight-mask)"
      />
    </svg>
  );
}
