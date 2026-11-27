/**
 * Roda a cada start em produção (npm run start:producao), antes do servidor subir.
 * Cifra dados pessoais que ainda estejam em texto puro (bancos criados antes da criptografia)
 * e preenche o índice de e-mail. Se já está tudo cifrado, não faz nada.
 * Sem DADOS_CHAVE ele falha e o deploy não sobe — melhor do que gravar dados sem proteção.
 */
import { cifrar, decifrar, estaCifrado } from "../src/lib/cripto";
import { CAMPOS_CIFRADOS, criarClienteBruto, prisma } from "../src/lib/prisma";

type Linha = Record<string, unknown> & { id: number };
type Delegado = {
  findMany(a: object): Promise<Linha[]>;
  update(a: object): Promise<unknown>;
};

const MODELOS: { nome: string; delegado: string; indice?: boolean }[] = [
  { nome: "Cliente", delegado: "cliente", indice: true },
  { nome: "Barbeiro", delegado: "barbeiro" },
  { nome: "Usuario", delegado: "usuario", indice: true },
  { nome: "Agendamento", delegado: "agendamento" },
];

async function main() {
  // Valida a chave logo de cara: sem ela o servidor subiria e quebraria no primeiro login.
  decifrar(cifrar("teste-da-chave"));
  const bruto = criarClienteBruto();
  try {
    let total = 0;
    for (const m of MODELOS) {
      const campos = CAMPOS_CIFRADOS[m.nome];
      const select = Object.fromEntries([["id", true], ...campos.map((c) => [c, true]), ...(m.indice ? [["emailHash", true]] : [])]);
      const linhas = await (bruto as unknown as Record<string, Delegado>)[m.delegado].findMany({ select });
      for (const l of linhas) {
        // Chave trocada/errada: o GCM recusa decifrar. Barra o deploy antes que todas as telas quebrem.
        for (const c of campos) {
          if (!estaCifrado(l[c])) continue;
          try {
            decifrar(l[c]);
          } catch {
            throw new Error(
              `a DADOS_CHAVE atual não abre os dados já cifrados (${m.nome} #${l.id}). Volte a chave original no painel; sem ela os dados não podem ser lidos.`,
            );
          }
        }
        const emClaro = campos.some((c) => typeof l[c] === "string" && !estaCifrado(l[c]));
        const semIndice = m.indice && typeof l.email === "string" && !l.emailHash;
        if (!emClaro && !semIndice) continue;
        // Passa pelo client com cifragem: ele cifra cada campo e grava o índice do e-mail.
        const data = Object.fromEntries(campos.filter((c) => typeof l[c] === "string").map((c) => [c, decifrar(l[c] as string)]));
        await (prisma as unknown as Record<string, Delegado>)[m.delegado].update({ where: { id: l.id }, data });
        total++;
      }
    }
    if (total) {
      // O SQLite não apaga do disco a versão antiga de uma linha atualizada: o texto puro ficaria nas
      // páginas livres do arquivo. O VACUUM reescreve o arquivo inteiro, sem esses restos.
      await bruto.$executeRawUnsafe("VACUUM");
      console.log(`[cifrar-dados] ${total} registro(s) cifrado(s); arquivo do banco compactado (sem restos em texto puro).`);
    } else {
      console.log("[cifrar-dados] tudo já está cifrado.");
    }
  } finally {
    await bruto.$disconnect();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[cifrar-dados] FALHOU:", e instanceof Error ? e.message : e);
  process.exit(1);
});
