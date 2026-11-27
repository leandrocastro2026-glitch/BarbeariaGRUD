-- DropIndex
DROP INDEX "Cliente_email_key";

-- DropIndex
DROP INDEX "Usuario_email_key";

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN "emailHash" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "emailHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_emailHash_key" ON "Cliente"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_emailHash_key" ON "Usuario"("emailHash");

