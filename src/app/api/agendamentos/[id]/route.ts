import { lerJson, responder } from "@/lib/api";
import * as agendamentos from "@/lib/services/agendamentos";
import { exigirUsuario } from "@/lib/sessao";

export async function GET(_req: Request, ctx: RouteContext<"/api/agendamentos/[id]">) {
  return responder(async () => {
    await exigirUsuario("agendamentos");
    return agendamentos.buscar((await ctx.params).id);
  });
}

export async function PUT(req: Request, ctx: RouteContext<"/api/agendamentos/[id]">) {
  return responder(async () => {
    await exigirUsuario("agendamentos", "escrever");
    return agendamentos.atualizar((await ctx.params).id, await lerJson(req));
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/agendamentos/[id]">) {
  return responder(async () => {
    await exigirUsuario("agendamentos", "escrever");
    return agendamentos.excluir((await ctx.params).id);
  }, 204);
}

/** Altera apenas o status: { "status": "AGENDADO" | "CONCLUIDO" | "CANCELADO" } */
export async function PATCH(req: Request, ctx: RouteContext<"/api/agendamentos/[id]">) {
  return responder(async () => {
    await exigirUsuario("agendamentos", "escrever");
    return agendamentos.alterarStatus((await ctx.params).id, await lerJson(req));
  });
}
