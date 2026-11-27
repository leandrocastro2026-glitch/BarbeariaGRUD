"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";
import { googleAtivo, signIn, signOut } from "@/auth";
import { AppError, ConflictError, ValidationError } from "@/lib/erros";
import { confirmacaoDeEmailAtiva } from "@/lib/email";
import { criarLimiteLogin } from "@/lib/limite-login";
import { cadastrar as cadastrarConta, confirmarEmail } from "@/lib/services/cadastro";
import { urlPublica } from "@/lib/url-publica";

export type EstadoLogin = { erro?: string; aviso?: string; email?: string };

/** Aceita só caminhos internos, para o parâmetro "de" não virar redirecionamento aberto. */
function destinoSeguro(valor: FormDataEntryValue | null) {
  const v = typeof valor === "string" ? valor : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/login") ? v : "/";
}

export async function entrar(_anterior: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = String(form.get("email") ?? "");
  try {
    await signIn("credentials", {
      email,
      senha: String(form.get("senha") ?? ""),
      redirectTo: destinoSeguro(form.get("de")),
    });
    return {};
  } catch (e) {
    // O redirect de sucesso também chega aqui como exceção e precisa ser relançado.
    if (!(e instanceof AuthError)) throw e;
    if (e instanceof CredentialsSignin) {
      if (e.code === "bloqueado") return { email, erro: "Muitas tentativas sem sucesso. Aguarde 15 minutos e tente de novo." };
      if (e.code === "nao_verificado") {
        return {
          email,
          aviso: "Falta confirmar seu e-mail. Enviamos um link para a sua caixa de entrada (confira também o spam).",
        };
      }
      if (e.code === "inativa") {
        return { email, erro: "Esta conta está desativada. Fale com a barbearia." };
      }
    }
    if (e.type === "CredentialsSignin") return { email, erro: "E-mail ou senha inválidos." };
    return { email, erro: "Não foi possível entrar agora. Tente novamente." };
  }
}

export async function entrarGoogle(form: FormData) {
  if (!googleAtivo) redirect("/login");
  await signIn("google", { redirectTo: destinoSeguro(form.get("de")) });
}

export async function sair() {
  await signOut({ redirectTo: "/login" });
}

// ---------- Cadastro ----------

export type EstadoCadastro = {
  ok?: boolean;
  erro?: string;
  campos?: Record<string, string>;
  valores?: { nome?: string; email?: string };
};

/** No máximo 5 cadastros por hora vindos do mesmo IP. */
const limiteCadastro = criarLimiteLogin({ maxFalhas: 5, janelaMs: 60 * 60_000 });

async function ipDaRequisicao() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

export async function cadastrar(_anterior: EstadoCadastro, form: FormData): Promise<EstadoCadastro> {
  const entrada = {
    nome: String(form.get("nome") ?? ""),
    email: String(form.get("email") ?? ""),
    senha: String(form.get("senha") ?? ""),
    confirmacao: String(form.get("confirmacao") ?? ""),
  };
  const valores = { nome: entrada.nome, email: entrada.email };

  const ip = await ipDaRequisicao();
  if (limiteCadastro.bloqueado(ip)) {
    return { valores, erro: "Muitos cadastros feitos daqui. Aguarde um pouco e tente de novo." };
  }

  const jaTemConta: EstadoCadastro = {
    valores,
    erro: "Este e-mail já tem conta. Entre com ele ou use outro e-mail.",
    campos: { email: "Já existe uma conta com este e-mail." },
  };

  let resultado;
  try {
    resultado = await cadastrarConta(entrada, await urlPublica());
    limiteCadastro.registrarFalha(ip);
  } catch (e) {
    if (e instanceof ValidationError) {
      const campos = Object.fromEntries(Object.entries(e.campos ?? {}).map(([k, v]) => [k, v[0] ?? ""]));
      return { valores, erro: "Confira os campos destacados.", campos };
    }
    // Dois cadastros simultâneos com o mesmo e-mail.
    if (e instanceof ConflictError) return confirmacaoDeEmailAtiva() ? { ok: true, valores } : jaTemConta;
    console.error("[cadastro] falha ao cadastrar:", e instanceof AppError ? e.message : e);
    return { valores, erro: "Não foi possível concluir o cadastro agora. Tente novamente." };
  }

  // Com confirmação por e-mail: mesma resposta exista ou não a conta (não revela quem tem conta).
  if (resultado.confirmar) return { ok: true, valores };
  if (resultado.jaExistia) return jaTemConta;
  // Sem confirmação: a conta já vale, então entra direto (o redirect sai daqui como exceção).
  await signIn("credentials", { email: entrada.email, senha: entrada.senha, redirectTo: "/" });
  return {};
}

/**
 * Confirmação por botão (POST), não ao abrir o link: leitores de e-mail e antivírus costumam
 * visitar os links sozinhos, e isso não pode confirmar a conta no lugar da pessoa.
 */
export async function confirmar(form: FormData) {
  const ok = await confirmarEmail(String(form.get("token") ?? ""));
  redirect(ok ? "/login?aviso=verificado" : "/verificar-email?invalido=1");
}
