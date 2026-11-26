import { lerJson, responder } from "@/lib/api";
import * as usuarios from "@/lib/services/usuarios";
import { exigirUsuario } from "@/lib/sessao";

export async function GET(_req: Request, ctx: RouteContext<"/api/usuarios/[id]">) {
  return responder(async () => {
    await exigirUsuario("usuarios");
    return usuarios.buscar((await ctx.params).id);
  });
}

export async function PUT(req: Request, ctx: RouteContext<"/api/usuarios/[id]">) {
  return responder(async () => {
    const eu = await exigirUsuario("usuarios", "escrever");
    return usuarios.atualizar((await ctx.params).id, await lerJson(req), eu.id);
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/usuarios/[id]">) {
  return responder(async () => {
    const eu = await exigirUsuario("usuarios", "escrever");
    return usuarios.excluir((await ctx.params).id, eu.id);
  }, 204);
}
