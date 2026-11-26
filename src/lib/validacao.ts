import { z } from "zod";
import { parseDataHoraLocal } from "./datas";
import { PERFIS } from "./permissoes";

export const STATUS = ["AGENDADO", "CONCLUIDO", "CANCELADO"] as const;
export type Status = (typeof STATUS)[number];

export const STATUS_ROTULO: Record<Status, string> = {
  AGENDADO: "Agendado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const texto = (campo: string, max = 100) =>
  z
    .string({ error: `${campo} é obrigatório.` })
    .trim()
    .min(1, { error: `${campo} é obrigatório.` })
    .max(max, { error: `${campo} deve ter no máximo ${max} caracteres.` });

const textoOpcional = (max: number) =>
  z.preprocess(vazioParaNull, z.string().trim().max(max).nullable().default(null));

const telefone = z
  .string({ error: "Telefone é obrigatório." })
  .trim()
  .min(1, { error: "Telefone é obrigatório." })
  .regex(/^[\d\s()+-]*$/, { error: "Use apenas números, espaços, parênteses, + e -." })
  .refine((v) => v.replace(/\D/g, "").length >= 8, { error: "Telefone muito curto." })
  .refine((v) => v.replace(/\D/g, "").length <= 13, { error: "Telefone muito longo." });

const id = (campo: string) =>
  z.coerce
    .number({ error: `Selecione ${campo}.` })
    .int({ error: `Selecione ${campo}.` })
    .positive({ error: `Selecione ${campo}.` });

const booleano = z.preprocess(
  (v) => (v === "true" || v === "on" ? true : v === "false" ? false : v),
  z.boolean(),
);

export const clienteSchema = z.object({
  nome: texto("Nome"),
  telefone,
  email: z.preprocess(
    vazioParaNull,
    z.email({ error: "E-mail inválido." }).toLowerCase().nullable().default(null),
  ),
});

export const barbeiroSchema = z.object({
  nome: texto("Nome"),
  telefone,
  especialidade: textoOpcional(100),
  ativo: booleano.default(true),
});

export const servicoSchema = z
  .object({
    nome: texto("Nome"),
    preco: z.preprocess(
      (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v.replace(",", "."))) : v),
      z
        .number({ error: "Informe um preço válido." })
        .min(0, { error: "O preço não pode ser negativo." })
        .max(100_000, { error: "Preço muito alto." }),
    ),
    duracaoMin: z.coerce
      .number({ error: "Informe a duração." })
      .int({ error: "A duração deve ser em minutos inteiros." })
      .min(5, { error: "Duração mínima de 5 minutos." })
      .max(480, { error: "Duração máxima de 8 horas." }),
  })
  .transform(({ preco, ...resto }) => ({ ...resto, precoCentavos: Math.round(preco * 100) }));

export const statusSchema = z.object({
  status: z.enum(STATUS, { error: "Status inválido." }),
});

export const agendamentoSchema = z.object({
  clienteId: id("um cliente"),
  barbeiroId: id("um barbeiro"),
  servicoId: id("um serviço"),
  inicio: z
    .string({ error: "Informe data e hora." })
    .transform((v, ctx) => {
      const d = parseDataHoraLocal(v);
      if (!d) {
        ctx.addIssue({ code: "custom", message: "Data e hora inválidas." });
        return z.NEVER;
      }
      return d;
    }),
  status: z.enum(STATUS, { error: "Status inválido." }).default("AGENDADO"),
  observacao: textoOpcional(500),
});

export const filtroAgendamentosSchema = z.object({
  barbeiroId: z.preprocess(vazioParaNull, id("um barbeiro").nullable().default(null)),
  data: z.preprocess(
    vazioParaNull,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Data inválida (use AAAA-MM-DD)." })
      .nullable()
      .default(null),
  ),
});

export type ClienteInput = z.input<typeof clienteSchema>;
export type BarbeiroInput = z.input<typeof barbeiroSchema>;
export type ServicoInput = z.input<typeof servicoSchema>;
export type AgendamentoInput = z.input<typeof agendamentoSchema>;
export type FiltroAgendamentos = z.input<typeof filtroAgendamentosSchema>;

// ---------- Usuários ----------

const senhaNova = z
  .string()
  .min(8, { error: "A senha deve ter pelo menos 8 caracteres." })
  .max(200, { error: "Senha muito longa." });

const camposUsuario = {
  nome: texto("Nome"),
  email: z.email({ error: "E-mail inválido." }).trim().toLowerCase(),
  perfil: z.enum(PERFIS, { error: "Perfil inválido." }),
};

export const usuarioCriarSchema = z.object({ ...camposUsuario, senha: senhaNova });

/** Na edição, senha vazia significa "manter a atual". */
export const usuarioAtualizarSchema = z.object({
  ...camposUsuario,
  ativo: booleano.default(true),
  senha: z.preprocess(vazioParaNull, senhaNova.nullable().default(null)),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1).max(200),
  senha: z.string().min(1).max(200),
});
