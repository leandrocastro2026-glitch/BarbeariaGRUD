/**
 * Área do cliente: completar cadastro, ver horários livres, marcar e cancelar.
 * Toda função recebe o id do cliente já tirado da sessão (nunca do formulário),
 * então um cliente não consegue agir em nome de outro.
 */
import { indiceEmail } from "../cripto";
import { prisma } from "../prisma";
import { intervaloDoDia, paraInputData } from "../datas";
import { ConflictError, NotFoundError, ValidationError } from "../erros";
import { diaDaSemana, FUNCIONAMENTO } from "../horario-funcionamento";
import { completarCadastroSchema, escolhaHorarioSchema } from "../validacao";
import * as agendamentos from "./agendamentos";
import { executar, validar } from "./_base";

/** O cliente já tem o máximo de horários futuros permitido. */
export class LimiteDeAgendamentos extends ConflictError {}

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Liga a conta (perfil CLIENTE) a um cadastro de cliente. Se a barbearia já tinha um cliente com
 * o mesmo e-mail (a conta já provou ser dona dele), reaproveita esse cadastro e o histórico.
 */
export const completarCadastro = (usuarioId: number, entrada: unknown) =>
  executar(async () => {
    const { nome, telefone } = validar(completarCadastroSchema, entrada);
    const u = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    if (u.perfil !== "CLIENTE" || !u.emailVerificadoEm) throw new ValidationError("Conta não pode ter cadastro de cliente.");
    if (u.clienteId) return u.clienteId;

    return prisma.$transaction(async (tx) => {
      const existente = await tx.cliente.findUnique({ where: { emailHash: indiceEmail(u.email) }, include: { usuario: true } });
      const cliente =
        existente && !existente.usuario
          ? await tx.cliente.update({ where: { id: existente.id }, data: { telefone } })
          : await tx.cliente.create({ data: { nome, telefone, email: existente ? null : u.email } });
      await tx.usuario.update({ where: { id: usuarioId }, data: { clienteId: cliente.id, nome } });
      return cliente.id;
    });
  });

/** Dados para a tela de agendar: serviços e barbeiros ativos. */
export async function opcoes() {
  const [servicos, barbeiros] = await Promise.all([
    prisma.servico.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, precoCentavos: true, duracaoMin: true } }),
    prisma.barbeiro.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  return { servicos, barbeiros };
}

/** Datas que o cliente pode escolher (hoje até `diasAFrente`), no formato AAAA-MM-DD. */
export function limitesDeData(agora = new Date()) {
  return {
    min: paraInputData(agora),
    max: paraInputData(new Date(agora.getTime() + FUNCIONAMENTO.diasAFrente * 24 * 60 * 60_000)),
  };
}

/**
 * Horários em que o barbeiro está livre para o serviço no dia escolhido, dentro do
 * funcionamento e com a antecedência mínima. Não revela quem ocupa os outros horários.
 */
export async function horariosLivres(entrada: unknown, agora = new Date()): Promise<Date[]> {
  const { barbeiroId, servicoId, data } = validar(escolhaHorarioSchema, entrada);
  const { min, max } = limitesDeData(agora);
  if (data < min || data > max) return [];
  if (!(FUNCIONAMENTO.dias as readonly number[]).includes(diaDaSemana(data))) return [];

  const [servico, barbeiro] = await Promise.all([
    prisma.servico.findUnique({ where: { id: servicoId } }),
    prisma.barbeiro.findUnique({ where: { id: barbeiroId } }),
  ]);
  if (!servico || !barbeiro?.ativo) return [];

  const dia = intervaloDoDia(data)!;
  const ocupados = await prisma.agendamento.findMany({
    where: { barbeiroId, status: { not: "CANCELADO" }, inicio: { lt: dia.ate }, fim: { gt: dia.de } },
    select: { inicio: true, fim: true },
  });

  const cedo = agora.getTime() + FUNCIONAMENTO.antecedenciaMin * 60_000;
  const livres: Date[] = [];
  for (let m = minutos(FUNCIONAMENTO.abre); m + servico.duracaoMin <= minutos(FUNCIONAMENTO.fecha); m += FUNCIONAMENTO.intervaloMin) {
    const inicio = new Date(dia.de.getTime() + m * 60_000);
    const fim = new Date(inicio.getTime() + servico.duracaoMin * 60_000);
    if (inicio.getTime() < cedo) continue;
    if (ocupados.some((o) => o.inicio < fim && o.fim > inicio)) continue;
    livres.push(inicio);
  }
  return livres;
}

/** Marca um horário para o próprio cliente. Só aceita horários que `horariosLivres` oferece. */
export const agendar = (clienteId: number, entrada: unknown, agora = new Date()) =>
  executar(async () => {
    const { barbeiroId, servicoId, data, inicio } = validar(escolhaHorarioSchema, entrada);
    const instante = inicio ? new Date(inicio) : null;
    const livres = await horariosLivres({ barbeiroId, servicoId, data }, agora);
    if (!instante || !livres.some((h) => h.getTime() === instante.getTime())) {
      throw new ConflictError("Esse horário não está mais disponível. Escolha outro.");
    }

    const futuros = await prisma.agendamento.count({
      where: { clienteId, status: "AGENDADO", inicio: { gt: agora } },
    });
    if (futuros >= FUNCIONAMENTO.maxAgendamentosFuturos) {
      throw new LimiteDeAgendamentos(
        `Você já tem ${futuros} horários marcados. Cancele um ou aguarde o atendimento para marcar outro.`,
      );
    }

    try {
      return await agendamentos.criar({ clienteId, barbeiroId, servicoId, inicio: instante.toISOString(), status: "AGENDADO" });
    } catch (e) {
      // A mensagem padrão de conflito cita o nome de outro cliente: não pode chegar aqui.
      if (e instanceof ConflictError) throw new ConflictError("Esse horário acabou de ser ocupado. Escolha outro.");
      throw e;
    }
  });

/** Horários do próprio cliente: próximos primeiro, depois o histórico recente. */
export async function meusAgendamentos(clienteId: number) {
  return prisma.agendamento.findMany({
    where: { clienteId },
    orderBy: { inicio: "desc" },
    take: 50,
    select: {
      id: true,
      inicio: true,
      fim: true,
      status: true,
      barbeiro: { select: { nome: true } },
      servico: { select: { nome: true, precoCentavos: true } },
    },
  });
}

/** Cancela um horário do próprio cliente que ainda não começou. */
export async function cancelar(clienteId: number, agendamentoId: unknown, agora = new Date()) {
  const id = Number(agendamentoId);
  if (!Number.isInteger(id) || id <= 0) throw new NotFoundError("Agendamento não encontrado.");
  const r = await prisma.agendamento.updateMany({
    where: { id, clienteId, status: "AGENDADO", inicio: { gt: agora } },
    data: { status: "CANCELADO" },
  });
  if (r.count === 0) throw new NotFoundError("Agendamento não encontrado ou não pode mais ser cancelado.");
}
