-- AlterTable
ALTER TABLE "contas_bancarias" ADD COLUMN     "pluggyAccountId" TEXT,
ADD COLUMN     "pluggyItemId" TEXT,
ADD COLUMN     "ultimaSincEm" TIMESTAMP(3);
