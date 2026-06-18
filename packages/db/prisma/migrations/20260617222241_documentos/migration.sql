-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('BOLETO', 'NOTA_FISCAL', 'OUTRO');

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "nome" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "descricao" TEXT,
    "caminho" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
