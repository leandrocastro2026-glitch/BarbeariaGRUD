import { prisma } from "../prisma";
import { ValidationError } from "../erros";

export const PERIODOS = [7, 30, 90] as const;
export type Periodo = (typeof PERIODOS)[number];

const DIA = 86_400_000;
const DIAS_PARA_SUMIDO = 30;

export type ResumoDashboard = Awaited<ReturnType<typeof resumoDashboard>>;

/**
 * Métricas do período [agora - dias, agora] comparadas com o período anterior de mesmo tamanho.
 * Receita usa o preço atual do serviço (o preço não é gravado no agendamento).
 */
export async function resumoDashboard({ dias, agora = new Date() }: { dias: Periodo; agora?: Date }) {
  if (!PERIODOS.includes(dias)) throw new ValidationError("Período inválido.", { dias: ["Use 7, 30 ou 90."] });

  const inicio = new Date(agora.getTime() - dias * DIA);
  const inicioAnterior = new Date(inicio.getTime() - dias * DIA);
  const noPeriodo = { gte: inicio, lte: agora };
  const noAnterior = { gte: inicioAnterior, lt: inicio };

  const [concluidosPorServico, servicos, totalAtual, canceladosAtual, totalAnterior, canceladosAnterior, atendidos] =
    await Promise.all([
      prisma.agendamento.groupBy({
        by: ["servicoId"],
        where: { status: "CONCLUIDO", inicio: noPeriodo },
        _count: { _all: true },
      }),
      prisma.servico.findMany({ select: { id: true, nome: true, precoCentavos: true } }),
      prisma.agendamento.count({ where: { inicio: noPeriodo } }),
      prisma.agendamento.count({ where: { inicio: noPeriodo, status: "CANCELADO" } }),
      prisma.agendamento.count({ where: { inicio: noAnterior } }),
      prisma.agendamento.count({ where: { inicio: noAnterior, status: "CANCELADO" } }),
      prisma.agendamento.findMany({
        where: { status: "CONCLUIDO", inicio: noPeriodo },
        distinct: ["clienteId"],
        select: { clienteId: true },
      }),
    ]);

  const precoPorServico = new Map(servicos.map((s) => [s.id, s]));
  const ranking = concluidosPorServico
    .map((g) => {
      const s = precoPorServico.get(g.servicoId)!;
      return {
        servicoId: g.servicoId,
        nome: s.nome,
        quantidade: g._count._all,
        receitaCentavos: g._count._all * s.precoCentavos,
      };
    })
    .sort((a, b) => b.quantidade - a.quantidade || b.receitaCentavos - a.receitaCentavos || a.nome.localeCompare(b.nome));

  // Novo = primeira visita concluída da vida aconteceu dentro do período.
  const idsAtendidos = atendidos.map((a) => a.clienteId);
  const primeiras = idsAtendidos.length
    ? await prisma.agendamento.groupBy({
        by: ["clienteId"],
        where: { status: "CONCLUIDO", clienteId: { in: idsAtendidos } },
        _min: { inicio: true },
      })
    : [];
  const novos = primeiras.filter((p) => p._min.inicio! >= inicio).length;

  // Sumidos: última visita concluída há mais de 30 dias e nada marcado daqui pra frente.
  const limiteSumido = new Date(agora.getTime() - DIAS_PARA_SUMIDO * DIA);
  const ultimas = await prisma.agendamento.groupBy({
    by: ["clienteId"],
    where: { status: "CONCLUIDO" },
    _max: { inicio: true },
    having: { inicio: { _max: { lt: limiteSumido } } },
  });
  const comFuturo = new Set(
    (
      await prisma.agendamento.findMany({
        where: { status: "AGENDADO", inicio: { gte: agora }, clienteId: { in: ultimas.map((u) => u.clienteId) } },
        distinct: ["clienteId"],
        select: { clienteId: true },
      })
    ).map((a) => a.clienteId),
  );
  const candidatos = ultimas.filter((u) => !comFuturo.has(u.clienteId));
  const clientes = await prisma.cliente.findMany({
    where: { id: { in: candidatos.map((c) => c.clienteId) } },
    select: { id: true, nome: true, telefone: true },
  });
  const porId = new Map(clientes.map((c) => [c.id, c]));
  const sumidos = candidatos
    .map((c) => {
      const ultimaVisita = c._max.inicio!;
      return { ...porId.get(c.clienteId)!, ultimaVisita, diasSemVir: Math.floor((agora.getTime() - ultimaVisita.getTime()) / DIA) };
    })
    .sort((a, b) => a.diasSemVir - b.diasSemVir)
    .slice(0, 20);

  const taxa = (cancelados: number, total: number) => (total ? cancelados / total : 0);

  return {
    dias,
    inicio,
    receitaCentavos: ranking.reduce((s, r) => s + r.receitaCentavos, 0),
    servicos: ranking,
    cancelamentos: {
      total: totalAtual,
      cancelados: canceladosAtual,
      taxa: taxa(canceladosAtual, totalAtual),
      taxaAnterior: taxa(canceladosAnterior, totalAnterior),
    },
    clientes: { atendidos: idsAtendidos.length, novos, recorrentes: idsAtendidos.length - novos },
    sumidos,
  };
}
