import { prisma } from "../prisma";
import { ConflictError } from "../erros";
import { servicoSchema } from "../validacao";
import { executar, existeOuFalha, idValido, validar } from "./_base";

export const listar = () =>
  prisma.servico.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { agendamentos: true } } },
  });

export const buscar = (id: unknown) =>
  existeOuFalha(prisma.servico.findUnique({ where: { id: idValido(id) } }), "Serviço não encontrado.");

export const criar = (entrada: unknown) =>
  executar(() => prisma.servico.create({ data: validar(servicoSchema, entrada) }));

/** Alterar a duração não muda agendamentos existentes: o `fim` deles já está gravado. */
export const atualizar = (id: unknown, entrada: unknown) =>
  executar(async () => {
    const atual = await buscar(id);
    return prisma.servico.update({ where: { id: atual.id }, data: validar(servicoSchema, entrada) });
  });

export const excluir = (id: unknown) =>
  executar(async () => {
    const atual = await buscar(id);
    const total = await prisma.agendamento.count({ where: { servicoId: atual.id } });
    if (total > 0) {
      throw new ConflictError(
        `Não é possível excluir: o serviço tem ${total} agendamento(s) vinculados.`,
      );
    }
    await prisma.servico.delete({ where: { id: atual.id } });
  });
