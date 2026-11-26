/**
 * Toda conversão de fuso fica aqui. O banco guarda UTC; a barbearia opera no
 * horário de Brasília (UTC-3, sem horário de verão desde 2019).
 */
export const FUSO = "America/Sao_Paulo";
const OFFSET = "-03:00";

/** "2026-12-01T14:30" (sem fuso, vindo de <input type="datetime-local">) → Date. */
export function parseDataHoraLocal(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(valor)) {
    const d = new Date(valor);
    // Aceita ISO completo com fuso explícito (ex.: chamadas diretas à API).
    return /[zZ]|[+-]\d{2}:\d{2}$/.test(valor) && !isNaN(d.getTime()) ? d : null;
  }
  const d = new Date(`${valor.length === 16 ? `${valor}:00` : valor}${OFFSET}`);
  return isNaN(d.getTime()) ? null : d;
}

/** "2026-12-01" → [início do dia, início do dia seguinte) no horário de Brasília. */
export function intervaloDoDia(dia: string): { de: Date; ate: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null;
  const de = new Date(`${dia}T00:00:00${OFFSET}`);
  if (isNaN(de.getTime())) return null;
  return { de, ate: new Date(de.getTime() + 24 * 60 * 60_000) };
}

function partes(d: Date) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)!.value;
  return { ano: get("year"), mes: get("month"), dia: get("day"), hora: get("hour"), min: get("minute") };
}

/** Date → "2026-12-01T14:30" para preencher <input type="datetime-local">. */
export function paraInputDataHora(d: Date): string {
  const { ano, mes, dia, hora, min } = partes(d);
  return `${ano}-${mes}-${dia}T${hora}:${min}`;
}

/** Date → "2026-12-01" no horário de Brasília. */
export function paraInputData(d: Date): string {
  const { ano, mes, dia } = partes(d);
  return `${ano}-${mes}-${dia}`;
}

export const formatarDataHora = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, dateStyle: "short", timeStyle: "short" }).format(d);

export const formatarHora = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, timeStyle: "short" }).format(d);

export const formatarDataLonga = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, dateStyle: "full" }).format(d);
