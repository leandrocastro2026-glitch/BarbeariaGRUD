import { prisma } from "../prisma";
import { ConflictError } from "../erros";
import { barbeiroSchema } from "../validacao";
import { executar, existeOuFalha, idValido, validar } from "./_base";

export const listar = (opcoes: { apenasAtivos?: boolean } = {}) =>
  prisma.barbeiro.findMany({
    where: opcoes.apenasAtivos ? { ativo: true } : undefined,
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: { _count: { select: { agendamentos: true } } },
  });

export const buscar = (id: unknown) =>
  existeOuFalha(prisma.barbeiro.findUnique({ where: { id: idValido(id) } }), "Barbeiro não encontrado.");

export const criar = (entrada: unknown) =>
  executar(() => prisma.barbeiro.create({ data: validar(barbeiroSchema, entrada) }));

export const atualizar = (id: unknown, entrada: unknown) =>
  executar(async () => {
    const atual = await buscar(id);
    return prisma.barbeiro.update({ where: { id: atual.id }, data: validar(barbeiroSchema, entrada) });
  });

/** Agendamentos ainda não cancelados a partir de agora; usado para avisar ao desativar. */
export const contarAgendamentosFuturos = (id: unknown) =>
  prisma.agendamento.count({
    where: { barbeiroId: idValido(id), status: "AGENDADO", inicio: { gte: new Date() } },
  });

export const excluir = (id: unknown) =>
  executar(async () => {
    const atual = await buscar(id);
    const total = await prisma.agendamento.count({ where: { barbeiroId: atual.id } });
    if (total > 0) {
      throw new ConflictError(
        `Não é possível excluir: o barbeiro tem ${total} agendamento(s). Desative-o em vez de excluir.`,
      );
    }
    await prisma.barbeiro.delete({ where: { id: atual.id } });
  });
