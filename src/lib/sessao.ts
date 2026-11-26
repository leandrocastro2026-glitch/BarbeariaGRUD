import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { ForbiddenError, UnauthorizedError } from "./erros";
import { pode, type Acao, type Perfil, type Recurso } from "./permissoes";
import { prisma } from "./prisma";

export type UsuarioSessao = { id: number; nome: string; email: string; perfil: Perfil };

/**
 * Usuário da requisição atual, conferido no banco (não só no JWT): um usuário
 * desativado, excluído ou que trocou de senha/perfil perde as sessões antigas na hora. Memorizado por requisição.
 */
export const usuarioAtual = cache(async (): Promise<UsuarioSessao | null> => {
  const sessao = await auth();
  const id = Number(sessao?.user?.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const u = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true, versaoSessao: true },
  });
  // Sessão emitida antes de uma troca de senha/perfil/desativação não vale mais.
  if (!u?.ativo || u.versaoSessao !== sessao?.user?.versaoSessao) return null;
  return { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil as Perfil };
});

/** Para rotas de API: lança 401/403, que `responder` converte em JSON. */
export async function exigirUsuario(recurso?: Recurso, acao: Acao = "ler"): Promise<UsuarioSessao> {
  const u = await usuarioAtual();
  if (!u) throw new UnauthorizedError();
  if (recurso && !pode(u.perfil, recurso, acao)) throw new ForbiddenError();
  return u;
}

/** Para páginas: redireciona para o login ou para a tela de sem permissão. */
export async function exigirPagina(recurso?: Recurso, acao: Acao = "ler"): Promise<UsuarioSessao> {
  const u = await usuarioAtual();
  if (!u) redirect("/login");
  if (recurso && !pode(u.perfil, recurso, acao)) redirect("/sem-permissao");
  return u;
}
