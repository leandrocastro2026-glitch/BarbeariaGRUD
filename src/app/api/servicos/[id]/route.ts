import { lerJson, responder } from "@/lib/api";
import * as servicos from "@/lib/services/servicos";
import { exigirUsuario } from "@/lib/sessao";

export async function GET(_req: Request, ctx: RouteContext<"/api/servicos/[id]">) {
  return responder(async () => {
    await exigirUsuario("servicos");
    return servicos.buscar((await ctx.params).id);
  });
}

export async function PUT(req: Request, ctx: RouteContext<"/api/servicos/[id]">) {
  return responder(async () => {
    await exigirUsuario("servicos", "escrever");
    return servicos.atualizar((await ctx.params).id, await lerJson(req));
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/servicos/[id]">) {
  return responder(async () => {
    await exigirUsuario("servicos", "escrever");
    return servicos.excluir((await ctx.params).id);
  }, 204);
}
