import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/erros";
import { prisma } from "@/lib/prisma";
import { PADRAO, resumoFuncionamento } from "@/lib/horario-funcionamento";
import * as funcionamento from "@/lib/services/funcionamento";
import * as portal from "@/lib/services/portal-cliente";

// 07/01/2030 é uma segunda-feira; "agora" fixo para os testes não dependerem do relógio.
const DIA = "2030-01-07";
const AGORA = new Date(`${DIA}T08:00:00-03:00`);
const hora = (hhmm: string, dia = DIA) => new Date(`${dia}T${hhmm}:00-03:00`);
const horas = (lista: Date[]) =>
  lista.map((d) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", timeStyle: "short" }).format(d));

let barbeiro: { id: number };
let corte: { id: number };
let combo: { id: number };
let eu: { id: number };
let outro: { id: number };

beforeEach(async () => {
  await prisma.horarioDia.deleteMany();
  await prisma.configAgenda.deleteMany();
  await prisma.agendamento.deleteMany();
  await prisma.tokenVerificacao.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.barbeiro.deleteMany();
  await prisma.servico.deleteMany();
  barbeiro = await prisma.barbeiro.create({ data: { nome: "Zé", telefone: "11999990000" } });
  corte = await prisma.servico.create({ data: { nome: "Corte", precoCentavos: 4000, duracaoMin: 30 } });
  combo = await prisma.servico.create({ data: { nome: "Corte + barba", precoCentavos: 7000, duracaoMin: 60 } });
  eu = await prisma.cliente.create({ data: { nome: "Eu", telefone: "11911110000" } });
  outro = await prisma.cliente.create({ data: { nome: "Fulano Secreto", telefone: "11922220000" } });
});

const ocupar = (clienteId: number, inicio: string, fim: string, status = "AGENDADO") =>
  prisma.agendamento.create({
    data: { clienteId, barbeiroId: barbeiro.id, servicoId: corte.id, inicio: hora(inicio), fim: hora(fim), status },
  });

const escolha = (extra: object = {}) => ({ servicoId: corte.id, barbeiroId: barbeiro.id, data: DIA, ...extra });

describe("horários livres", () => {
  it("lista de 30 em 30 minutos dentro do funcionamento (9h às 19h)", async () => {
    const livres = horas(await portal.horariosLivres(escolha(), AGORA));
    expect(livres[0]).toBe("09:00");
    expect(livres.at(-1)).toBe("18:30");
    expect(livres).toHaveLength(20);
  });

  it("serviço mais longo precisa caber antes de fechar", async () => {
    const livres = horas(await portal.horariosLivres(escolha({ servicoId: combo.id }), AGORA));
    expect(livres.at(-1)).toBe("18:00");
  });

  it("tira os horários que cruzam um agendamento (cancelado não conta)", async () => {
    await ocupar(outro.id, "10:00", "10:30");
    await ocupar(outro.id, "14:00", "14:30", "CANCELADO");
    const livres = horas(await portal.horariosLivres(escolha({ servicoId: combo.id }), AGORA));
    expect(livres).not.toContain("09:30");
    expect(livres).not.toContain("10:00");
    expect(livres).toContain("10:30");
    expect(livres).toContain("14:00");
  });

  it("respeita a antecedência mínima de 30 minutos", async () => {
    const livres = horas(await portal.horariosLivres(escolha(), hora("09:10")));
    expect(livres[0]).toBe("10:00");
  });

  it("não abre domingo, dia passado, muito longe ou barbeiro inativo", async () => {
    expect(await portal.horariosLivres(escolha({ data: "2030-01-06" }), AGORA)).toEqual([]);
    expect(await portal.horariosLivres(escolha({ data: "2030-01-05" }), AGORA)).toEqual([]);
    expect(await portal.horariosLivres(escolha({ data: "2030-03-01" }), AGORA)).toEqual([]);
    await prisma.barbeiro.update({ where: { id: barbeiro.id }, data: { ativo: false } });
    expect(await portal.horariosLivres(escolha(), AGORA)).toEqual([]);
  });

  it("rejeita parâmetros malformados", async () => {
    await expect(portal.horariosLivres(escolha({ data: "amanhã" }), AGORA)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("horário de funcionamento configurado pelo admin", () => {
  const config = (mudar: (f: typeof PADRAO) => void) => {
    const f = structuredClone(PADRAO);
    mudar(f);
    return funcionamento.salvar(f);
  };

  it("sem nada salvo, vale o padrão (seg a sáb, 9h às 19h)", async () => {
    expect(await funcionamento.obter()).toEqual(PADRAO);
    expect(resumoFuncionamento(PADRAO)).toBe("Seg a Sáb: 09:00–19:00");
  });

  it("usa o horário e o intervalo salvos para aquele dia", async () => {
    await config((f) => {
      f.dias[1] = { diaSemana: 1, aberto: true, abre: "13:00", fecha: "16:00" };
      f.intervaloMin = 60;
    });
    expect(horas(await portal.horariosLivres(escolha(), AGORA))).toEqual(["13:00", "14:00", "15:00"]);
  });

  it("dia marcado como fechado não tem horários; domingo pode abrir", async () => {
    await config((f) => {
      f.dias[1].aberto = false;
      f.dias[0] = { diaSemana: 0, aberto: true, abre: "10:00", fecha: "12:00" };
    });
    expect(await portal.horariosLivres(escolha(), AGORA)).toEqual([]);
    const domingo = horas(await portal.horariosLivres(escolha({ data: "2030-01-13" }), AGORA));
    expect(domingo).toEqual(["10:00", "10:30", "11:00", "11:30"]);
  });

  it("respeita o máximo de horários por cliente salvo", async () => {
    await config((f) => (f.maxAgendamentosFuturos = 1));
    await portal.agendar(eu.id, escolha({ inicio: hora("09:00").toISOString() }), AGORA);
    await expect(portal.agendar(eu.id, escolha({ inicio: hora("10:00").toISOString() }), AGORA)).rejects.toBeInstanceOf(
      portal.LimiteDeAgendamentos,
    );
  });

  it("recusa configuração inválida (fecha antes de abrir, intervalo absurdo)", async () => {
    await expect(config((f) => (f.dias[2] = { diaSemana: 2, aberto: true, abre: "18:00", fecha: "09:00" }))).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(config((f) => (f.intervaloMin = 1))).rejects.toBeInstanceOf(ValidationError);
    expect(await funcionamento.obter()).toEqual(PADRAO);
  });

  it("resumo junta dias seguidos com o mesmo horário", () => {
    const f = structuredClone(PADRAO);
    f.dias[6] = { diaSemana: 6, aberto: true, abre: "09:00", fecha: "14:00" };
    expect(resumoFuncionamento(f)).toBe("Seg a Sex: 09:00–19:00 · Sáb: 09:00–14:00");
  });
});

describe("agendar", () => {
  it("marca para o próprio cliente", async () => {
    const a = await portal.agendar(eu.id, escolha({ inicio: hora("11:00").toISOString() }), AGORA);
    expect(a).toMatchObject({ clienteId: eu.id, status: "AGENDADO" });
    expect(a.fim.getTime() - a.inicio.getTime()).toBe(30 * 60_000);
  });

  it("recusa horário fora da lista (ex.: 9h15 ou depois de fechar)", async () => {
    await expect(portal.agendar(eu.id, escolha({ inicio: hora("09:15").toISOString() }), AGORA)).rejects.toBeInstanceOf(ConflictError);
    await expect(portal.agendar(eu.id, escolha({ inicio: hora("19:00").toISOString() }), AGORA)).rejects.toBeInstanceOf(ConflictError);
    expect(await prisma.agendamento.count()).toBe(0);
  });

  it("horário ocupado dá erro sem revelar quem ocupa", async () => {
    await ocupar(outro.id, "10:00", "10:30");
    const erro = await portal.agendar(eu.id, escolha({ inicio: hora("10:00").toISOString() }), AGORA).catch((e) => e);
    expect(erro).toBeInstanceOf(ConflictError);
    expect(erro.message).not.toContain("Fulano");
    expect(JSON.stringify(erro.campos ?? {})).not.toContain("Fulano");
  });

  it(`limita a 3 horários futuros por cliente`, async () => {
    for (const h of ["09:00", "10:00", "11:00"]) {
      await portal.agendar(eu.id, escolha({ inicio: hora(h).toISOString() }), AGORA);
    }
    await expect(portal.agendar(eu.id, escolha({ inicio: hora("12:00").toISOString() }), AGORA)).rejects.toBeInstanceOf(
      portal.LimiteDeAgendamentos,
    );
  });
});

describe("meus agendamentos e cancelamento", () => {
  it("lista só os horários do próprio cliente", async () => {
    await ocupar(eu.id, "09:00", "09:30");
    await ocupar(outro.id, "10:00", "10:30");
    const meus = await portal.meusAgendamentos(eu.id);
    expect(meus).toHaveLength(1);
    expect(JSON.stringify(meus)).not.toContain("Fulano");
  });

  it("cancela o próprio horário futuro", async () => {
    const a = await ocupar(eu.id, "09:00", "09:30");
    await portal.cancelar(eu.id, a.id, AGORA);
    expect((await prisma.agendamento.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("CANCELADO");
  });

  it("não cancela horário de outro cliente nem horário que já passou", async () => {
    const deOutro = await ocupar(outro.id, "09:00", "09:30");
    await expect(portal.cancelar(eu.id, deOutro.id, AGORA)).rejects.toBeInstanceOf(NotFoundError);
    expect((await prisma.agendamento.findUniqueOrThrow({ where: { id: deOutro.id } })).status).toBe("AGENDADO");

    const meu = await ocupar(eu.id, "09:00", "09:30");
    await expect(portal.cancelar(eu.id, meu.id, hora("09:05"))).rejects.toBeInstanceOf(NotFoundError);
    await expect(portal.cancelar(eu.id, "abc", AGORA)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("completar cadastro", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sem confirmação de e-mail: cria cadastro novo e NÃO herda o cliente que tinha esse e-mail", async () => {
    vi.stubEnv("BREVO_API_KEY", "");
    await prisma.cliente.update({ where: { id: eu.id }, data: { email: "eu@x.com" } });
    const intruso = await prisma.usuario.create({ data: { nome: "Intruso", email: "eu@x.com", perfil: "CLIENTE" } });
    const clienteId = await portal.completarCadastro(intruso.id, { nome: "Intruso", telefone: "11988887777" });
    expect(clienteId).not.toBe(eu.id);
    expect((await prisma.cliente.findUniqueOrThrow({ where: { id: clienteId } })).email).toBeNull();
    expect(await portal.meusAgendamentos(clienteId)).toEqual([]);
  });

  const conta = (email: string, extra: object = {}) =>
    prisma.usuario.create({
      data: { nome: "Novo", email, perfil: "CLIENTE", emailVerificadoEm: new Date(), ...extra },
    });

  it("cria o cliente com o telefone e liga à conta", async () => {
    const u = await conta("novo@x.com");
    const clienteId = await portal.completarCadastro(u.id, { nome: "Novo Cliente", telefone: "(11) 93333-0000" });
    expect(await prisma.cliente.findUniqueOrThrow({ where: { id: clienteId } })).toMatchObject({
      nome: "Novo Cliente",
      email: "novo@x.com",
    });
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: u.id } })).clienteId).toBe(clienteId);
    // Chamar de novo não cria outro.
    expect(await portal.completarCadastro(u.id, { nome: "X", telefone: "11944440000" })).toBe(clienteId);
  });

  it("reaproveita o cliente que a barbearia já tinha com o mesmo e-mail", async () => {
    await prisma.cliente.update({ where: { id: eu.id }, data: { email: "eu@x.com" } });
    const u = await conta("eu@x.com");
    expect(await portal.completarCadastro(u.id, { nome: "Eu", telefone: "11955550000" })).toBe(eu.id);
  });

  it("recusa telefone inválido, conta sem e-mail confirmado (com confirmação ativa) e conta da equipe", async () => {
    vi.stubEnv("BREVO_API_KEY", "teste");
    const u = await conta("a@x.com");
    await expect(portal.completarCadastro(u.id, { nome: "A", telefone: "abc" })).rejects.toBeInstanceOf(ValidationError);
    const naoVerificada = await conta("b@x.com", { emailVerificadoEm: null });
    await expect(portal.completarCadastro(naoVerificada.id, { nome: "B", telefone: "11966660000" })).rejects.toBeInstanceOf(
      ValidationError,
    );
    const recepcao = await conta("c@x.com", { perfil: "RECEPCAO" });
    await expect(portal.completarCadastro(recepcao.id, { nome: "C", telefone: "11977770000" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
