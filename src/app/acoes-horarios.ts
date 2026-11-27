"use server";

import { ValidationError } from "@/lib/erros";
import { NOMES_DIAS } from "@/lib/horario-funcionamento";
import * as funcionamento from "@/lib/services/funcionamento";
import { exigirUsuario } from "@/lib/sessao";

import type { Funcionamento } from "@/lib/horario-funcionamento";

/** `valores`: o que foi enviado, para o formulário não perder o que a pessoa digitou quando dá erro. */
export type EstadoHorarios = { ok?: boolean; erros?: string[]; valores?: Funcionamento };

export async function salvarHorarios(_anterior: EstadoHorarios, form: FormData): Promise<EstadoHorarios> {
  try {
    await exigirUsuario("horarios", "escrever");
  } catch {
    return { erros: ["Você não tem permissão para alterar os horários."] };
  }

  const dias = NOMES_DIAS.map((_, d) => ({
    diaSemana: d,
    aberto: form.get(`aberto_${d}`) === "on",
    abre: String(form.get(`abre_${d}`) ?? ""),
    fecha: String(form.get(`fecha_${d}`) ?? ""),
  }));

  const numero = (nome: string) => Number(form.get(nome));
  const valores: Funcionamento = {
    dias: dias.map((d) => ({ ...d, abre: d.abre || "09:00", fecha: d.fecha || "19:00" })),
    intervaloMin: numero("intervaloMin"),
    antecedenciaMin: numero("antecedenciaMin"),
    diasAFrente: numero("diasAFrente"),
    maxAgendamentosFuturos: numero("maxAgendamentosFuturos"),
  };

  // Erros por dia com o nome do dia (a validação genérica só diria "dias").
  const erros = dias
    .filter((d) => d.aberto && !(d.abre && d.fecha && d.abre < d.fecha))
    .map((d) => `${NOMES_DIAS[d.diaSemana][0].toUpperCase()}${NOMES_DIAS[d.diaSemana].slice(1)}: o horário de fechar precisa ser depois do de abrir.`);
  if (erros.length) return { erros, valores };

  try {
    return { ok: true, valores: await funcionamento.salvar(valores) };
  } catch (e) {
    if (e instanceof ValidationError) return { erros: Object.values(e.campos ?? {}).flat(), valores };
    throw e;
  }
}
