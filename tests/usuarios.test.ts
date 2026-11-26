import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import * as usuarios from "@/lib/services/usuarios";
import { ConflictError, ValidationError } from "@/lib/erros";
import { verificarSenha } from "@/lib/senha";

let admin: { id: number };

beforeEach(async () => {
  await prisma.usuario.deleteMany();
  admin = await usuarios.criar({ nome: "Dono", email: "dono@x.com", senha: "senhaforte1", perfil: "ADMIN" });
});

describe("usuarios", () => {
  it("guarda hash e nunca devolve a senha", async () => {
    const lista = await usuarios.listar();
    expect(lista[0]).not.toHaveProperty("senhaHash");
    const bruto = await prisma.usuario.findUniqueOrThrow({ where: { id: admin.id } });
    expect(await verificarSenha("senhaforte1", bruto.senhaHash)).toBe(true);
  });

  it("exige senha com pelo menos 8 caracteres ao criar", async () => {
    await expect(
      usuarios.criar({ nome: "R", email: "r@x.com", senha: "curta", perfil: "RECEPCAO" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("e-mail duplicado gera conflito (sem diferenciar maiúsculas)", async () => {
    await expect(
      usuarios.criar({ nome: "X", email: "DONO@x.com", senha: "senhaforte1", perfil: "RECEPCAO" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("atualizar sem senha mantém a senha atual", async () => {
    await usuarios.atualizar(admin.id, { nome: "Dono 2", email: "dono@x.com", perfil: "ADMIN", ativo: true, senha: "" }, admin.id);
    const bruto = await prisma.usuario.findUniqueOrThrow({ where: { id: admin.id } });
    expect(bruto.nome).toBe("Dono 2");
    expect(await verificarSenha("senhaforte1", bruto.senhaHash)).toBe(true);
  });

  it("trocar senha ou perfil invalida sessões; editar só o nome não", async () => {
    const versao = async () => (await prisma.usuario.findUniqueOrThrow({ where: { id: admin.id } })).versaoSessao;
    const outro = await usuarios.criar({ nome: "Sócio", email: "socio@x.com", senha: "senhaforte1", perfil: "ADMIN" });
    const base = { nome: "Dono", email: "dono@x.com", perfil: "ADMIN", ativo: true };
    const v0 = await versao();
    await usuarios.atualizar(admin.id, { ...base, nome: "Dono 2", senha: "" }, outro.id);
    expect(await versao()).toBe(v0);
    await usuarios.atualizar(admin.id, { ...base, senha: "novaSenha123" }, outro.id);
    expect(await versao()).toBe(v0 + 1);
    await usuarios.atualizar(admin.id, { ...base, perfil: "RECEPCAO", senha: "" }, outro.id);
    expect(await versao()).toBe(v0 + 2);
  });

  it("não deixa o admin se desativar, se rebaixar ou se excluir", async () => {
    const base = { nome: "Dono", email: "dono@x.com", senha: "" };
    await expect(usuarios.atualizar(admin.id, { ...base, perfil: "ADMIN", ativo: false }, admin.id)).rejects.toBeInstanceOf(ConflictError);
    await expect(usuarios.atualizar(admin.id, { ...base, perfil: "RECEPCAO", ativo: true }, admin.id)).rejects.toBeInstanceOf(ConflictError);
    await expect(usuarios.excluir(admin.id, admin.id)).rejects.toBeInstanceOf(ConflictError);
  });

  it("não permite remover o último admin ativo", async () => {
    const outro = await usuarios.criar({ nome: "Sócio", email: "socio@x.com", senha: "senhaforte1", perfil: "ADMIN" });
    // Sócio desativa o dono: ok, ainda sobra o sócio.
    await usuarios.atualizar(admin.id, { nome: "Dono", email: "dono@x.com", perfil: "ADMIN", ativo: false, senha: "" }, outro.id);
    // Agora o sócio é o último admin ativo; um terceiro admin inativo não conta.
    const recepcao = await usuarios.criar({ nome: "Rec", email: "rec@x.com", senha: "senhaforte1", perfil: "RECEPCAO" });
    await expect(usuarios.excluir(outro.id, recepcao.id)).rejects.toBeInstanceOf(ConflictError);
  });
});
