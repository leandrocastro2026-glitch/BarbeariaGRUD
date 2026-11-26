import { prisma } from "../prisma";
import { ConflictError } from "../erros";
import { gerarHashSenha } from "../senha";
import { usuarioAtualizarSchema, usuarioCriarSchema } from "../validacao";
import { executar, existeOuFalha, idValido, validar } from "./_base";

/** Nunca selecionar senhaHash para fora deste módulo. */
const publico = { id: true, nome: true, email: true, perfil: true, ativo: true, criadoEm: true } as const;

export const listar = () =>
  prisma.usuario.findMany({ select: publico, orderBy: [{ ativo: "desc" }, { nome: "asc" }] });

export const buscar = (id: unknown) =>
  existeOuFalha(prisma.usuario.findUnique({ where: { id: idValido(id) }, select: publico }), "Usuário não encontrado.");

export const criar = (entrada: unknown) =>
  executar(async () => {
    const { senha, ...dados } = validar(usuarioCriarSchema, entrada);
    return prisma.usuario.create({
      data: { ...dados, senhaHash: await gerarHashSenha(senha) },
      select: publico,
    });
  });

async function outrosAdminsAtivos(excetoId: number) {
  return prisma.usuario.count({ where: { perfil: "ADMIN", ativo: true, id: { not: excetoId } } });
}

/** `quemEditaId`: usuário logado, para impedir que ele se tranque para fora. */
export const atualizar = (id: unknown, entrada: unknown, quemEditaId: number) =>
  executar(async () => {
    const atual = await buscar(id);
    const { senha, ...dados } = validar(usuarioAtualizarSchema, entrada);

    const perdeAdmin = atual.perfil === "ADMIN" && atual.ativo && (!dados.ativo || dados.perfil !== "ADMIN");
    if (perdeAdmin && atual.id === quemEditaId) {
      throw new ConflictError("Você não pode desativar nem rebaixar o seu próprio usuário.");
    }
    if (perdeAdmin && (await outrosAdminsAtivos(atual.id)) === 0) {
      throw new ConflictError("É preciso manter pelo menos um administrador ativo.");
    }

    // Trocar senha, perfil ou desativar derruba as sessões abertas desse usuário.
    const invalidaSessoes = !!senha || dados.perfil !== atual.perfil || (atual.ativo && !dados.ativo);
    return prisma.usuario.update({
      where: { id: atual.id },
      data: {
        ...dados,
        ...(senha ? { senhaHash: await gerarHashSenha(senha) } : {}),
        ...(invalidaSessoes ? { versaoSessao: { increment: 1 } } : {}),
      },
      select: publico,
    });
  });

export const excluir = (id: unknown, quemExcluiId: number) =>
  executar(async () => {
    const atual = await buscar(id);
    if (atual.id === quemExcluiId) throw new ConflictError("Você não pode excluir o seu próprio usuário.");
    if (atual.perfil === "ADMIN" && atual.ativo && (await outrosAdminsAtivos(atual.id)) === 0) {
      throw new ConflictError("É preciso manter pelo menos um administrador ativo.");
    }
    await prisma.usuario.delete({ where: { id: atual.id } });
  });
