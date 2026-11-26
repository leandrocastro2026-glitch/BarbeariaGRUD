import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export type ErrosDeCampo = Record<string, string[]>;

export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly campos?: ErrosDeCampo,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, campos?: ErrosDeCampo) {
    super(message, 400, campos);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Registro não encontrado.") {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Faça login para continuar.") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Você não tem permissão para isso.") {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, campos?: ErrosDeCampo) {
    super(message, 409, campos);
  }
}

export function deZod(erro: ZodError): ValidationError {
  const campos: ErrosDeCampo = {};
  for (const issue of erro.issues) {
    const campo = String(issue.path[0] ?? "_");
    (campos[campo] ??= []).push(issue.message);
  }
  return new ValidationError("Dados inválidos.", campos);
}

/** Converte qualquer erro conhecido em AppError; erros desconhecidos são relançados. */
export function normalizarErro(erro: unknown): AppError {
  if (erro instanceof AppError) return erro;
  if (erro instanceof ZodError) return deZod(erro);
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    if (erro.code === "P2025") return new NotFoundError();
    if (erro.code === "P2002") {
      const alvo = erro.meta?.target;
      const campo = Array.isArray(alvo) ? String(alvo[0]) : typeof alvo === "string" ? alvo : "_";
      return new ConflictError("Já existe um registro com esse valor.", {
        [campo]: ["Já está em uso."],
      });
    }
    if (erro.code === "P2003") {
      return new ConflictError("Registro está em uso por outros dados.");
    }
  }
  throw erro;
}
