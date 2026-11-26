import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import * as agendamentos from "@/lib/services/agendamentos";
import * as barbeiros from "@/lib/services/barbeiros";
import * as clientes from "@/lib/services/clientes";
import * as servicos from "@/lib/services/servicos";
import { ConflictError, ValidationError } from "@/lib/erros";

let clienteId: number;
let barbeiroA: number;
let barbeiroB: number;
let corte: number; // 30 min

beforeEach(async () => {
  await prisma.agendamento.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.barbeiro.deleteMany();
  await prisma.servico.deleteMany();
  clienteId = (await clientes.criar({ nome: "Ana", telefone: "11988887777" })).id;
  barbeiroA = (await barbeiros.criar({ nome: "João", telefone: "1133334444" })).id;
  barbeiroB = (await barbeiros.criar({ nome: "Pedro", telefone: "1133335555" })).id;
  corte = (await servicos.criar({ nome: "Corte", preco: 40, duracaoMin: 30 })).id;
});

const agendar = (barbeiroId: number, inicio: string) =>
  agendamentos.criar({ clienteId, barbeiroId, servicoId: corte, inicio });

describe("agendamentos", () => {
  it("calcula o fim pela duração do serviço", async () => {
    const a = await agendar(barbeiroA, "2026-12-01T10:00");
    expect(a.fim.getTime() - a.inicio.getTime()).toBe(30 * 60_000);
  });

  it("permite mesmo horário com barbeiros diferentes", async () => {
    await agendar(barbeiroA, "2026-12-01T10:00");
    await expect(agendar(barbeiroB, "2026-12-01T10:00")).resolves.toBeTruthy();
  });

  it("bloqueia horário sobreposto no mesmo barbeiro", async () => {
    await agendar(barbeiroA, "2026-12-01T10:00");
    await expect(agendar(barbeiroA, "2026-12-01T10:15")).rejects.toBeInstanceOf(ConflictError);
  });

  it("permite horário colado no anterior", async () => {
    await agendar(barbeiroA, "2026-12-01T10:00");
    await expect(agendar(barbeiroA, "2026-12-01T10:30")).resolves.toBeTruthy();
  });

  it("agendamento cancelado não ocupa o horário", async () => {
    const a = await agendar(barbeiroA, "2026-12-01T10:00");
    await agendamentos.alterarStatus(a.id, { status: "CANCELADO" });
    await expect(agendar(barbeiroA, "2026-12-01T10:00")).resolves.toBeTruthy();
  });

  it("reativar um cancelado verifica conflito", async () => {
    const a = await agendar(barbeiroA, "2026-12-01T10:00");
    await agendamentos.alterarStatus(a.id, { status: "CANCELADO" });
    await agendar(barbeiroA, "2026-12-01T10:00");
    await expect(agendamentos.alterarStatus(a.id, { status: "AGENDADO" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("editar o próprio agendamento não conflita consigo mesmo", async () => {
    const a = await agendar(barbeiroA, "2026-12-01T10:00");
    await expect(
      agendamentos.atualizar(a.id, {
        clienteId,
        barbeiroId: barbeiroA,
        servicoId: corte,
        inicio: "2026-12-01T10:10",
      }),
    ).resolves.toBeTruthy();
  });

  it("recusa agendamento para barbeiro inativo", async () => {
    await barbeiros.atualizar(barbeiroA, { nome: "João", telefone: "1133334444", ativo: false });
    await expect(agendar(barbeiroA, "2026-12-01T10:00")).rejects.toBeInstanceOf(ValidationError);
  });

  it("filtra por barbeiro e data (dia em horário de Brasília)", async () => {
    await agendar(barbeiroA, "2026-12-01T22:00"); // 01:00Z do dia 02
    await agendar(barbeiroB, "2026-12-01T10:00");
    await agendar(barbeiroA, "2026-12-02T10:00");
    const r = await agendamentos.listar({ barbeiroId: barbeiroA, data: "2026-12-01" });
    expect(r).toHaveLength(1);
    expect(r[0].barbeiro.id).toBe(barbeiroA);
  });
});

describe("exclusões", () => {
  it("bloqueia excluir barbeiro, cliente ou serviço com agendamentos", async () => {
    await agendar(barbeiroA, "2026-12-01T10:00");
    await expect(barbeiros.excluir(barbeiroA)).rejects.toBeInstanceOf(ConflictError);
    await expect(clientes.excluir(clienteId)).rejects.toBeInstanceOf(ConflictError);
    await expect(servicos.excluir(corte)).rejects.toBeInstanceOf(ConflictError);
  });

  it("exclui barbeiro sem agendamentos", async () => {
    await barbeiros.excluir(barbeiroB);
    expect(await barbeiros.listar()).toHaveLength(1);
  });

  it("conta agendamentos futuros do barbeiro", async () => {
    await agendar(barbeiroA, "2099-01-01T10:00");
    await agendar(barbeiroA, "2000-01-01T10:00");
    expect(await barbeiros.contarAgendamentosFuturos(barbeiroA)).toBe(1);
  });
});

describe("unicidade", () => {
  it("recusa e-mail de cliente duplicado", async () => {
    await clientes.criar({ nome: "B", telefone: "11977776666", email: "b@x.com" });
    await expect(
      clientes.criar({ nome: "C", telefone: "11977776666", email: "b@x.com" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
