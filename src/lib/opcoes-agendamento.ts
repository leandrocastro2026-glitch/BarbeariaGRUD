import { prisma } from "./prisma";

/** Listas para os selects do formulário de agendamento. */
export async function carregarOpcoesAgendamento() {
  const [clientes, barbeiros, servicos] = await Promise.all([
    // Nome do cliente é cifrado: ordena depois de decifrar.
    prisma.cliente
      .findMany({ select: { id: true, nome: true } })
      .then((l) => l.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))),
    prisma.barbeiro.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, ativo: true } }),
    prisma.servico.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, precoCentavos: true, duracaoMin: true },
    }),
  ]);
  return { clientes, barbeiros, servicos };
}
