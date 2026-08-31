// Fase 3 aceite: "Nada além daquele post é acessível pelo token."
// docs/08 #6: nunca vaza internalNote/colaboradores/Review-detalhes.
//
// O que a tela do aprovador expõe é decidido pelo `include` da query em
// aprovar/[token]/page.tsx. Este teste valida a FORMA da query — as chaves
// que devem SAIR na resposta pública, e as que devem FICAR DE FORA.

import { describe, expect, it } from "vitest";
import { PUBLIC_POST_CHAVES_PERMITIDAS, CHAVES_PROIBIDAS_PUBLICAS } from "@/lib/public-shape";

describe("forma do post público", () => {
  it("chaves permitidas não incluem nenhuma proibida", () => {
    for (const proibida of CHAVES_PROIBIDAS_PUBLICAS) {
      expect(PUBLIC_POST_CHAVES_PERMITIDAS).not.toContain(proibida);
    }
  });

  it("inclui título, data, redes, texto — os campos que o aprovador precisa ver", () => {
    for (const k of ["title", "scheduledAt", "networks", "baseCaption", "media"]) {
      expect(PUBLIC_POST_CHAVES_PERMITIDAS).toContain(k);
    }
  });
});
