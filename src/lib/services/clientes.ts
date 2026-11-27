import { prisma } from "../prisma";
import { ConflictError } from "../erros";
import { clienteSchema } from "../validacao";
import { executar, existeOuFalha, idValido, validar } from "./_base";

// O nome é cifrado no banco: a ordenação alfabética é feita depois de decifrar.
export const listar = async () =>
  (
    await prisma.cliente.findMany({ include: { _count: { select: { agendamentos: true } } } })
  ).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

export const buscar = (id: unknown) =>
  existeOuFalha(prisma.cliente.findUnique({ where: { id: idValido(id) } }), "Cliente não encontrado.");

export const criar = (entrada: unknown) =>
  executar(() => prisma.cliente.create({ data: validar(clienteSchema, entrada) }));

export const atualizar = (id: unknown, entrada: unknown) =>
  executar(async () => {
    const atual = await buscar(id);
    return prisma.cliente.update({ where: { id: atual.id }, data: validar(clienteSchema, entrada) });
  });

export const excluir = (id: unknown) =>
  executar(async () => {
    const atual = await buscar(id);
    const total = await prisma.agendamento.count({ where: { clienteId: atual.id } });
    if (total > 0) {
      throw new ConflictError(
        `Não é possível excluir: o cliente tem ${total} agendamento(s). Exclua-os antes.`,
      );
    }
    await prisma.cliente.delete({ where: { id: atual.id } });
  });
