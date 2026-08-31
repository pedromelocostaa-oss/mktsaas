// Fonte única para o que PODE e o que NÃO PODE aparecer num payload público.
// Consumido pelo teste public-endpoint-privacy e serve de checklist ao revisar
// serialização de qualquer nova rota /r, /p, /aprovar.

export const PUBLIC_POST_CHAVES_PERMITIDAS = [
  "title",
  "scheduledAt",
  "networks",
  "campaign",
  "baseCaption",
  "captions", // por rede
  "media", // url, kind, altText
  "metrics", // só em posts publicados (docs/03)
  "metricSource",
  "reachVsBrandAverage",
  "permalink",
] as const;

// docs/08 #6 e docs/03: NUNCA em resposta pública.
export const CHAVES_PROIBIDAS_PUBLICAS = [
  "internalNote",
  "collaborators",
  "review",
  "reviewApproverName",
  "reviewApproverEmail",
  "reviewNote",
  "auditLog",
  "otherBrands",
  "createdById",
  "organizationId",
] as const;
