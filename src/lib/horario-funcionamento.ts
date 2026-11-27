/**
 * Regras da agenda online (o que o CLIENTE pode marcar pelo site).
 * O administrador ajusta tudo na tela "Horários"; isto aqui é só o PADRÃO usado enquanto
 * nada foi salvo. A equipe continua podendo agendar em qualquer horário pela tela de Agendamentos.
 */

export type HorarioDoDia = { diaSemana: number; aberto: boolean; abre: string; fecha: string };

export type Funcionamento = {
  /** Sempre 7 itens, de domingo (0) a sábado (6). */
  dias: HorarioDoDia[];
  /** De quanto em quanto tempo começa um horário na lista. */
  intervaloMin: number;
  /** Antecedência mínima para marcar (não dá para marcar "daqui a 5 minutos"). */
  antecedenciaMin: number;
  /** Até quantos dias à frente o cliente pode marcar. */
  diasAFrente: number;
  /** Quantos horários futuros cada cliente pode ter ao mesmo tempo (evita reservar a agenda toda). */
  maxAgendamentosFuturos: number;
};

/** Padrão: segunda a sábado, das 9h às 19h, horários a cada 30 minutos. */
export const PADRAO: Funcionamento = {
  dias: Array.from({ length: 7 }, (_, d) => ({ diaSemana: d, aberto: d !== 0, abre: "09:00", fecha: "19:00" })),
  intervaloMin: 30,
  antecedenciaMin: 30,
  diasAFrente: 30,
  maxAgendamentosFuturos: 3,
};

export const NOMES_DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Dia da semana de uma data "AAAA-MM-DD" no horário de Brasília. */
export function diaDaSemana(dia: string): number {
  return new Date(`${dia}T12:00:00-03:00`).getUTCDay();
}

export const paraMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Resumo para o cliente, juntando dias seguidos com o mesmo horário.
 * Ex.: "Seg a Sex: 09:00–19:00 · Sáb: 09:00–14:00". Começa na segunda.
 */
export function resumoFuncionamento(f: Funcionamento): string {
  const ordem = [1, 2, 3, 4, 5, 6, 0].map((d) => f.dias[d]).filter((d) => d.aberto);
  if (!ordem.length) return "A agenda online está fechada no momento.";
  const grupos: { de: number; ate: number; faixa: string }[] = [];
  for (const d of ordem) {
    const faixa = `${d.abre}–${d.fecha}`;
    const ultimo = grupos.at(-1);
    const seguinte = ultimo && (ultimo.ate + 1) % 7 === d.diaSemana;
    if (ultimo && seguinte && ultimo.faixa === faixa) ultimo.ate = d.diaSemana;
    else grupos.push({ de: d.diaSemana, ate: d.diaSemana, faixa });
  }
  return grupos
    .map((g) => `${g.de === g.ate ? CURTOS[g.de] : `${CURTOS[g.de]} a ${CURTOS[g.ate]}`}: ${g.faixa}`)
    .join(" · ");
}
