// Fase 5: token social criptografado em repouso (docs/08 #10, docs/02).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { encryptToken, decryptToken, socialCryptoConfigured } from "@/lib/crypto";

const bkp = process.env.SOCIAL_TOKEN_KEY;

beforeAll(() => {
  // 32 bytes hex = 64 chars
  process.env.SOCIAL_TOKEN_KEY = "0".repeat(64);
});
afterAll(() => {
  if (bkp) process.env.SOCIAL_TOKEN_KEY = bkp;
  else delete process.env.SOCIAL_TOKEN_KEY;
});

describe("AES-256-GCM social token", () => {
  it("configuredSync detecta chave", () => {
    expect(socialCryptoConfigured()).toBe(true);
  });

  it("encrypt/decrypt roundtrip", () => {
    const plain = "IGAA...instagram-long-lived-token-xyz";
    const sealed = encryptToken(plain);
    expect(sealed).not.toContain(plain);
    expect(decryptToken(sealed)).toBe(plain);
  });

  it("cifras iguais em dois encrypts (nonce único)", () => {
    const a = encryptToken("mesma-string");
    const b = encryptToken("mesma-string");
    expect(a).not.toBe(b);
  });

  it("tampering detectado (GCM tag)", () => {
    const sealed = encryptToken("abcdef");
    // flippa o último char do base64
    const alterado = sealed.slice(0, -1) + (sealed.endsWith("A") ? "B" : "A");
    expect(() => decryptToken(alterado)).toThrow();
  });
});
