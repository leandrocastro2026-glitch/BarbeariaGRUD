import type { NextRequest } from "next/server";
import { lerJson, responder } from "@/lib/api";
import * as agendamentos from "@/lib/services/agendamentos";
import { exigirUsuario } from "@/lib/sessao";

export async function GET(req: NextRequest) {
  return responder(async () => {
    await exigirUsuario("agendamentos");
    const p = req.nextUrl.searchParams;
    return agendamentos.listar({ barbeiroId: p.get("barbeiroId"), data: p.get("data") });
  });
}

export async function POST(req: Request) {
  return responder(async () => {
    await exigirUsuario("agendamentos", "escrever");
    return agendamentos.criar(await lerJson(req));
  }, 201);
}
