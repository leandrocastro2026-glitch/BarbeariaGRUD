/**
 * Cadastro pela própria pessoa (e-mail + senha com confirmação por link, ou conta Google).
 *
 * Regra de acesso:
 *  - A primeira conta do sistema vira ADMIN (instalação nova, banco vazio).
 *  - As seguintes são de CLIENTES da barbearia: entram na hora (depois de confirmar o e-mail),
 *    mas só enxergam a área do cliente (marcar e ver os próprios horários).
 *  - Contas da equipe (Recepção/Admin) continuam sendo criadas por um admin em Usuários → Novo.
 */
import { createHash, randomBytes } from "node:crypto";
import { indiceEmail } from "../cripto";
import { confirmacaoDeEmailAtiva, emailVerificacao, enviarEmail } from "../email";
import { prisma } from "../prisma";
import { gerarHashSenha } from "../senha";
import { cadastroSchema } from "../validacao";
import { executar, validar } from "./_base";

const VALIDADE_TOKEN_MS = 24 * 60 * 60_000;
/** Não reenvia outro link para o mesmo usuário antes disso (evita usar o site para spam). */
const INTERVALO_REENVIO_MS = 60_000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Primeira conta → ADMIN; demais → CLIENTE. Ambas ativas. */
async function perfilInicial() {
  const primeira = (await prisma.usuario.count()) === 0;
  return { perfil: primeira ? "ADMIN" : "CLIENTE", ativo: true };
}

/**
 * Gera um novo link de confirmação e envia por e-mail. Os links anteriores deixam de valer.
 * `urlBase` é o endereço público do site (ver `urlPublica` em acoes-auth).
 */
export async function enviarLinkVerificacao(usuarioId: number, urlBase: string) {
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!u || u.emailVerificadoEm) return;

  const recente = await prisma.tokenVerificacao.findFirst({
    where: { usuarioId, criadoEm: { gt: new Date(Date.now() - INTERVALO_REENVIO_MS) } },
  });
  if (recente) return;

  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.tokenVerificacao.deleteMany({ where: { usuarioId } }),
    prisma.tokenVerificacao.create({
      data: { usuarioId, hashToken: hash(token), expiraEm: new Date(Date.now() + VALIDADE_TOKEN_MS) },
    }),
  ]);

  const link = `${urlBase}/verificar-email?token=${encodeURIComponent(token)}`;
  await enviarEmail(emailVerificacao(u.email, u.nome, link));
}

/**
 * `confirmar`: a pessoa precisa clicar no link do e-mail antes de entrar (há provedor de e-mail).
 * `jaExistia`: o e-mail já tinha conta. Só pode ser mostrado a quem pediu quando `confirmar` é
 * false — com confirmação, a resposta é sempre a mesma para não revelar quem tem conta.
 */
export type ResultadoCadastro = { confirmar: boolean; jaExistia: boolean };

/** Cria a conta e, se a confirmação estiver ativa, envia o link. */
export const cadastrar = (entrada: unknown, urlBase: string) =>
  executar(async (): Promise<ResultadoCadastro> => {
    const { nome, email, senha } = validar(cadastroSchema, entrada);
    const confirmar = confirmacaoDeEmailAtiva();
    const existente = await prisma.usuario.findUnique({ where: { emailHash: indiceEmail(email) } });
    if (existente) {
      if (confirmar && !existente.emailVerificadoEm) await enviarLinkVerificacao(existente.id, urlBase);
      return { confirmar, jaExistia: true };
    }
    const senhaHash = await gerarHashSenha(senha);
    const novo = await prisma.usuario.create({
      data: { nome, email, senhaHash, ...(await perfilInicial()) },
      select: { id: true },
    });
    if (confirmar) await enviarLinkVerificacao(novo.id, urlBase);
    return { confirmar, jaExistia: false };
  });

/** Confirma o e-mail a partir do token do link. Devolve false se o link for inválido ou vencido. */
export async function confirmarEmail(token: string): Promise<boolean> {
  if (!token || token.length > 200) return false;
  const registro = await prisma.tokenVerificacao.findUnique({ where: { hashToken: hash(token) } });
  if (!registro || registro.expiraEm < new Date()) return false;
  await prisma.$transaction([
    prisma.usuario.update({ where: { id: registro.usuarioId }, data: { emailVerificadoEm: new Date() } }),
    prisma.tokenVerificacao.deleteMany({ where: { usuarioId: registro.usuarioId } }),
  ]);
  return true;
}

export type PerfilGoogle = { sub?: string | null; email?: string | null; email_verified?: unknown; name?: string | null };
export type ResultadoGoogle = { ok: true; id: number } | { ok: false; motivo: "email_nao_verificado" | "inativa" };

/**
 * Entrada com Google: acha a conta pelo id do Google ou pelo e-mail (o Google já verificou o e-mail,
 * então é seguro vincular) e cria uma nova se não existir.
 */
export async function entrarComGoogle(p: PerfilGoogle): Promise<ResultadoGoogle> {
  const email = p.email?.trim().toLowerCase();
  if (!p.sub || !email || p.email_verified !== true) return { ok: false, motivo: "email_nao_verificado" };

  let u = await prisma.usuario.findUnique({ where: { googleId: p.sub } });
  if (!u) {
    const porEmail = await prisma.usuario.findUnique({ where: { emailHash: indiceEmail(email) } });
    u = porEmail
      ? await prisma.usuario.update({
          where: { id: porEmail.id },
          data: porEmail.emailVerificadoEm
            ? { googleId: p.sub }
            : // Conta nunca confirmada: a senha pode ter sido criada por outra pessoa usando este
              // e-mail. Quem provou ser dono do e-mail foi o Google, então a senha antiga é descartada.
              { googleId: p.sub, emailVerificadoEm: new Date(), senhaHash: null, versaoSessao: { increment: 1 } },
        })
      : await prisma.usuario.create({
          data: {
            nome: p.name?.trim().slice(0, 100) || email.split("@")[0],
            email,
            googleId: p.sub,
            emailVerificadoEm: new Date(),
            ...(await perfilInicial()),
          },
        });
  }
  if (!u.ativo) return { ok: false, motivo: "inativa" };
  return { ok: true, id: u.id };
}
