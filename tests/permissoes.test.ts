import { describe, expect, it } from "vitest";
import { pode } from "@/lib/permissoes";

describe("permissoes", () => {
  it("admin pode tudo", () => {
    for (const r of ["agendamentos", "clientes", "barbeiros", "servicos", "usuarios", "dashboard", "faturamento"] as const) {
      expect(pode("ADMIN", r, "ler")).toBe(true);
      expect(pode("ADMIN", r, "escrever")).toBe(true);
    }
  });

  it("recepção agenda, mas não acessa clientes", () => {
    expect(pode("RECEPCAO", "agendamentos", "escrever")).toBe(true);
    expect(pode("RECEPCAO", "clientes", "ler")).toBe(false);
    expect(pode("RECEPCAO", "clientes", "escrever")).toBe(false);
  });

  it("recepção só lê barbeiros e serviços", () => {
    expect(pode("RECEPCAO", "barbeiros", "ler")).toBe(true);
    expect(pode("RECEPCAO", "barbeiros", "escrever")).toBe(false);
    expect(pode("RECEPCAO", "servicos", "ler")).toBe(true);
    expect(pode("RECEPCAO", "servicos", "escrever")).toBe(false);
  });

  it("recepção não acessa usuários, dashboard nem faturamento", () => {
    for (const r of ["usuarios", "dashboard", "faturamento"] as const) {
      expect(pode("RECEPCAO", r, "ler")).toBe(false);
    }
  });

  it("perfil desconhecido não pode nada", () => {
    expect(pode("HACKER" as never, "clientes", "ler")).toBe(false);
  });
});
