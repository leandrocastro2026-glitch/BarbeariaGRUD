import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (senha: string, salt: Buffer, tamanho: number, opcoes: ScryptOptions) =>
  new Promise<Buffer>((ok, falha) =>
    scryptCb(senha, salt, tamanho, opcoes, (erro, chave) => (erro ? falha(erro) : ok(chave))),
  );

// Parâmetros recomendados pelo OWASP para scrypt (N=2^17, r=8, p=1).
const N = 2 ** 17;
const OPCOES: ScryptOptions = { N, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const TAMANHO = 64;

/** Formato: scrypt$N$saltBase64$hashBase64 */
export async function gerarHashSenha(senha: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(senha, salt, TAMANHO, OPCOES);
  return `scrypt$${N}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verificarSenha(senha: string, armazenado: string): Promise<boolean> {
  const partes = armazenado.split("$");
  if (partes.length !== 4 || partes[0] !== "scrypt") return false;
  const n = Number(partes[1]);
  if (!Number.isInteger(n) || n < 2 ** 14 || n > 2 ** 20) return false;
  const salt = Buffer.from(partes[2], "base64");
  const esperado = Buffer.from(partes[3], "base64");
  if (salt.length === 0 || esperado.length !== TAMANHO) return false;
  const calculado = await scrypt(senha, salt, TAMANHO, { ...OPCOES, N: n });
  return timingSafeEqual(calculado, esperado);
}
