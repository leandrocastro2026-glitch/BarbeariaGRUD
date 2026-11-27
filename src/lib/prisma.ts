import { Prisma, PrismaClient } from "@prisma/client";
import type { ITXClientDenyList } from "@prisma/client/runtime/library";
import { cifrar, decifrar, estaCifrado, indiceEmail } from "./cripto";

/**
 * Campos pessoais gravados CIFRADOS no banco. O resto do sistema lê e grava texto normal:
 * esta camada cifra na escrita e decifra na leitura (inclusive em `include`/`select` aninhados).
 */
export const CAMPOS_CIFRADOS: Record<string, readonly string[]> = {
  Cliente: ["nome", "telefone", "email"],
  Barbeiro: ["telefone"],
  Usuario: ["nome", "email"],
  Agendamento: ["observacao"],
};

/** Campos cujo índice (HMAC) é gravado junto, para busca exata e unicidade. */
const INDICES: Record<string, Record<string, string>> = {
  Cliente: { email: "emailHash" },
  Usuario: { email: "emailHash" },
};

const ESCRITAS = new Set(["create", "update", "upsert", "createMany", "updateMany", "createManyAndReturn", "updateManyAndReturn"]);

function cifrarDados(model: string, dados: unknown): unknown {
  if (Array.isArray(dados)) return dados.map((d) => cifrarDados(model, d));
  if (!dados || typeof dados !== "object") return dados;
  const saida: Record<string, unknown> = { ...(dados as Record<string, unknown>) };
  for (const campo of CAMPOS_CIFRADOS[model] ?? []) {
    if (!(campo in saida)) continue;
    let v = saida[campo];
    if (v && typeof v === "object" && "set" in v) v = (v as { set: unknown }).set;
    const indice = INDICES[model]?.[campo];
    if (indice) saida[indice] = typeof v === "string" ? indiceEmail(v) : null;
    saida[campo] = typeof v === "string" ? cifrar(v) : v;
  }
  return saida;
}

/** Chaves de filtro do próprio modelo (inclui AND/OR/NOT), sem entrar em relações. */
function chavesDoFiltro(filtro: unknown): string[] {
  if (!filtro || typeof filtro !== "object") return [];
  if (Array.isArray(filtro)) return filtro.flatMap(chavesDoFiltro);
  return Object.entries(filtro).flatMap(([k, v]) => (["AND", "OR", "NOT"].includes(k) ? chavesDoFiltro(v) : [k]));
}

/** Filtrar/ordenar por campo cifrado não funciona no banco: falha alto em vez de dar resultado errado. */
function proibirCampoCifrado(model: string, operacao: string, args: Record<string, unknown>) {
  const campos = CAMPOS_CIFRADOS[model];
  if (!campos) return;
  const usados = [
    ...chavesDoFiltro(args.where),
    ...chavesDoFiltro(args.orderBy),
    ...(Array.isArray(args.distinct) ? args.distinct : []),
    ...(Array.isArray(args.by) ? args.by : []),
  ];
  const proibido = usados.find((c) => campos.includes(c));
  if (proibido) {
    throw new Error(`${model}.${proibido} é cifrado: não dá para filtrar/ordenar por ele (${operacao}). Use o índice ou ordene em memória.`);
  }
}

/** Decifra qualquer valor "enc:v1:..." no resultado, em qualquer profundidade. */
function decifrarProfundo<T>(valor: T): T {
  if (estaCifrado(valor)) return decifrar(valor) as T;
  if (Array.isArray(valor)) return valor.map(decifrarProfundo) as T;
  if (valor && typeof valor === "object" && !(valor instanceof Date) && !(valor instanceof Prisma.Decimal)) {
    const saida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor)) saida[k] = decifrarProfundo(v);
    return saida as T;
  }
  return valor;
}

/** Client sem a camada de cifragem: só para o script que migra dados antigos. */
export const criarClienteBruto = () => new PrismaClient();

function criarCliente() {
  return new PrismaClient().$extends({
    name: "cifragem",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const a = { ...((args ?? {}) as Record<string, unknown>) };
          proibirCampoCifrado(model, operation, a);
          if (ESCRITAS.has(operation)) {
            if ("data" in a) a.data = cifrarDados(model, a.data);
            if (operation === "upsert") {
              a.create = cifrarDados(model, a.create);
              a.update = cifrarDados(model, a.update);
            }
          }
          return decifrarProfundo(await query(a as typeof args));
        },
      },
    },
  });
}

export type ClientePrisma = ReturnType<typeof criarCliente>;
/** Client recebido dentro de `prisma.$transaction(async (tx) => ...)`. */
export type TransacaoPrisma = Omit<ClientePrisma, ITXClientDenyList>;

// Reaproveita o client entre hot reloads do `next dev`.
const globalForPrisma = globalThis as unknown as { prisma?: ClientePrisma };

export const prisma = globalForPrisma.prisma ?? criarCliente();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
