import { describe, expect, it } from "vitest";
import {
  agendamentoSchema,
  barbeiroSchema,
  clienteSchema,
  servicoSchema,
} from "@/lib/validacao";

describe("clienteSchema", () => {
  it("aceita cliente sem e-mail e converte string vazia em null", () => {
    const r = clienteSchema.parse({ nome: " Ana ", telefone: "(11) 98888-7777", email: "" });
    expect(r).toEqual({ nome: "Ana", telefone: "(11) 98888-7777", email: null });
  });

  it("rejeita e-mail inválido e nome vazio", () => {
    const r = clienteSchema.safeParse({ nome: "", telefone: "11988887777", email: "x@" });
    expect(r.success).toBe(false);
    const campos = r.error!.issues.map((i) => i.path[0]);
    expect(campos).toEqual(expect.arrayContaining(["nome", "email"]));
  });

  it("telefone vazio mostra 'obrigatório' como primeira mensagem", () => {
    const r = clienteSchema.safeParse({ nome: "Ana", telefone: "  " });
    expect(r.error!.issues.find((i) => i.path[0] === "telefone")!.message).toBe("Telefone é obrigatório.");
  });

  it("rejeita telefone curto", () => {
    expect(clienteSchema.safeParse({ nome: "Ana", telefone: "123" }).success).toBe(false);
  });
});

describe("barbeiroSchema", () => {
  it("usa ativo=true por padrão", () => {
    const r = barbeiroSchema.parse({ nome: "João", telefone: "11 3333-4444" });
    expect(r.ativo).toBe(true);
    expect(r.especialidade).toBeNull();
  });
});

describe("servicoSchema", () => {
  it("converte preço em reais (com vírgula) para centavos", () => {
    const r = servicoSchema.parse({ nome: "Corte", preco: "35,50", duracaoMin: "30" });
    expect(r).toEqual({ nome: "Corte", precoCentavos: 3550, duracaoMin: 30 });
  });

  it("rejeita preço negativo e duração inválida", () => {
    expect(servicoSchema.safeParse({ nome: "X", preco: -1, duracaoMin: 30 }).success).toBe(false);
    expect(servicoSchema.safeParse({ nome: "X", preco: 10, duracaoMin: 0 }).success).toBe(false);
    expect(servicoSchema.safeParse({ nome: "X", preco: 10, duracaoMin: 7.5 }).success).toBe(false);
  });
});

describe("agendamentoSchema", () => {
  it("interpreta data/hora sem fuso como horário de Brasília", () => {
    const r = agendamentoSchema.parse({
      clienteId: "1",
      barbeiroId: 2,
      servicoId: "3",
      inicio: "2026-12-01T14:30",
    });
    expect(r.inicio.toISOString()).toBe("2026-12-01T17:30:00.000Z");
    expect(r.status).toBe("AGENDADO");
    expect(r).toMatchObject({ clienteId: 1, barbeiroId: 2, servicoId: 3, observacao: null });
  });

  it("rejeita status desconhecido e data inválida", () => {
    const base = { clienteId: 1, barbeiroId: 1, servicoId: 1 };
    expect(agendamentoSchema.safeParse({ ...base, inicio: "ontem" }).success).toBe(false);
    expect(
      agendamentoSchema.safeParse({ ...base, inicio: "2026-12-01T10:00", status: "PERDIDO" }).success,
    ).toBe(false);
  });
});
