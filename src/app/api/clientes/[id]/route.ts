import { lerJson, responder } from "@/lib/api";
import * as clientes from "@/lib/services/clientes";
import { exigirUsuario } from "@/lib/sessao";

export async function GET(_req: Request, ctx: RouteContext<"/api/clientes/[id]">) {
  return responder(async () => {
    await exigirUsuario("clientes");
    return clientes.buscar((await ctx.params).id);
  });
}

export async function PUT(req: Request, ctx: RouteContext<"/api/clientes/[id]">) {
  return responder(async () => {
    await exigirUsuario("clientes", "escrever");
    return clientes.atualizar((await ctx.params).id, await lerJson(req));
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/clientes/[id]">) {
  return responder(async () => {
    await exigirUsuario("clientes", "escrever");
    return clientes.excluir((await ctx.params).id);
  }, 204);
}
