/** Lê e salva o horário de funcionamento da agenda online (tela "Horários"). */
import { PADRAO, type Funcionamento } from "../horario-funcionamento";
import { prisma } from "../prisma";
import { funcionamentoSchema } from "../validacao";
import { executar, validar } from "./_base";

/** Configuração atual; o que nunca foi salvo vem do padrão. */
export async function obter(): Promise<Funcionamento> {
  const [dias, config] = await Promise.all([
    prisma.horarioDia.findMany(),
    prisma.configAgenda.findUnique({ where: { id: 1 } }),
  ]);
  const porDia = new Map(dias.map((d) => [d.diaSemana, d]));
  return {
    dias: PADRAO.dias.map((p) => {
      const salvo = porDia.get(p.diaSemana);
      return salvo ? { diaSemana: salvo.diaSemana, aberto: salvo.aberto, abre: salvo.abre, fecha: salvo.fecha } : p;
    }),
    intervaloMin: config?.intervaloMin ?? PADRAO.intervaloMin,
    antecedenciaMin: config?.antecedenciaMin ?? PADRAO.antecedenciaMin,
    diasAFrente: config?.diasAFrente ?? PADRAO.diasAFrente,
    maxAgendamentosFuturos: config?.maxAgendamentosFuturos ?? PADRAO.maxAgendamentosFuturos,
  };
}

/** Salva tudo de uma vez (todos os dias + regras). Horários já marcados não são alterados. */
export const salvar = (entrada: unknown) =>
  executar(async () => {
    const { dias, ...regras } = validar(funcionamentoSchema, entrada);
    await prisma.$transaction([
      ...dias.map((d) =>
        prisma.horarioDia.upsert({ where: { diaSemana: d.diaSemana }, create: d, update: d }),
      ),
      prisma.configAgenda.upsert({ where: { id: 1 }, create: { id: 1, ...regras }, update: regras }),
    ]);
    return obter();
  });
