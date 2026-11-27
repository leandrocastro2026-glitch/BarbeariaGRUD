/**
 * Criptografia dos dados pessoais guardados no banco (nome, telefone, e-mail, observações).
 *
 * - Cifra: AES-256-GCM (confidencialidade + detecção de adulteração), IV aleatório por valor.
 *   Formato gravado: "enc:v1:" + base64url(iv[12] | tag[16] | conteúdo).
 * - Índice cego: HMAC-SHA256 do e-mail normalizado, para achar a conta no login sem guardar o
 *   e-mail em texto puro. Sem a chave, o índice não permite descobrir o e-mail.
 * - Chave: DADOS_CHAVE (32 bytes em base64). As duas sub-chaves (cifra e índice) são derivadas por HKDF.
 *   PERDER A CHAVE = PERDER OS DADOS. Guarde uma cópia fora do Railway.
 */
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";

const PREFIXO = "enc:v1:";

let chaves: { cifra: Buffer; indice: Buffer } | undefined;

function obterChaves() {
  if (chaves) return chaves;
  const bruta = process.env.DADOS_CHAVE?.trim();
  if (!bruta) {
    throw new Error(
      "DADOS_CHAVE não definida. Gere com: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  const mestre = Buffer.from(bruta, "base64");
  if (mestre.length !== 32) throw new Error("DADOS_CHAVE deve ter exatamente 32 bytes em base64.");
  const derivar = (rotulo: string) => Buffer.from(hkdfSync("sha256", mestre, Buffer.alloc(0), rotulo, 32));
  chaves = { cifra: derivar("barbearia:cifra:v1"), indice: derivar("barbearia:indice:v1") };
  return chaves;
}

export const estaCifrado = (v: unknown): v is string => typeof v === "string" && v.startsWith(PREFIXO);

export function cifrar(texto: string): string {
  if (estaCifrado(texto)) return texto;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", obterChaves().cifra, iv);
  const conteudo = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return PREFIXO + Buffer.concat([iv, c.getAuthTag(), conteudo]).toString("base64url");
}

export function decifrar(valor: string): string {
  if (!estaCifrado(valor)) return valor;
  const bruto = Buffer.from(valor.slice(PREFIXO.length), "base64url");
  const d = createDecipheriv("aes-256-gcm", obterChaves().cifra, bruto.subarray(0, 12));
  d.setAuthTag(bruto.subarray(12, 28));
  return Buffer.concat([d.update(bruto.subarray(28)), d.final()]).toString("utf8");
}

/** Índice para busca exata de e-mail (sem diferenciar maiúsculas/espaços). */
export function indiceEmail(email: string): string {
  return createHmac("sha256", obterChaves().indice).update(email.trim().toLowerCase()).digest("hex");
}

/** Para logs: "an***@exemplo.com". Nunca escreva e-mail completo em log. */
export function mascararEmail(email: string): string {
  const [usuario, dominio] = email.split("@");
  if (!dominio) return "***";
  return `${usuario.slice(0, 2)}***@${dominio}`;
}
