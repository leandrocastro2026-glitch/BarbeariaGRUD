import { describe, expect, it } from "vitest";
import { criarLimiteLogin } from "@/lib/limite-login";

describe("limite de tentativas de login", () => {
  it("bloqueia após 5 falhas em 15 min e libera depois", () => {
    let agora = 0;
    const limite = criarLimiteLogin({ maxFalhas: 5, janelaMs: 15 * 60_000, relogio: () => agora });
    for (let i = 0; i < 4; i++) limite.registrarFalha("a@x.com");
    expect(limite.bloqueado("a@x.com")).toBe(false);
    limite.registrarFalha("A@X.com"); // normaliza e-mail
    expect(limite.bloqueado("a@x.com")).toBe(true);
    expect(limite.bloqueado("outro@x.com")).toBe(false);
    agora += 15 * 60_000 + 1;
    expect(limite.bloqueado("a@x.com")).toBe(false);
  });

  it("falhas antigas saem da janela", () => {
    let agora = 0;
    const limite = criarLimiteLogin({ maxFalhas: 3, janelaMs: 1000, relogio: () => agora });
    limite.registrarFalha("a@x.com");
    limite.registrarFalha("a@x.com");
    agora = 2000;
    limite.registrarFalha("a@x.com");
    expect(limite.bloqueado("a@x.com")).toBe(false);
  });

  it("sucesso zera o contador", () => {
    const limite = criarLimiteLogin({ maxFalhas: 2, janelaMs: 1000, relogio: () => 0 });
    limite.registrarFalha("a@x.com");
    limite.registrarSucesso("a@x.com");
    limite.registrarFalha("a@x.com");
    expect(limite.bloqueado("a@x.com")).toBe(false);
  });
});
