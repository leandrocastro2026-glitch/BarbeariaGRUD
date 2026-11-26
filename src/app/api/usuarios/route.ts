import { lerJson, responder } from "@/lib/api";
import * as usuarios from "@/lib/services/usuarios";
import { exigirUsuario } from "@/lib/sessao";

export async function GET() {
  return responder(async () => {
    await exigirUsuario("usuarios");
    return usuarios.listar();
  });
}

export async function POST(req: Request) {
  return responder(async () => {
    await exigirUsuario("usuarios", "escrever");
    return usuarios.criar(await lerJson(req));
  }, 201);
}
