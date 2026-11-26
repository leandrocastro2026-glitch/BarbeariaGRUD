import type { NextRequest } from "next/server";
import { lerJson, responder } from "@/lib/api";
import * as barbeiros from "@/lib/services/barbeiros";
import { exigirUsuario } from "@/lib/sessao";

export async function GET(req: NextRequest) {
  return responder(async () => {
    await exigirUsuario("barbeiros");
    return barbeiros.listar({ apenasAtivos: req.nextUrl.searchParams.get("ativos") === "true" });
  });
}

export async function POST(req: Request) {
  return responder(async () => {
    await exigirUsuario("barbeiros", "escrever");
    return barbeiros.criar(await lerJson(req));
  }, 201);
}
