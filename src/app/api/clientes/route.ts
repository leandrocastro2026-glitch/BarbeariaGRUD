import { lerJson, responder } from "@/lib/api";
import * as clientes from "@/lib/services/clientes";
import { exigirUsuario } from "@/lib/sessao";

export async function GET() {
  return responder(async () => {
    await exigirUsuario("clientes");
    return clientes.listar();
  });
}

export async function POST(req: Request) {
  return responder(async () => {
    await exigirUsuario("clientes", "escrever");
    return clientes.criar(await lerJson(req));
  }, 201);
}
