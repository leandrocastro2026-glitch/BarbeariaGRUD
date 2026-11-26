import { responder } from "@/lib/api";
import * as barbeiros from "@/lib/services/barbeiros";
import { exigirUsuario } from "@/lib/sessao";

export async function GET(_req: Request, ctx: RouteContext<"/api/barbeiros/[id]/agendamentos-futuros">) {
  return responder(async () => {
    await exigirUsuario("barbeiros");
    return { total: await barbeiros.contarAgendamentosFuturos((await ctx.params).id) };
  });
}
