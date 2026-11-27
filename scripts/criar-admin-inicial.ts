/**
 * Roda a cada start em produção (npm run start:producao). Se o banco ainda não tem nenhum
 * usuário E as variáveis ADMIN_INICIAL_EMAIL / ADMIN_INICIAL_SENHA estão definidas, cria o
 * primeiro administrador. Em qualquer outro caso não faz nada — nunca altera usuários existentes.
 * Depois do primeiro login, apague essas variáveis no painel da hospedagem.
 */
import { mascararEmail } from "../src/lib/cripto";
import { prisma } from "../src/lib/prisma";
import { AppError } from "../src/lib/erros";
import * as usuarios from "../src/lib/services/usuarios";

async function main() {
  const email = process.env.ADMIN_INICIAL_EMAIL?.trim();
  const senha = process.env.ADMIN_INICIAL_SENHA;
  const total = await prisma.usuario.count();

  if (total > 0) {
    if (email || senha) console.warn("[admin-inicial] já existem usuários; ignorando ADMIN_INICIAL_* (pode apagar essas variáveis).");
    return;
  }
  if (!email || !senha) {
    console.warn("[admin-inicial] nenhum usuário cadastrado. Defina ADMIN_INICIAL_EMAIL e ADMIN_INICIAL_SENHA e reinicie, ou rode npm run usuario:criar.");
    return;
  }
  const u = await usuarios.criar({ nome: process.env.ADMIN_INICIAL_NOME?.trim() || "Administrador", email, senha, perfil: "ADMIN" });
  console.log(`[admin-inicial] administrador criado: ${mascararEmail(u.email)}. Apague ADMIN_INICIAL_SENHA do painel.`);
}

main()
  .catch((e) => {
    // Não derruba o servidor por causa disso: só avisa.
    console.error("[admin-inicial] não foi possível criar o admin:", e instanceof AppError ? `${e.message} ${JSON.stringify(e.campos ?? {})}` : e);
  })
  .finally(() => prisma.$disconnect());
