-- CreateEnum
CREATE TYPE "StatusEmpresa" AS ENUM ('TRIAL', 'ATIVO', 'INADIMPLENTE', 'CANCELADO');

-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "pagarmeCustomerId" TEXT,
ADD COLUMN     "pagarmeSubscriptionId" TEXT,
ADD COLUMN     "statusSaas" "StatusEmpresa" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "telefone" TEXT,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" TEXT NOT NULL,
    "plano" "Plano" NOT NULL,
    "status" TEXT NOT NULL,
    "valorCentavos" INTEGER,
    "pagarmeId" TEXT,
    "inicioEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renovaEm" TIMESTAMP(3),
    "canceladoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
