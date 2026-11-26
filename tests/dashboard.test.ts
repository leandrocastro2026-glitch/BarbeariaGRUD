import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resumoDashboard } from "@/lib/services/dashboard";

const AGORA = new Date("2026-06-30T15:00:00Z");
const diasAtras = (d: number) => new Date(AGORA.getTime() - d * 86_400_000);

let ana: number, bia: number, caio: number, davi: number;
let corte: number, barba: number, joao: number;

async function ag(clienteId: number, servicoId: number, dias: number, status: string) {
  const inicio = diasAtras(dias);
  await prisma.agendamento.create({
    data: { clienteId, servicoId, barbeiroId: joao, inicio, fim: new Date(inicio.getTime() + 30 * 60_000), status },
  });
}

beforeEach(async () => {
  await prisma.agendamento.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.servico.deleteMany();
  await prisma.barbeiro.deleteMany();
  const c = (nome: string) => prisma.cliente.create({ data: { nome, telefone: "11999990000" } }).then((x) => x.id);
  [ana, bia, caio, davi] = [await c("Ana"), await c("Bia"), await c("Caio"), await c("Davi")];
  corte = (await prisma.servico.create({ data: { nome: "Corte", precoCentavos: 4000, duracaoMin: 30 } })).id;
  barba = (await prisma.servico.create({ data: { nome: "Barba", precoCentavos: 3000, duracaoMin: 20 } })).id;
  joao = (await prisma.barbeiro.create({ data: { nome: "João", telefone: "1133334444" } })).id;

  // Período atual (últimos 30 dias)
  await ag(ana, corte, 2, "CONCLUIDO"); // Ana: recorrente (já veio há 60 dias)
  await ag(ana, barba, 3, "CONCLUIDO");
  await ag(bia, corte, 5, "CONCLUIDO"); // Bia: nova
  await ag(bia, corte, 6, "CANCELADO");
  await ag(caio, barba, 10, "CANCELADO");
  // Período anterior (30–60 dias)
  await ag(ana, corte, 60 - 1, "CONCLUIDO");
  await ag(caio, corte, 45, "CONCLUIDO"); // Caio: última visita há 45 dias, sem futuro → sumido
  await ag(davi, corte, 40, "CONCLUIDO"); // Davi: sumido, mas tem horário futuro → não conta
  await ag(davi, barba, -3, "AGENDADO");
});

describe("resumoDashboard (30 dias)", () => {
  it("ranqueia serviços concluídos por quantidade e receita", async () => {
    const r = await resumoDashboard({ dias: 30, agora: AGORA });
    expect(r.servicos).toEqual([
      { servicoId: corte, nome: "Corte", quantidade: 2, receitaCentavos: 8000 },
      { servicoId: barba, nome: "Barba", quantidade: 1, receitaCentavos: 3000 },
    ]);
    expect(r.receitaCentavos).toBe(11000);
  });

  it("calcula cancelamentos do período e do anterior", async () => {
    const r = await resumoDashboard({ dias: 30, agora: AGORA });
    expect(r.cancelamentos).toEqual({ total: 5, cancelados: 2, taxa: 0.4, taxaAnterior: 0 });
  });

  it("separa clientes novos e recorrentes", async () => {
    const r = await resumoDashboard({ dias: 30, agora: AGORA });
    expect(r.clientes).toEqual({ atendidos: 2, novos: 1, recorrentes: 1 });
  });

  it("lista clientes sumidos (30+ dias, sem nada marcado)", async () => {
    const r = await resumoDashboard({ dias: 30, agora: AGORA });
    expect(r.sumidos.map((s) => s.nome)).toEqual(["Caio"]);
    expect(r.sumidos[0].diasSemVir).toBe(45);
  });

  it("rejeita período fora de 7/30/90", async () => {
    await expect(resumoDashboard({ dias: 12 as never, agora: AGORA })).rejects.toThrow();
  });
});
