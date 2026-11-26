import { lerJson, responder } from "@/lib/api";
import * as servicos from "@/lib/services/servicos";
import { exigirUsuario } from "@/lib/sessao";

export async function GET() {
  return responder(async () => {
    await exigirUsuario("servicos");
    return servicos.listar();
  });
}

export async function POST(req: Request) {
  return responder(async () => {
    await exigirUsuario("servicos", "escrever");
    return servicos.criar(await lerJson(req));
  }, 201);
}
