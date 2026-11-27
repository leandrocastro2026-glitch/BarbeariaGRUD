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
    "clienteId" INTEGER,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Usuario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Usuario" ("ativo", "criadoEm", "email", "emailVerificadoEm", "googleId", "id", "nome", "perfil", "senhaHash", "versaoSessao") SELECT "ativo", "criadoEm", "email", "emailVerificadoEm", "googleId", "id", "nome", "perfil", "senhaHash", "versaoSessao" FROM "Usuario";
DROP TABLE "Usuario";
ALTER TABLE "new_Usuario" RENAME TO "Usuario";
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
CREATE UNIQUE INDEX "Usuario_googleId_key" ON "Usuario"("googleId");
CREATE UNIQUE INDEX "Usuario_clienteId_key" ON "Usuario"("clienteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
