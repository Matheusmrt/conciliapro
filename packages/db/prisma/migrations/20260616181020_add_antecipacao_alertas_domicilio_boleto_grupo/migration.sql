-- CreateEnum
CREATE TYPE "TipoConta" AS ENUM ('CORRENTE', 'POUPANCA', 'PAGAMENTO');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('TAXA_MDR_ALTA', 'DIVERGENCIA_NOVA', 'SEM_REPASSE_DIAS', 'TAXA_CONCILIACAO_BAIXA', 'VALOR_REPASSE_DIVERGENTE');

-- CreateEnum
CREATE TYPE "StatusAntecipacao" AS ENUM ('SIMULACAO', 'SOLICITADA', 'APROVADA', 'LIQUIDADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusBoleto" AS ENUM ('EMITIDO', 'PAGO', 'VENCIDO', 'CANCELADO');

-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "grupoId" TEXT;

-- CreateTable
CREATE TABLE "grupos_empresariais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupos_empresariais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_bancarias" (
    "id" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "codigoBanco" TEXT,
    "agencia" TEXT NOT NULL,
    "conta" TEXT NOT NULL,
    "tipoConta" "TipoConta" NOT NULL DEFAULT 'CORRENTE',
    "titular" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estabelecimentoId" TEXT NOT NULL,

    CONSTRAINT "contas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_regras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "condicao" JSONB NOT NULL,
    "emailNotif" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "alertas_regras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_disparos" (
    "id" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "valorAtual" DECIMAL(12,4),
    "emailEnviado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regraId" TEXT NOT NULL,

    CONSTRAINT "alertas_disparos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antecipacoes" (
    "id" TEXT NOT NULL,
    "dataSimulacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataRealizada" TIMESTAMP(3),
    "valorBruto" DECIMAL(12,2) NOT NULL,
    "taxaAntecipacao" DECIMAL(6,4) NOT NULL,
    "custoTotal" DECIMAL(12,2) NOT NULL,
    "valorLiquido" DECIMAL(12,2) NOT NULL,
    "diasAntecipados" INTEGER NOT NULL,
    "adquirente" "Adquirente",
    "status" "StatusAntecipacao" NOT NULL DEFAULT 'SIMULACAO',
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "antecipacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boletos" (
    "id" TEXT NOT NULL,
    "nossoNumero" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "valor" DECIMAL(12,2) NOT NULL,
    "valorPago" DECIMAL(12,2),
    "pagador" TEXT,
    "status" "StatusBoleto" NOT NULL DEFAULT 'EMITIDO',
    "banco" TEXT,
    "arquivoOrigem" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estabelecimentoId" TEXT NOT NULL,

    CONSTRAINT "boletos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos_empresariais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_bancarias" ADD CONSTRAINT "contas_bancarias_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_regras" ADD CONSTRAINT "alertas_regras_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_disparos" ADD CONSTRAINT "alertas_disparos_regraId_fkey" FOREIGN KEY ("regraId") REFERENCES "alertas_regras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antecipacoes" ADD CONSTRAINT "antecipacoes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletos" ADD CONSTRAINT "boletos_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
