/**
 * Envio de e-mail por API HTTPS (o Railway bloqueia SMTP no plano Hobby).
 * Provedor escolhido pelas variáveis de ambiente:
 *   - RESEND_API_KEY  → Resend (para enviar a qualquer pessoa exige domínio verificado)
 *   - BREVO_API_KEY   → Brevo
 *   - nenhuma         → não envia: escreve o link no log do servidor (útil em desenvolvimento)
 * EMAIL_REMETENTE: endereço do remetente, ex. "Barbearia <nao-responda@seudominio.com>".
 */

import { mascararEmail } from "./cripto";

export type Email = { para: string; assunto: string; texto: string; html: string };

/**
 * A confirmação de e-mail no cadastro só é exigida quando há um provedor para enviar o link.
 * Sem provedor (ex.: site de demonstração) a conta é criada e já pode entrar — o e-mail fica
 * "não verificado", e por isso a conta não herda o histórico de um cliente com o mesmo e-mail.
 */
export function confirmacaoDeEmailAtiva() {
  return !!(process.env.RESEND_API_KEY || process.env.BREVO_API_KEY);
}

function separarRemetente(remetente: string) {
  const m = remetente.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || undefined, email: m[2] } : { email: remetente.trim() };
}

async function falhou(resposta: Response, provedor: string): Promise<never> {
  const corpo = await resposta.text().catch(() => "");
  throw new Error(`${provedor} recusou o e-mail (HTTP ${resposta.status}): ${corpo.slice(0, 300)}`);
}

export async function enviarEmail(email: Email): Promise<void> {
  const remetente = process.env.EMAIL_REMETENTE?.trim() || "Barbearia <onboarding@resend.dev>";

  if (process.env.RESEND_API_KEY) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: remetente, to: [email.para], subject: email.assunto, text: email.texto, html: email.html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) await falhou(r, "Resend");
    return;
  }

  if (process.env.BREVO_API_KEY) {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: separarRemetente(remetente),
        to: [{ email: email.para }],
        subject: email.assunto,
        textContent: email.texto,
        htmlContent: email.html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) await falhou(r, "Brevo");
    return;
  }

  console.warn(
    // Só o link (sem o nome da pessoa) e o e-mail mascarado: o log não pode virar vazamento de dados.
    `[email] nenhum provedor configurado (RESEND_API_KEY ou BREVO_API_KEY). E-mail para ${mascararEmail(email.para)} não enviado. Link: ${email.texto.match(/https?:\/\/\S+/)?.[0] ?? "(sem link)"}`,
  );
}

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function emailVerificacao(para: string, nome: string, link: string): Email {
  const texto = `Olá, ${nome}!\n\nPara confirmar seu e-mail na Barbearia, abra o link abaixo (vale por 24 horas):\n${link}\n\nSe você não criou esta conta, ignore este e-mail.`;
  const html = `<p>Olá, ${escapar(nome)}!</p>
<p>Para confirmar seu e-mail na Barbearia, clique no botão abaixo. O link vale por 24 horas.</p>
<p><a href="${escapar(link)}" style="display:inline-block;background:#b3261e;color:#fff;padding:10px 18px;text-decoration:none;font-weight:bold">Confirmar e-mail</a></p>
<p style="color:#666;font-size:13px">Ou copie este endereço no navegador:<br>${escapar(link)}</p>
<p style="color:#666;font-size:13px">Se você não criou esta conta, ignore este e-mail.</p>`;
  return { para, assunto: "Confirme seu e-mail · Barbearia", texto, html };
}
