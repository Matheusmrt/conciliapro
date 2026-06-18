-- CreateEnum
CREATE TYPE "Plano" AS ENUM ('BASICO', 'PROFISSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMIN', 'GERENTE', 'OPERADOR');

-- CreateEnum
CREATE TYPE "Adquirente" AS ENUM ('CIELO', 'REDE', 'STONE', 'GETNET', 'PAGSEGURO', 'SAFRA', 'BIN', 'OUTROS');

-- CreateEnum
CREATE TYPE "Bandeira" AS ENUM ('VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'OUTROS');

-- CreateEnum
CREATE TYPE "Modalidade" AS ENUM ('CREDITO_A_VISTA', 'CREDITO_PARCELADO', 'DEBITO', 'PIX', 'VOUCHER');

-- CreateEnum
CREATE TYPE "StatusVenda" AS ENUM ('PENDENTE', 'CONCILIADA', 'DIVERGENTE', 'NAO_ENCONTRADA');

-- CreateEnum
CREATE TYPE "StatusConciliacao" AS ENUM ('CONCILIADA', 'DIVERGENCIA_VALOR', 'DIVERGENCIA_TAXA', 'DIVERGENCIA_PRAZO', 'VENDA_SEM_REPASSE', 'REPASSE_SEM_VENDA');

-- CreateEnum
CREATE TYPE "TipoDivergencia" AS ENUM ('TAXA_MAIOR_CONTRATADA', 'VALOR_DIFERENTE', 'PRAZO_ANTECIPADO', 'PRAZO_ATRASADO', 'VENDA_NAO_REPASSADA', 'REPASSE_DUPLICADO', 'CANCELAMENTO_NAO_ESTORNADO');

-- CreateEnum
CREATE TYPE "TipoAcesso" AS ENUM ('EDI_SFTP', 'API_REST', 'WEBHOOK', 'UPLOAD_MANUAL');

-- CreateEnum
CREATE TYPE "TipoArquivo" AS ENUM ('EDI_CIELO_O', 'EDI_CIELO_C', 'EDI_CIELO_F', 'EDI_REDE', 'EDI_GETNET', 'OFX', 'CSV_VENDAS');

-- CreateEnum
CREATE TYPE "StatusArquivo" AS ENUM ('AGUARDANDO', 'PROCESSANDO', 'CONCLUIDO', 'ERRO');

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "plano" "Plano" NOT NULL DEFAULT 'BASICO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'OPERADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estabelecimentos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "estabelecimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adquirentes_config" (
    "id" TEXT NOT NULL,
    "adquirente" "Adquirente" NOT NULL,
    "tipoAcesso" "TipoAcesso" NOT NULL,
    "credenciais" JSONB NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimaSincEm" TIMESTAMP(3),
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "adquirentes_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendas" (
    "id" TEXT NOT NULL,
    "nsu" TEXT NOT NULL,
    "tid" TEXT,
    "dataVenda" TIMESTAMP(3) NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "parcelas" INTEGER NOT NULL DEFAULT 1,
    "bandeira" "Bandeira" NOT NULL,
    "modalidade" "Modalidade" NOT NULL,
    "adquirente" "Adquirente" NOT NULL,
    "status" "StatusVenda" NOT NULL DEFAULT 'PENDENTE',
    "origem" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estabelecimentoId" TEXT NOT NULL,

    CONSTRAINT "vendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repasses" (
    "id" TEXT NOT NULL,
    "nsu" TEXT NOT NULL,
    "tid" TEXT,
    "dataVenda" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3) NOT NULL,
    "valorBruto" DECIMAL(12,2) NOT NULL,
    "taxaMdr" DECIMAL(5,4) NOT NULL,
    "valorTaxa" DECIMAL(12,2) NOT NULL,
    "valorLiquido" DECIMAL(12,2) NOT NULL,
    "parcela" INTEGER NOT NULL DEFAULT 1,
    "totalParcelas" INTEGER NOT NULL DEFAULT 1,
    "bandeira" "Bandeira" NOT NULL,
    "modalidade" "Modalidade" NOT NULL,
    "adquirente" "Adquirente" NOT NULL,
    "tipoRegistro" TEXT,
    "arquivoOrigem" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estabelecimentoId" TEXT NOT NULL,

    CONSTRAINT "repasses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conciliacoes" (
    "id" TEXT NOT NULL,
    "status" "StatusConciliacao" NOT NULL DEFAULT 'CONCILIADA',
    "diferencaValor" DECIMAL(12,2),
    "diferencaTaxa" DECIMAL(5,4),
    "observacao" TEXT,
    "conciliadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendaId" TEXT,
    "repasseId" TEXT,
    "estabelecimentoId" TEXT NOT NULL,

    CONSTRAINT "conciliacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "divergencias" (
    "id" TEXT NOT NULL,
    "tipo" "TipoDivergencia" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorImpacto" DECIMAL(12,2),
    "resolvida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conciliacaoId" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,

    CONSTRAINT "divergencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arquivos_importados" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoArquivo" NOT NULL,
    "adquirente" "Adquirente" NOT NULL,
    "totalLinhas" INTEGER NOT NULL,
    "totalImportadas" INTEGER NOT NULL,
    "status" "StatusArquivo" NOT NULL DEFAULT 'PROCESSANDO',
    "erros" JSONB,
    "s3Key" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processadoEm" TIMESTAMP(3),

    CONSTRAINT "arquivos_importados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_recebiveis" (
    "id" TEXT NOT NULL,
    "dataPrevista" TIMESTAMP(3) NOT NULL,
    "valorPrevisto" DECIMAL(12,2) NOT NULL,
    "adquirente" "Adquirente" NOT NULL,
    "bandeira" "Bandeira" NOT NULL,
    "modalidade" "Modalidade" NOT NULL,
    "antecipado" BOOLEAN NOT NULL DEFAULT false,
    "recebido" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estabelecimentoId" TEXT NOT NULL,

    CONSTRAINT "agenda_recebiveis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "estabelecimentos_cnpj_empresaId_key" ON "estabelecimentos"("cnpj", "empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "vendas_nsu_adquirente_estabelecimentoId_key" ON "vendas"("nsu", "adquirente", "estabelecimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "repasses_nsu_adquirente_parcela_estabelecimentoId_key" ON "repasses"("nsu", "adquirente", "parcela", "estabelecimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "conciliacoes_vendaId_key" ON "conciliacoes"("vendaId");

-- CreateIndex
CREATE UNIQUE INDEX "conciliacoes_repasseId_key" ON "conciliacoes"("repasseId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estabelecimentos" ADD CONSTRAINT "estabelecimentos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adquirentes_config" ADD CONSTRAINT "adquirentes_config_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repasses" ADD CONSTRAINT "repasses_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacoes" ADD CONSTRAINT "conciliacoes_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "vendas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacoes" ADD CONSTRAINT "conciliacoes_repasseId_fkey" FOREIGN KEY ("repasseId") REFERENCES "repasses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacoes" ADD CONSTRAINT "conciliacoes_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divergencias" ADD CONSTRAINT "divergencias_conciliacaoId_fkey" FOREIGN KEY ("conciliacaoId") REFERENCES "conciliacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divergencias" ADD CONSTRAINT "divergencias_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
