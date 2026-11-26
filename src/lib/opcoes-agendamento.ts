import { prisma } from "./prisma";

/** Listas para os selects do formulário de agendamento. */
export async function carregarOpcoesAgendamento() {
  const [clientes, barbeiros, servicos] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.barbeiro.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, ativo: true } }),
    prisma.servico.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, precoCentavos: true, duracaoMin: true },
    }),
  ]);
  return { clientes, barbeiros, servicos };
}
