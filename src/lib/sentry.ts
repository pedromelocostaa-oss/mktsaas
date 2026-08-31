// Sentry — Fase 0. Configuração mínima, DSN opcional.
// Setup completo (sourcemaps, replay) fica para a Fase 9.

import * as Sentry from "@sentry/nextjs";

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  });
}
