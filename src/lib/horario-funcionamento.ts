/**
 * Regras da agenda online (o que o CLIENTE pode marcar pelo site).
 * A equipe continua podendo agendar em qualquer horário pela tela de Agendamentos.
 * Ajuste aqui os horários da barbearia.
 */
export const FUNCIONAMENTO = {
  /** 0 = domingo, 1 = segunda, ..., 6 = sábado. */
  dias: [1, 2, 3, 4, 5, 6],
  abre: "09:00",
  fecha: "19:00",
  /** De quanto em quanto tempo começa um horário na lista. */
  intervaloMin: 30,
  /** Antecedência mínima para marcar (não dá para marcar "daqui a 5 minutos"). */
  antecedenciaMin: 30,
  /** Até quantos dias à frente o cliente pode marcar. */
  diasAFrente: 30,
  /** Quantos horários futuros cada cliente pode ter ao mesmo tempo (evita reservar a agenda toda). */
  maxAgendamentosFuturos: 3,
} as const;

export const NOMES_DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Dia da semana de uma data "AAAA-MM-DD" no horário de Brasília. */
export function diaDaSemana(dia: string): number {
  return new Date(`${dia}T12:00:00-03:00`).getUTCDay();
}
