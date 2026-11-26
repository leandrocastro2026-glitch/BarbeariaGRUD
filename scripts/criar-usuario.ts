/**
 * Cria um usuário pelo terminal (use para o primeiro administrador):
 *   npm run usuario:criar
 * A senha é digitada sem aparecer na tela e nunca é gravada em texto puro.
 */
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { prisma } from "../src/lib/prisma";
import { AppError } from "../src/lib/erros";
import * as usuarios from "../src/lib/services/usuarios";

let silencioso = false;
const saida = new Writable({
  write(chunk, _enc, cb) {
    if (!silencioso) process.stdout.write(chunk);
    cb();
  },
});
const rl = createInterface({ input: process.stdin, output: saida, terminal: true });

const perguntar = (texto: string) => new Promise<string>((ok) => rl.question(texto, ok));

async function perguntarSenha(texto: string) {
  process.stdout.write(texto);
  silencioso = true;
  const v = await perguntar("");
  silencioso = false;
  process.stdout.write("\n");
  return v;
}

async function main() {
  const temAdmin = (await prisma.usuario.count({ where: { perfil: "ADMIN", ativo: true } })) > 0;
  console.log(temAdmin ? "Criar novo usuário" : "Nenhum administrador ainda — criando o primeiro.");

  const nome = await perguntar("Nome: ");
  const email = await perguntar("E-mail (login): ");
  let perfil = "ADMIN";
  if (temAdmin) {
    const r = (await perguntar("Perfil [1] Administrador  [2] Recepção (padrão 2): ")).trim();
    perfil = r === "1" ? "ADMIN" : "RECEPCAO";
  }
  const senha = await perguntarSenha("Senha (mín. 8 caracteres): ");
  const confirmacao = await perguntarSenha("Repita a senha: ");
  if (senha !== confirmacao) throw new Error("As senhas não conferem.");

  const u = await usuarios.criar({ nome, email, senha, perfil });
  console.log(`\nUsuário criado: ${u.nome} <${u.email}> (${u.perfil}). Entre em /login.`);
}

main()
  .catch((e) => {
    if (e instanceof AppError) {
      console.error(`\nErro: ${e.message}`);
      for (const [campo, msgs] of Object.entries(e.campos ?? {})) console.error(`  ${campo}: ${msgs.join(" ")}`);
    } else console.error(`\nErro: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
