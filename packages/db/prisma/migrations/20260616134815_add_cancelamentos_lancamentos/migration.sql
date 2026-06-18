-- CreateEnum
CREATE TYPE "TipoCancelamento" AS ENUM ('CANCELAMENTO_CLIENTE', 'CHARGEBACK', 'FRAUDE', 'ERRO_OPERACIONAL', 'OUTROS');

-- CreateEnum
CREATE TYPE "StatusCancelamento" AS ENUM ('DETECTADO', 'ESTORNADO', 'PENDENTE_ESTORNO', 'CONTESTADO');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('CREDITO', 'DEBITO');

-- CreateEnum
CREATE TYPE "StatusLancamento" AS ENUM ('CONCILIADO', 'PENDENTE', 'IGNORADO');

-- CreateTable
CREATE TABLE "cancelamentos" (
    "id" TEXT NOT NULL,
    "nsu" TEXT NOT NULL,
    "tid" TEXT,
    "dataVenda" TIMESTAMP(3) NOT NULL,
    "dataCancelamento" TIMESTAMP(3) NOT NULL,
    "adquirente" "Adquirente" NOT NULL,
    "bandeira" "Bandeira" NOT NULL,
    "modalidade" "Modalidade" NOT NULL,
    "valorBruto" DECIMAL(12,2) NOT NULL,
    "tipo" "TipoCancelamento" NOT NULL DEFAULT 'CANCELAMENTO_CLIENTE',
    "status" "StatusCancelamento" NOT NULL DEFAULT 'DETECTADO',
    "motivoDescricao" TEXT,
    "arquivoOrigem" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estabelecimentoId" TEXT NOT NULL,

    CONSTRAINT "cancelamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos_bancarios" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "documento" TEXT,
    "status" "StatusLancamento" NOT NULL DEFAULT 'PENDENTE',
    "banco" TEXT,
    "agencia" TEXT,
    "conta" TEXT,
    "arquivoOrigem" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estabelecimentoId" TEXT NOT NULL,

    CONSTRAINT "lancamentos_bancarios_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cancelamentos" ADD CONSTRAINT "cancelamentos_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_bancarios" ADD CONSTRAINT "lancamentos_bancarios_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
