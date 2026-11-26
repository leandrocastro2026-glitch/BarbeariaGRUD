"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/auth";

export type EstadoLogin = { erro?: string; email?: string };

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
    if (e instanceof CredentialsSignin && e.code === "bloqueado") {
      return { email, erro: "Muitas tentativas sem sucesso. Aguarde 15 minutos e tente de novo." };
    }
    if (e.type === "CredentialsSignin") return { email, erro: "E-mail ou senha inválidos." };
    return { email, erro: "Não foi possível entrar agora. Tente novamente." };
  }
}

export async function sair() {
  await signOut({ redirectTo: "/login" });
}
