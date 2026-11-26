import { AppError, normalizarErro, ValidationError } from "./erros";

/** Envolve um handler de rota convertendo AppError em JSON { erro, campos } com o status correto. */
export async function responder<T>(fn: () => Promise<T>, statusSucesso = 200): Promise<Response> {
  try {
    const dados = await fn();
    if (statusSucesso === 204) return new Response(null, { status: 204 });
    return Response.json(dados, { status: statusSucesso });
  } catch (e) {
    let erro: AppError;
    try {
      erro = normalizarErro(e);
    } catch {
      console.error("[api] erro inesperado", e);
      return Response.json({ erro: "Erro interno do servidor." }, { status: 500 });
    }
    return Response.json({ erro: erro.message, campos: erro.campos }, { status: erro.status });
  }
}

export async function lerJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ValidationError("Corpo da requisição deve ser JSON válido.");
  }
}
