-- CreateTable
CREATE TABLE "TokenVerificacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "hashToken" TEXT NOT NULL,
    "expiraEm" DATETIME NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenVerificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT,
    "perfil" TEXT NOT NULL DEFAULT 'RECEPCAO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "versaoSessao" INTEGER NOT NULL DEFAULT 0,
    "emailVerificadoEm" DATETIME,
    "googleId" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Usuários que já existiam foram criados por um administrador: contam como e-mail verificado.
INSERT INTO "new_Usuario" ("ativo", "criadoEm", "email", "id", "nome", "perfil", "senhaHash", "versaoSessao", "emailVerificadoEm") SELECT "ativo", "criadoEm", "email", "id", "nome", "perfil", "senhaHash", "versaoSessao", "criadoEm" FROM "Usuario";
DROP TABLE "Usuario";
ALTER TABLE "new_Usuario" RENAME TO "Usuario";
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
CREATE UNIQUE INDEX "Usuario_googleId_key" ON "Usuario"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TokenVerificacao_hashToken_key" ON "TokenVerificacao"("hashToken");

-- CreateIndex
CREATE INDEX "TokenVerificacao_usuarioId_idx" ON "TokenVerificacao"("usuarioId");
