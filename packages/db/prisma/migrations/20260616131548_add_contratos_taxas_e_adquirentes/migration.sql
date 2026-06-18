-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Adquirente" ADD VALUE 'ALELO';
ALTER TYPE "Adquirente" ADD VALUE 'PLUXEE';
ALTER TYPE "Adquirente" ADD VALUE 'VR_BENEFICIOS';
ALTER TYPE "Adquirente" ADD VALUE 'TICKET';
ALTER TYPE "Adquirente" ADD VALUE 'VEROCARD';
ALTER TYPE "Adquirente" ADD VALUE 'UP_BRASIL';
ALTER TYPE "Adquirente" ADD VALUE 'BEN_VISA_VALE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoArquivo" ADD VALUE 'EDI_REDE_O';
ALTER TYPE "TipoArquivo" ADD VALUE 'EDI_REDE_C';

-- CreateTable
CREATE TABLE "contratos_taxas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "adquirente" "Adquirente" NOT NULL,
    "numeroMatriz" TEXT,
    "vigenciaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenciaFim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "contratos_taxas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_contratos_taxas" (
    "id" TEXT NOT NULL,
    "modalidade" "Modalidade" NOT NULL,
    "bandeira" "Bandeira",
    "parcelas" INTEGER,
    "taxa" DECIMAL(6,4) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contratoId" TEXT NOT NULL,

    CONSTRAINT "itens_contratos_taxas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contratos_taxas" ADD CONSTRAINT "contratos_taxas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_contratos_taxas" ADD CONSTRAINT "itens_contratos_taxas_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_taxas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
