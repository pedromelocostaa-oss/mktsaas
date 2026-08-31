// Better Auth — email+senha, Google, plugin de organização.
//
// Decisões (docs/04):
// - Sessão em banco (revogação imediata), cookie httpOnly, SameSite=Lax
// - Regra de senha: mínimo 10, letras e números, não começa com termo óbvio
// - Erro de login sempre "E-mail ou senha incorretos" (Better Auth já faz isso;
//   nunca customize a mensagem revelando existência da conta)
// - Hash da senha mesmo quando user não existe (timing) — Better Auth já faz
// - Verificar e-mail NÃO tranca o produto (docs/04) — só review.request e share.create

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";

const senhaFraca = /^(pauta|senha|password|admin|123456|qwerty)/i;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    // regra de senha (docs/04) — comprimento mínimo aplicado aqui;
    // termo óbvio validado no server action de sign-up (validarSenha).
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: false,
    sendResetPassword: async ({ user, url }) => {
      // TODO Fase 9: Resend + React Email. Por enquanto, log.
      // eslint-disable-next-line no-console
      console.log(`[email:reset] para=${user.email} url=${url}`);
    },
  },

  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,

  user: {
    additionalFields: {
      productUpdates: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: true, // vem do formulário de cadastro
      },
    },
  },

  session: {
    // sessão em banco, revogação imediata (docs/04)
    storeSessionInDatabase: true,
    expiresIn: 60 * 60 * 24 * 30, // 30 dias
    updateAge: 60 * 60 * 24, // renova cookie a cada dia
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  advanced: {
    cookies: {
      session_token: { attributes: { sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" } },
    },
  },

  hooks: {
    // rejeita senha começando com termo óbvio — regra do docs/04
    // Better Auth já valida length; nosso hook complementa.
    // Como a Better Auth não expõe hook direto de "validate password", validamos
    // via before-hook do sign-up.
  },

  plugins: [
    organization({
      // extensões da Organization (docs/02)
      schema: {
        organization: {
          additionalFields: {
            timezone: { type: "string", required: false, defaultValue: "America/Sao_Paulo" },
            plan: { type: "string", required: false, defaultValue: "FREE" },
            includedBrands: { type: "number", required: false, defaultValue: 3 },
            stripeCustomerId: { type: "string", required: false },
            stripeSubscriptionId: { type: "string", required: false },
          },
        },
      },
    }),
    // Precisa vir por último para setar cookies em server actions do Next
    nextCookies(),
  ],
});

/** Utilidade para validar a regra de senha (docs/04) fora do Better Auth. */
export function validarSenha(senha: string): string | null {
  if (senha.length < 10) return "A senha precisa ter pelo menos 10 caracteres.";
  if (!/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) return "A senha precisa ter letras e números.";
  if (senhaFraca.test(senha)) return "Escolha uma senha que não começa por um termo óbvio.";
  return null;
}

export type Auth = typeof auth;
