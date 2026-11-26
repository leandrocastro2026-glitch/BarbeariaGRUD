import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { ConflictError, ValidationError } from "../erros";
import { formatarHora, intervaloDoDia } from "../datas";
import {
  agendamentoSchema,
  filtroAgendamentosSchema,
  statusSchema,
  type Status,
} from "../validacao";
import { executar, existeOuFalha, idValido, validar } from "./_base";

type Tx = Prisma.TransactionClient;

const incluirRelacoes = {
  // Só o necessário para a agenda: a recepção não tem acesso aos dados de contato dos clientes.
  cliente: { select: { id: true, nome: true } },
  barbeiro: { select: { id: true, nome: true, ativo: true } },
  servico: { select: { id: true, nome: true, precoCentavos: true, duracaoMin: true } },
} satisfies Prisma.AgendamentoInclude;

export type AgendamentoCompleto = Prisma.AgendamentoGetPayload<{ include: typeof incluirRelacoes }>;

const transacao = <T>(fn: (tx: Tx) => Promise<T>) =>
  prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

export const listar = (filtro: unknown = {}) =>
  executar(() => {
    const { barbeiroId, data } = validar(filtroAgendamentosSchema, filtro);
    const dia = data ? intervaloDoDia(data) : null;
    return prisma.agendamento.findMany({
      where: {
        ...(barbeiroId ? { barbeiroId } : {}),
        ...(dia ? { inicio: { gte: dia.de, lt: dia.ate } } : {}),
      },
      orderBy: { inicio: "asc" },
      include: incluirRelacoes,
    });
  });

export const buscar = (id: unknown) =>
  existeOuFalha(
    prisma.agendamento.findUnique({ where: { id: idValido(id) }, include: incluirRelacoes }),
    "Agendamento não encontrado.",
  );

/** Lança ConflictError se o barbeiro já tiver agendamento ativo que cruze [inicio, fim). */
async function garantirHorarioLivre(
  tx: Tx,
  barbeiroId: number,
  inicio: Date,
  fim: Date,
  ignorarId?: number,
) {
  const conflito = await tx.agendamento.findFirst({
    where: {
      barbeiroId,
      status: { not: "CANCELADO" },
      inicio: { lt: fim },
      fim: { gt: inicio },
      ...(ignorarId ? { id: { not: ignorarId } } : {}),
    },
    include: { cliente: { select: { nome: true } } },
  });
  if (conflito) {
    throw new ConflictError("Horário indisponível para este barbeiro.", {
      inicio: [
        `Conflita com ${conflito.cliente.nome} das ${formatarHora(conflito.inicio)} às ${formatarHora(conflito.fim)}.`,
      ],
    });
  }
}

async function carregarRelacionados(
  tx: Tx,
  ids: { clienteId: number; barbeiroId: number; servicoId: number },
  exigirBarbeiroAtivo: boolean,
) {
  const [cliente, barbeiro, servico] = await Promise.all([
    tx.cliente.findUnique({ where: { id: ids.clienteId } }),
    tx.barbeiro.findUnique({ where: { id: ids.barbeiroId } }),
    tx.servico.findUnique({ where: { id: ids.servicoId } }),
  ]);
  const campos: Record<string, string[]> = {};
  if (!cliente) campos.clienteId = ["Cliente não encontrado."];
  if (!barbeiro) campos.barbeiroId = ["Barbeiro não encontrado."];
  else if (exigirBarbeiroAtivo && !barbeiro.ativo) campos.barbeiroId = ["Barbeiro está inativo."];
  if (!servico) campos.servicoId = ["Serviço não encontrado."];
  if (Object.keys(campos).length) throw new ValidationError("Dados inválidos.", campos);
  return { servico: servico! };
}

const somarMinutos = (d: Date, min: number) => new Date(d.getTime() + min * 60_000);

export const criar = (entrada: unknown) =>
  executar(() => {
    const dados = validar(agendamentoSchema, entrada);
    return transacao(async (tx) => {
      const { servico } = await carregarRelacionados(tx, dados, true);
      const fim = somarMinutos(dados.inicio, servico.duracaoMin);
      if (dados.status !== "CANCELADO") {
        await garantirHorarioLivre(tx, dados.barbeiroId, dados.inicio, fim);
      }
      return tx.agendamento.create({ data: { ...dados, fim }, include: incluirRelacoes });
    });
  });

export const atualizar = (id: unknown, entrada: unknown) =>
  executar(() => {
    const dados = validar(agendamentoSchema, entrada);
    return transacao(async (tx) => {
      const atual = await existeOuFalha(
        tx.agendamento.findUnique({ where: { id: idValido(id) } }),
        "Agendamento não encontrado.",
      );
      const trocouBarbeiro = atual.barbeiroId !== dados.barbeiroId;
      const { servico } = await carregarRelacionados(tx, dados, trocouBarbeiro);

      // Mantém o fim gravado se nem horário nem serviço mudaram (preserva a duração original).
      const recalcular =
        atual.servicoId !== dados.servicoId || atual.inicio.getTime() !== dados.inicio.getTime();
      const fim = recalcular ? somarMinutos(dados.inicio, servico.duracaoMin) : atual.fim;

      if (dados.status !== "CANCELADO") {
        await garantirHorarioLivre(tx, dados.barbeiroId, dados.inicio, fim, atual.id);
      }
      return tx.agendamento.update({
        where: { id: atual.id },
        data: { ...dados, fim },
        include: incluirRelacoes,
      });
    });
  });

export const alterarStatus = (id: unknown, entrada: unknown) =>
  executar(() => {
    const { status } = validar(statusSchema, entrada);
    return transacao(async (tx) => {
      const atual = await existeOuFalha(
        tx.agendamento.findUnique({ where: { id: idValido(id) } }),
        "Agendamento não encontrado.",
      );
      // Sair de CANCELADO volta a ocupar o horário: precisa verificar conflito.
      if ((atual.status as Status) === "CANCELADO" && status !== "CANCELADO") {
        await garantirHorarioLivre(tx, atual.barbeiroId, atual.inicio, atual.fim, atual.id);
      }
      return tx.agendamento.update({
        where: { id: atual.id },
        data: { status },
        include: incluirRelacoes,
      });
    });
  });

export const excluir = (id: unknown) =>
  executar(async () => {
    const atual = await buscar(id);
    await prisma.agendamento.delete({ where: { id: atual.id } });
  });
