import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    // Chave fixa só para os testes (nunca use em produção).
    env: { DATABASE_URL: "file:./test.db", DADOS_CHAVE: "dGVzdGUtdGVzdGUtdGVzdGUtdGVzdGUtdGVzdGUtMTI=" },
    fileParallelism: false,
  },
});
