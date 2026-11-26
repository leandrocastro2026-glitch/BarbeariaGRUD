import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { limiteLogin } from "@/lib/limite-login";
import { PERFIS, type Perfil } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { gerarHashSenha, verificarSenha } from "@/lib/senha";
import { loginSchema } from "@/lib/validacao";

export class ContaBloqueada extends CredentialsSignin {
  code = "bloqueado";
}

// Hash descartável: quando o e-mail não existe, ainda verificamos uma senha para que o
// tempo de resposta não revele quais e-mails estão cadastrados.
let hashFalso: Promise<string> | undefined;
const obterHashFalso = () => (hashFalso ??= gerarHashSenha("senha-que-nao-existe"));

const ehPerfil = (v: unknown): v is Perfil => PERFIS.includes(v as Perfil);

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Instalação própria (não atrás de um proxy desconhecido): confia no Host da requisição.
  trustHost: true,
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, senha: {} },
      async authorize(bruto) {
        const dados = loginSchema.safeParse(bruto);
        if (!dados.success) return null;
        const { email, senha } = dados.data;

        if (limiteLogin.bloqueado(email)) throw new ContaBloqueada();

        const usuario = await prisma.usuario.findUnique({ where: { email } });
        const senhaOk = await verificarSenha(senha, usuario?.senhaHash ?? (await obterHashFalso()));
        if (!usuario || !usuario.ativo || !senhaOk || !ehPerfil(usuario.perfil)) {
          limiteLogin.registrarFalha(email);
          return null;
        }

        limiteLogin.registrarSucesso(email);
        return {
          id: String(usuario.id),
          name: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          versaoSessao: usuario.versaoSessao,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
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
