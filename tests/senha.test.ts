import { describe, expect, it } from "vitest";
import { gerarHashSenha, verificarSenha } from "@/lib/senha";

describe("senha", () => {
  it("gera hash diferente a cada vez (salt) e verifica corretamente", async () => {
    const a = await gerarHashSenha("segredo123");
    const b = await gerarHashSenha("segredo123");
    expect(a).not.toBe(b);
    expect(a).not.toContain("segredo123");
    expect(await verificarSenha("segredo123", a)).toBe(true);
    expect(await verificarSenha("segredo124", a)).toBe(false);
  });

  it("rejeita hash malformado sem lançar erro", async () => {
    expect(await verificarSenha("x", "lixo")).toBe(false);
    expect(await verificarSenha("x", "scrypt$abc$def")).toBe(false);
  });
});
