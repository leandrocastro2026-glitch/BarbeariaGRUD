import type { z } from "zod";
import { deZod, normalizarErro, NotFoundError } from "../erros";

/** Valida a entrada com Zod, lançando ValidationError com erros por campo. */
export function validar<S extends z.ZodType>(schema: S, entrada: unknown): z.output<S> {
  const r = schema.safeParse(entrada);
  if (!r.success) throw deZod(r.error);
  return r.data;
}

/** Executa uma operação convertendo erros do Prisma/Zod em AppError. */
export async function executar<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (erro) {
    throw normalizarErro(erro);
  }
}

/** Id fora do formato equivale a "não encontrado" para quem chama. */
export function idValido(id: unknown): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new NotFoundError();
  return n;
}

export async function existeOuFalha<T>(registro: Promise<T | null>, msg?: string): Promise<T> {
  const r = await registro;
  if (!r) throw new NotFoundError(msg);
  return r;
}
