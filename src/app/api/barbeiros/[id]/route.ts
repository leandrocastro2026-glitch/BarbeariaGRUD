import { lerJson, responder } from "@/lib/api";
import * as barbeiros from "@/lib/services/barbeiros";
import { exigirUsuario } from "@/lib/sessao";

export async function GET(_req: Request, ctx: RouteContext<"/api/barbeiros/[id]">) {
  return responder(async () => {
    await exigirUsuario("barbeiros");
    return barbeiros.buscar((await ctx.params).id);
  });
}

export async function PUT(req: Request, ctx: RouteContext<"/api/barbeiros/[id]">) {
  return responder(async () => {
    await exigirUsuario("barbeiros", "escrever");
    return barbeiros.atualizar((await ctx.params).id, await lerJson(req));
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/barbeiros/[id]">) {
  return responder(async () => {
    await exigirUsuario("barbeiros", "escrever");
    return barbeiros.excluir((await ctx.params).id);
  }, 204);
}
