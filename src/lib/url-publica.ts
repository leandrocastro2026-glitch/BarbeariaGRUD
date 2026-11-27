import { headers } from "next/headers";

/**
 * Endereço público do site, usado nos links enviados por e-mail.
 * Em produção vem de configuração (AUTH_URL ou o domínio que o Railway informa): nunca do
 * cabeçalho Host da requisição, que um atacante poderia trocar para mandar à vítima um link
 * apontando para o site dele.
 */
export async function urlPublica(): Promise<string> {
  const fixa =
    process.env.AUTH_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "");
  if (fixa) return new URL(fixa).origin;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Defina AUTH_URL com o endereço público do site (ex.: https://barbearia.up.railway.app).");
  }
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}
