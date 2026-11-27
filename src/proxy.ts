import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

const PUBLICAS = ["/login", "/cadastro", "/verificar-email", "/api/auth"];

const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Endereço público do site, como o navegador o vê. Atrás de um proxy HTTPS (Nginx, Caddy,
 * Vercel) o servidor interno roda em outra porta/protocolo; o proxy informa o endereço real
 * em X-Forwarded-Proto/X-Forwarded-Host. Navegadores não conseguem forjar esses headers em
 * requisições de outros sites (exigiria CORS, que este app não libera).
 */
function origemPublica(req: NextRequest) {
  const primeiro = (h: string) => req.headers.get(h)?.split(",")[0]?.trim();
  const proto = primeiro("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host = primeiro("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  return `${proto}://${host}`;
}

/**
 * Proteção CSRF para a API: escrita só é aceita quando a requisição vem do próprio site.
 * (O cookie SameSite=Lax já barra sites externos, mas outra porta em localhost conta como "mesmo site".)
 */
function origemValida(req: NextRequest) {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origem = req.headers.get("origin");
  if (!origem) return req.headers.get("sec-fetch-site") !== "same-site";
  return origem === origemPublica(req);
}

/**
 * Checagem otimista (só olha se há sessão no cookie). A autorização de verdade —
 * usuário ativo e permissão por perfil — é feita em cada página e rota de API
 * via `exigirPagina` / `exigirUsuario`.
 */
export const proxy = auth((req) => {
  const res = decidir(req) ?? NextResponse.next();
  // HSTS: depois da primeira visita por HTTPS, o navegador nunca mais abre o site sem criptografia.
  // Fora de localhost, para não "travar" o ambiente de desenvolvimento em HTTPS.
  const publico = new URL(origemPublica(req));
  if (publico.protocol === "https:" && !["localhost", "127.0.0.1"].includes(publico.hostname)) {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return res;
});

function decidir(req: Parameters<Parameters<typeof auth>[0]>[0]) {
  const { pathname, search } = req.nextUrl;
  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/") &&
    !METODOS_SEGUROS.has(req.method) &&
    !origemValida(req)
  ) {
    return NextResponse.json({ erro: "Origem da requisição não permitida." }, { status: 403 });
  }
  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
  if (req.auth) return;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Faça login para continuar." }, { status: 401 });
  }
  const login = new URL("/login", req.nextUrl);
  if (pathname !== "/") login.searchParams.set("de", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)"],
};
