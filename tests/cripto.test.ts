import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cifrar, decifrar, estaCifrado, indiceEmail, mascararEmail } from "@/lib/cripto";
import { ConflictError } from "@/lib/erros";
import { criarClienteBruto, prisma } from "@/lib/prisma";
import * as clientes from "@/lib/services/clientes";
import * as usuarios from "@/lib/services/usuarios";

/** Lê o banco "cru", sem decifrar: é o que um invasor veria com uma cópia do arquivo .db. */
const bruto = criarClienteBruto();
afterAll(() => bruto.$disconnect());

describe("cifra AES-256-GCM", () => {
  it("cifra e decifra de volta, com acentos", () => {
    const c = cifrar("João da Silva · (11) 98888-1111");
    expect(estaCifrado(c)).toBe(true);
    expect(c).not.toContain("João");
    expect(decifrar(c)).toBe("João da Silva · (11) 98888-1111");
  });

  it("o mesmo texto vira cifras diferentes (IV aleatório)", () => {
    expect(cifrar("Ana")).not.toBe(cifrar("Ana"));
  });

  it("detecta adulteração do texto cifrado", () => {
    const c = cifrar("Ana Souza");
    const ultimo = c.at(-1) === "A" ? "B" : "A";
    expect(() => decifrar(c.slice(0, -1) + ultimo)).toThrow();
  });

  it("não cifra duas vezes", () => {
    const c = cifrar("x");
    expect(cifrar(c)).toBe(c);
  });

  it("índice de e-mail é estável, ignora maiúsculas e não contém o e-mail", () => {
    expect(indiceEmail(" Ana@Exemplo.com ")).toBe(indiceEmail("ana@exemplo.com"));
    expect(indiceEmail("ana@exemplo.com")).not.toContain("ana");
    expect(indiceEmail("ana@exemplo.com")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("mascara e-mail para logs", () => {
    expect(mascararEmail("ana.souza@exemplo.com")).toBe("an***@exemplo.com");
  });
});

describe("dados no banco", () => {
  beforeEach(async () => {
    await prisma.agendamento.deleteMany();
    await prisma.tokenVerificacao.deleteMany();
    await prisma.usuario.deleteMany();
    await prisma.cliente.deleteMany();
    await prisma.barbeiro.deleteMany();
    await prisma.servico.deleteMany();
  });

  it("cliente: nome, telefone e e-mail ficam ilegíveis no arquivo, mas o app lê normal", async () => {
    const c = await clientes.criar({ nome: "Ana Souza", telefone: "(11) 98888-1111", email: "ana@exemplo.com" });
    expect(c).toMatchObject({ nome: "Ana Souza", telefone: "(11) 98888-1111", email: "ana@exemplo.com" });

    const cru = await bruto.cliente.findUniqueOrThrow({ where: { id: c.id } });
    for (const v of [cru.nome, cru.telefone, cru.email]) expect(estaCifrado(v)).toBe(true);
    expect(JSON.stringify(cru)).not.toMatch(/Ana|98888|exemplo/);
    expect(cru.emailHash).toBe(indiceEmail("ana@exemplo.com"));
  });

  it("usuário: nome e e-mail cifrados; login acha pelo índice", async () => {
    const u = await usuarios.criar({ nome: "Dono", email: "dono@x.com", senha: "senhaforte1", perfil: "ADMIN" });
    const cru = await bruto.usuario.findUniqueOrThrow({ where: { id: u.id } });
    expect(estaCifrado(cru.nome)).toBe(true);
    expect(estaCifrado(cru.email)).toBe(true);
    const achado = await prisma.usuario.findUnique({ where: { emailHash: indiceEmail("DONO@x.com") } });
    expect(achado?.email).toBe("dono@x.com");
  });

  it("barbeiro: telefone cifrado; agendamento: observação cifrada", async () => {
    const b = await prisma.barbeiro.create({ data: { nome: "Zé", telefone: "11999990000" } });
    const s = await prisma.servico.create({ data: { nome: "Corte", precoCentavos: 4000, duracaoMin: 30 } });
    const c = await prisma.cliente.create({ data: { nome: "Bia", telefone: "11911110000" } });
    const a = await prisma.agendamento.create({
      data: { clienteId: c.id, barbeiroId: b.id, servicoId: s.id, inicio: new Date(), fim: new Date(), observacao: "alérgica a lâmina" },
    });
    expect(estaCifrado((await bruto.barbeiro.findUniqueOrThrow({ where: { id: b.id } })).telefone)).toBe(true);
    expect(estaCifrado((await bruto.agendamento.findUniqueOrThrow({ where: { id: a.id } })).observacao)).toBe(true);
    // Leitura aninhada (include) também volta decifrada.
    const lido = await prisma.agendamento.findUniqueOrThrow({ where: { id: a.id }, include: { cliente: true } });
    expect(lido.observacao).toBe("alérgica a lâmina");
    expect(lido.cliente.nome).toBe("Bia");
  });

  it("e-mail continua único (pelo índice), sem diferenciar maiúsculas", async () => {
    await usuarios.criar({ nome: "A", email: "a@x.com", senha: "senhaforte1", perfil: "ADMIN" });
    const erro = await usuarios.criar({ nome: "B", email: "A@X.com", senha: "senhaforte1", perfil: "RECEPCAO" }).catch((e) => e);
    expect(erro).toBeInstanceOf(ConflictError);
    expect(erro.campos).toHaveProperty("email");
  });

  it("listas continuam em ordem alfabética (ordenação depois de decifrar)", async () => {
    for (const nome of ["Carla", "ana", "Bruno"]) await clientes.criar({ nome, telefone: "11900000000" });
    expect((await clientes.listar()).map((c) => c.nome)).toEqual(["ana", "Bruno", "Carla"]);
  });

  it("filtrar ou ordenar por campo cifrado falha alto (em vez de dar resultado errado)", async () => {
    await expect(prisma.cliente.findMany({ where: { nome: "Ana" } })).rejects.toThrow(/cifrado/);
    await expect(prisma.usuario.findMany({ orderBy: { nome: "asc" } })).rejects.toThrow(/cifrado/);
  });

  it("o script de migração cifra dados antigos em texto puro", async () => {
    const antigo = await bruto.cliente.create({ data: { nome: "Antigo", telefone: "11955550000", email: "antigo@x.com" } });
    execSync("npx tsx scripts/cifrar-dados.ts", { env: process.env, stdio: "ignore" });
    const cru = await bruto.cliente.findUniqueOrThrow({ where: { id: antigo.id } });
    expect(estaCifrado(cru.nome)).toBe(true);
    expect(cru.emailHash).toBe(indiceEmail("antigo@x.com"));
    expect((await prisma.cliente.findUniqueOrThrow({ where: { id: antigo.id } })).nome).toBe("Antigo");
    // Nem restos da versão antiga ficam no arquivo (o script roda VACUUM).
    expect(readFileSync("prisma/test.db").includes("antigo@x.com")).toBe(false);
    // Rodar de novo não estraga nada.
    execSync("npx tsx scripts/cifrar-dados.ts", { env: process.env, stdio: "ignore" });
    expect((await prisma.cliente.findUniqueOrThrow({ where: { id: antigo.id } })).email).toBe("antigo@x.com");
  });

  it("o script barra o deploy se a chave for trocada (os dados não abririam)", async () => {
    await clientes.criar({ nome: "Cifrado", telefone: "11900000000" });
    const outraChave = Buffer.alloc(32, 7).toString("base64");
    expect(() =>
      execSync("npx tsx scripts/cifrar-dados.ts", { env: { ...process.env, DADOS_CHAVE: outraChave }, stdio: "pipe" }),
    ).toThrow(/não abre os dados/);
  });
});
