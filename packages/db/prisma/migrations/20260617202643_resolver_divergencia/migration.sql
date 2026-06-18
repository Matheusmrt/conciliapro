-- AlterTable
ALTER TABLE "divergencias" ADD COLUMN     "motivoResolucao" TEXT,
ADD COLUMN     "observacaoResolucao" TEXT,
ADD COLUMN     "resolvidaEm" TIMESTAMP(3),
ADD COLUMN     "resolvidaPor" TEXT;
