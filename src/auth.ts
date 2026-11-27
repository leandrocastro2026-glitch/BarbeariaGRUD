import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { indiceEmail } from "@/lib/cripto";
import { confirmacaoDeEmailAtiva } from "@/lib/email";
import { limiteLogin } from "@/lib/limite-login";
import { PERFIS, type Perfil } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { gerarHashSenha, verificarSenha } from "@/lib/senha";
import { entrarComGoogle, enviarLinkVerificacao } from "@/lib/services/cadastro";
import { urlPublica } from "@/lib/url-publica";
import { loginSchema } from "@/lib/validacao";

export class ContaBloqueada extends CredentialsSignin {
  code = "bloqueado";
}
/** Senha certa, mas o e-mail ainda não foi confirmado pelo link. */
export class ContaNaoVerificada extends CredentialsSignin {
  code = "nao_verificado";
}
/** Senha certa, mas a conta foi desativada por um administrador. */
export class ContaInativa extends CredentialsSignin {
  code = "inativa";
}

// Hash descartável: quando o e-mail não existe, ainda verificamos uma senha para que o
// tempo de resposta não revele quais e-mails estão cadastrados.
let hashFalso: Promise<string> | undefined;
const obterHashFalso = () => (hashFalso ??= gerarHashSenha("senha-que-nao-existe"));

const ehPerfil = (v: unknown): v is Perfil => PERFIS.includes(v as Perfil);

/** O botão "Entrar com Google" só existe quando as credenciais do Google estão configuradas. */
export const googleAtivo = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Instalação própria (não atrás de um proxy desconhecido): confia no Host da requisição.
  trustHost: true,
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, senha: {} },
      async authorize(bruto) {
        const dados = loginSchema.safeParse(bruto);
        if (!dados.success) return null;
        const { email, senha } = dados.data;

        if (limiteLogin.bloqueado(email)) throw new ContaBloqueada();

        const usuario = await prisma.usuario.findUnique({ where: { emailHash: indiceEmail(email) } });
        // Conta só do Google (sem senha) também cai no hash falso: nenhuma senha serve.
        const senhaOk = await verificarSenha(senha, usuario?.senhaHash ?? (await obterHashFalso()));
        if (!usuario?.senhaHash || !senhaOk || !ehPerfil(usuario.perfil)) {
          limiteLogin.registrarFalha(email);
          return null;
        }
        limiteLogin.registrarSucesso(email);

        // Só depois de a senha conferir dizemos por que a conta ainda não entra.
        if (!usuario.emailVerificadoEm && confirmacaoDeEmailAtiva()) {
          try {
            await enviarLinkVerificacao(usuario.id, await urlPublica());
          } catch (e) {
            console.error("[cadastro] não foi possível reenviar o link de verificação:", e);
          }
          throw new ContaNaoVerificada();
        }
        if (!usuario.ativo) throw new ContaInativa();

        return {
          id: String(usuario.id),
          name: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          versaoSessao: usuario.versaoSessao,
        };
      },
    }),
    ...(googleAtivo ? [Google] : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const r = await entrarComGoogle(profile ?? {});
      if (r.ok) return true;
      return r.motivo === "inativa" ? "/login?aviso=inativa" : "/login?aviso=google_sem_email";
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google") {
        // O "sub" padrão seria o id do Google; trocamos pelo id do nosso banco.
        const u = await prisma.usuario.findUnique({ where: { googleId: account.providerAccountId } });
        if (!u) return null;
        token.sub = String(u.id);
        token.name = u.nome;
        token.email = u.email;
        token.perfil = u.perfil;
        token.versaoSessao = u.versaoSessao;
        return token;
      }
      if (user?.perfil) token.perfil = user.perfil;
      if (user) token.versaoSessao = user.versaoSessao ?? 0;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.perfil = ehPerfil(token.perfil) ? token.perfil : "RECEPCAO";
      session.user.versaoSessao = typeof token.versaoSessao === "number" ? token.versaoSessao : -1;
      return session;
    },
  },
});
