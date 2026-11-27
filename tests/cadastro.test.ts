import { beforeEach, describe, expect, it, vi } from "vitest";

const enviados: { para: string; texto: string }[] = [];
vi.mock("@/lib/email", async (original) => ({
  ...(await original<typeof import("@/lib/email")>()),
  enviarEmail: vi.fn(async (e: { para: string; texto: string }) => {
    enviados.push(e);
  }),
}));

import { indiceEmail } from "@/lib/cripto";
import { ValidationError } from "@/lib/erros";
import { prisma } from "@/lib/prisma";
import * as cadastro from "@/lib/services/cadastro";

const BASE = "https://barbearia.teste";
const dados = (email: string, extra: object = {}) => ({
  nome: "Fulano",
  email,
  senha: "senhaforte1",
  confirmacao: "senhaforte1",
  ...extra,
});
const tokenDoUltimoEmail = () => {
  const m = enviados.at(-1)?.texto.match(/verificar-email\?token=([\w%-]+)/);
  return m ? decodeURIComponent(m[1]) : "";
};
const buscar = (email: string) => prisma.usuario.findUniqueOrThrow({ where: { emailHash: indiceEmail(email) } });

beforeEach(async () => {
  // Estes testes simulam um provedor de e-mail configurado (confirmação ativa); o envio é falso (mock).
  vi.stubEnv("BREVO_API_KEY", "teste");
  await prisma.tokenVerificacao.deleteMany();
  await prisma.usuario.deleteMany();
  enviados.length = 0;
});

describe("cadastro por e-mail", () => {
  it("primeira conta vira ADMIN ativa, mas só entra depois de confirmar o e-mail", async () => {
    await cadastro.cadastrar(dados("Dono@X.com"), BASE);
    const u = await buscar("dono@x.com");
    expect(u).toMatchObject({ perfil: "ADMIN", ativo: true, emailVerificadoEm: null });
    expect(enviados).toHaveLength(1);
    expect(enviados[0].para).toBe("dono@x.com");
    expect(enviados[0].texto).toContain(`${BASE}/verificar-email?token=`);

    expect(await cadastro.confirmarEmail(tokenDoUltimoEmail())).toBe(true);
    expect((await buscar("dono@x.com")).emailVerificadoEm).not.toBeNull();
  });

  it("contas seguintes são de CLIENTE e já ficam ativas", async () => {
    await cadastro.cadastrar(dados("dono@x.com"), BASE);
    await cadastro.cadastrar(dados("novo@x.com"), BASE);
    expect(await buscar("novo@x.com")).toMatchObject({ perfil: "CLIENTE", ativo: true, emailVerificadoEm: null });
  });

  it("guarda só o hash do token, e o link vale uma vez só", async () => {
    await cadastro.cadastrar(dados("a@x.com"), BASE);
    const token = tokenDoUltimoEmail();
    const [registro] = await prisma.tokenVerificacao.findMany();
    expect(registro.hashToken).not.toContain(token);
    expect(await cadastro.confirmarEmail(token)).toBe(true);
    expect(await cadastro.confirmarEmail(token)).toBe(false);
  });

  it("recusa token inventado ou vencido", async () => {
    await cadastro.cadastrar(dados("a@x.com"), BASE);
    expect(await cadastro.confirmarEmail("inventado")).toBe(false);
    await prisma.tokenVerificacao.updateMany({ data: { expiraEm: new Date(Date.now() - 1000) } });
    expect(await cadastro.confirmarEmail(tokenDoUltimoEmail())).toBe(false);
  });

  it("e-mail já cadastrado não cria outra conta nem dá erro (não revela quem existe)", async () => {
    await cadastro.cadastrar(dados("a@x.com"), BASE);
    // Com confirmação ativa, a tela mostra a mesma mensagem nos dois casos (confirmar: true).
    await expect(cadastro.cadastrar(dados("a@x.com", { nome: "Outro" }), BASE)).resolves.toMatchObject({ confirmar: true });
    expect(await prisma.usuario.count()).toBe(1);
    expect((await buscar("a@x.com")).nome).toBe("Fulano");
    // Reenvio dentro de 1 minuto é ignorado (anti-spam).
    expect(enviados).toHaveLength(1);
  });

  it("valida senha curta e confirmação diferente", async () => {
    await expect(cadastro.cadastrar(dados("a@x.com", { senha: "curta", confirmacao: "curta" }), BASE)).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(cadastro.cadastrar(dados("a@x.com", { confirmacao: "outraSenha1" }), BASE)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(await prisma.usuario.count()).toBe(0);
  });

  it("ignora perfil/ativo enviados pelo formulário", async () => {
    await cadastro.cadastrar(dados("dono@x.com"), BASE);
    await cadastro.cadastrar(dados("hacker@x.com", { perfil: "ADMIN", ativo: true }), BASE);
    expect(await buscar("hacker@x.com")).toMatchObject({ perfil: "CLIENTE" });
  });
});

describe("cadastro sem provedor de e-mail (site de demonstração)", () => {
  beforeEach(() => vi.stubEnv("BREVO_API_KEY", ""));

  it("cria a conta sem pedir confirmação e não envia e-mail", async () => {
    await cadastro.cadastrar(dados("dono@x.com"), BASE);
    expect(await cadastro.cadastrar(dados("novo@x.com"), BASE)).toEqual({ confirmar: false, jaExistia: false });
    expect(enviados).toHaveLength(0);
    expect(await buscar("novo@x.com")).toMatchObject({ perfil: "CLIENTE", ativo: true, emailVerificadoEm: null });
  });

  it("avisa que o e-mail já tem conta e não altera a conta existente", async () => {
    await cadastro.cadastrar(dados("a@x.com"), BASE);
    const antes = await buscar("a@x.com");
    expect(await cadastro.cadastrar(dados("a@x.com", { nome: "Outro", senha: "outraSenha9", confirmacao: "outraSenha9" }), BASE)).toEqual({
      confirmar: false,
      jaExistia: true,
    });
    const depois = await buscar("a@x.com");
    expect(depois.nome).toBe("Fulano");
    expect(depois.senhaHash).toBe(antes.senhaHash);
  });
});

describe("entrar com Google", () => {
  const google = (email: string, extra: object = {}) => ({ sub: `g-${email}`, email, email_verified: true, name: "G", ...extra });

  it("cria a conta já verificada (primeira = ADMIN ativa)", async () => {
    const r = await cadastro.entrarComGoogle(google("dono@gmail.com"));
    expect(r.ok).toBe(true);
    const u = await buscar("dono@gmail.com");
    expect(u).toMatchObject({ perfil: "ADMIN", ativo: true, googleId: "g-dono@gmail.com", senhaHash: null });
    expect(u.emailVerificadoEm).not.toBeNull();
  });

  it("conta nova que não é a primeira vira CLIENTE e entra", async () => {
    await cadastro.entrarComGoogle(google("dono@gmail.com"));
    expect((await cadastro.entrarComGoogle(google("outro@gmail.com"))).ok).toBe(true);
    expect(await buscar("outro@gmail.com")).toMatchObject({ perfil: "CLIENTE", ativo: true });
  });

  it("conta desativada por um admin não entra pelo Google", async () => {
    await cadastro.entrarComGoogle(google("dono@gmail.com"));
    await cadastro.entrarComGoogle(google("outro@gmail.com"));
    await prisma.usuario.update({ where: { emailHash: indiceEmail("outro@gmail.com") }, data: { ativo: false } });
    expect(await cadastro.entrarComGoogle(google("outro@gmail.com"))).toEqual({ ok: false, motivo: "inativa" });
  });

  it("recusa e-mail que o Google não verificou", async () => {
    expect(await cadastro.entrarComGoogle(google("x@gmail.com", { email_verified: false }))).toEqual({
      ok: false,
      motivo: "email_nao_verificado",
    });
    expect(await prisma.usuario.count()).toBe(0);
  });

  it("vincula à conta já confirmada com o mesmo e-mail e mantém a senha", async () => {
    await cadastro.cadastrar(dados("dono@gmail.com"), BASE);
    await cadastro.confirmarEmail(tokenDoUltimoEmail());
    const antes = await buscar("dono@gmail.com");
    expect((await cadastro.entrarComGoogle(google("dono@gmail.com"))).ok).toBe(true);
    const depois = await buscar("dono@gmail.com");
    expect(depois.googleId).toBe("g-dono@gmail.com");
    expect(depois.senhaHash).toBe(antes.senhaHash);
  });

  it("conta nunca confirmada criada por outra pessoa perde a senha ao ser reivindicada pelo Google", async () => {
    // Atacante cadastra o e-mail da vítima com uma senha que só ele sabe e não confirma.
    await cadastro.cadastrar(dados("vitima@gmail.com", { senha: "senhaDoAtacante", confirmacao: "senhaDoAtacante" }), BASE);
    const antes = await buscar("vitima@gmail.com");
    await cadastro.entrarComGoogle(google("vitima@gmail.com"));
    const depois = await buscar("vitima@gmail.com");
    expect(depois.senhaHash).toBeNull();
    expect(depois.versaoSessao).toBe(antes.versaoSessao + 1);
    expect(depois.emailVerificadoEm).not.toBeNull();
  });
});
