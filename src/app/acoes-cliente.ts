"use server";

import { redirect } from "next/navigation";
import { ConflictError, NotFoundError, UnauthorizedError, ForbiddenError, ValidationError } from "@/lib/erros";
import * as portal from "@/lib/services/portal-cliente";
import { exigirCliente, exigirUsuario } from "@/lib/sessao";

export type EstadoCompletar = { erro?: string; campos?: Record<string, string>; valores?: { nome?: string; telefone?: string } };

/** Sessão ausente/perfil errado nas ações: manda para o login em vez de mostrar erro técnico. */
function semAcesso(e: unknown): never | void {
  if (e instanceof UnauthorizedError) redirect("/login");
  if (e instanceof ForbiddenError) redirect("/completar-cadastro");
}

export async function completarCadastro(_anterior: EstadoCompletar, form: FormData): Promise<EstadoCompletar> {
  const valores = { nome: String(form.get("nome") ?? ""), telefone: String(form.get("telefone") ?? "") };
  let u;
  try {
    u = await exigirUsuario("portal", "escrever");
  } catch {
    redirect("/login");
  }
  try {
    await portal.completarCadastro(u.id, valores);
  } catch (e) {
    if (e instanceof ValidationError) {
      const campos = Object.fromEntries(Object.entries(e.campos ?? {}).map(([k, v]) => [k, v[0] ?? ""]));
      return { valores, erro: e.campos ? "Confira os campos destacados." : e.message, campos };
    }
    throw e;
  }
  redirect("/agendar");
}

/** Os erros voltam para a tela como códigos fixos (nada digitado pelo usuário é refletido na página). */
export async function agendar(form: FormData) {
  const escolha = {
    servicoId: String(form.get("servicoId") ?? ""),
    barbeiroId: String(form.get("barbeiroId") ?? ""),
    data: String(form.get("data") ?? ""),
    inicio: String(form.get("inicio") ?? ""),
  };
  let erro = "";
  try {
    const c = await exigirCliente();
    await portal.agendar(c.clienteId, escolha);
  } catch (e) {
    semAcesso(e);
    if (e instanceof portal.LimiteDeAgendamentos) erro = "limite";
    else if (e instanceof ConflictError) erro = "ocupado";
    else if (e instanceof ValidationError) erro = "invalido";
    else throw e;
  }
  if (erro) {
    const volta = { servicoId: escolha.servicoId, barbeiroId: escolha.barbeiroId, data: escolha.data };
    redirect(`/agendar?${new URLSearchParams({ ...volta, erro })}`);
  }
  redirect("/meus-agendamentos?aviso=marcado");
}

export async function cancelar(form: FormData) {
  let ok = true;
  try {
    const c = await exigirCliente();
    await portal.cancelar(c.clienteId, form.get("id"));
  } catch (e) {
    semAcesso(e);
    if (!(e instanceof NotFoundError)) throw e;
    ok = false;
  }
  redirect(ok ? "/meus-agendamentos?aviso=cancelado" : "/meus-agendamentos?aviso=nao_cancelado");
}
