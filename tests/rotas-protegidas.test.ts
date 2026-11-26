import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const API = path.resolve(__dirname, "../src/app/api");

function rotas(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const p = path.join(dir, nome);
    if (statSync(p).isDirectory()) return rotas(p);
    return nome === "route.ts" ? [p] : [];
  });
}

describe("rotas da API", () => {
  const arquivos = rotas(API).filter((f) => !f.includes(`${path.sep}auth${path.sep}`));

  it("encontra as rotas", () => {
    expect(arquivos.length).toBeGreaterThan(8);
  });

  it.each(arquivos.map((f) => [path.relative(API, f), f]))("%s: todo handler chama exigirUsuario", (_nome, arquivo) => {
    const codigo = readFileSync(arquivo, "utf8");
    const handlers = codigo.match(/export async function (GET|POST|PUT|PATCH|DELETE)\b[\s\S]*?\n}\n/g) ?? [];
    expect(handlers.length).toBeGreaterThan(0);
    for (const h of handlers) expect(h, h.split("\n")[0]).toContain("exigirUsuario(");
  });
});
