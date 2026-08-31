// Cliente Better Auth para uso em Client Components.
// baseURL é resolvido em runtime a partir do host do próprio browser — evita
// depender de NEXT_PUBLIC_APP_URL, que precisa ser rebuildada a cada mudança
// de domínio (deploy no Vercel, preview branches etc).

import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

function resolveBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: resolveBaseUrl(),
  plugins: [organizationClient()],
});

export const { signIn, signUp, signOut, useSession, resetPassword, sendVerificationEmail, requestPasswordReset } = authClient;
