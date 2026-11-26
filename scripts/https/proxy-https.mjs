/**
 * Proxy HTTPS local para testar o site "como se estivesse no ar".
 *   npm run start:https   →  https://localhost:3443  →  http://localhost:3100 (npm start -p 3100)
 * Faz o papel de Nginx/Caddy/Vercel: termina o TLS e avisa o app via X-Forwarded-*.
 * Usa o certificado autoassinado de .certs/ (gerado só para testes locais).
 */
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";

const PORTA = Number(process.env.HTTPS_PORT ?? 3443);
const ALVO = new URL(process.env.HTTPS_ALVO ?? "http://localhost:3100");

const servidor = https.createServer(
  { key: readFileSync(".certs/localhost-key.pem"), cert: readFileSync(".certs/localhost.pem") },
  (req, res) => {
    const host = req.headers.host ?? `localhost:${PORTA}`;
    const repasse = http.request(
      {
        hostname: ALVO.hostname,
        port: ALVO.port,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, "x-forwarded-proto": "https", "x-forwarded-host": host, "x-forwarded-port": String(PORTA), "x-forwarded-for": req.socket.remoteAddress ?? "" },
      },
      (resp) => {
        // HSTS: o navegador passa a usar só HTTPS neste endereço (como num site real).
        res.writeHead(resp.statusCode ?? 502, { ...resp.headers, "strict-transport-security": "max-age=31536000" });
        resp.pipe(res);
      },
    );
    repasse.on("error", () => {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      res.end(`Servidor do app não respondeu em ${ALVO.origin}. Rode: npm run build && npx next start -p ${ALVO.port}`);
    });
    req.pipe(repasse);
  },
);

servidor.listen(PORTA, () => console.log(`HTTPS em https://localhost:${PORTA} → ${ALVO.origin}`));
