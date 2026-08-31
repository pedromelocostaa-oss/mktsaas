// Regra de senha (docs/04): mínimo 10, letras+números, não começa com termo óbvio.

import { describe, expect, it } from "vitest";
import { validarSenha } from "@/server/auth";

describe("validarSenha", () => {
  it("aceita senha forte", () => {
    expect(validarSenha("bicicleta-vermelha-42")).toBeNull();
  });
  it("rejeita curta", () => {
    expect(validarSenha("abc123")).toMatch(/10 caracteres/);
  });
  it("rejeita sem números", () => {
    expect(validarSenha("bicicletavermelha")).toMatch(/letras e números/);
  });
  it("rejeita começando com termo óbvio", () => {
    expect(validarSenha("senha1234567")).toMatch(/termo óbvio/);
  });
});
