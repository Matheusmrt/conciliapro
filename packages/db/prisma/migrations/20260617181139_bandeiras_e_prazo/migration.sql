-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Bandeira" ADD VALUE 'DINERS';
ALTER TYPE "Bandeira" ADD VALUE 'CABAL';
ALTER TYPE "Bandeira" ADD VALUE 'JCB';
ALTER TYPE "Bandeira" ADD VALUE 'CREDZ';
ALTER TYPE "Bandeira" ADD VALUE 'SOROCRED';
ALTER TYPE "Bandeira" ADD VALUE 'BANESCARD';
ALTER TYPE "Bandeira" ADD VALUE 'SICREDI';
ALTER TYPE "Bandeira" ADD VALUE 'CUP';
ALTER TYPE "Bandeira" ADD VALUE 'COOPERCRED';

-- AlterTable
ALTER TABLE "itens_contratos_taxas" ADD COLUMN     "prazoDias" INTEGER NOT NULL DEFAULT 1;
