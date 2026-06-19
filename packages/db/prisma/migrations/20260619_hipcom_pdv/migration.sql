-- CreateTable
CREATE TABLE "hipcom_configs" (
    "id" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "basicUser" TEXT NOT NULL,
    "basicSenha" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "senhaHipcom" TEXT NOT NULL,
    "lojaId" INTEGER NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimaSincEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estabelecimentoId" TEXT NOT NULL,

    CONSTRAINT "hipcom_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendas_hipcom" (
    "id" TEXT NOT NULL,
    "numeroCupom" TEXT NOT NULL,
    "terminal" INTEGER NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "desconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "acrescimo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "cpfCnpj" TEXT,
    "cancelado" BOOLEAN NOT NULL DEFAULT false,
    "sincEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estabelecimentoId" TEXT NOT NULL,

    CONSTRAINT "vendas_hipcom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendas_hipcom_itens" (
    "id" TEXT NOT NULL,
    "plu" INTEGER,
    "ean" TEXT,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(10,3) NOT NULL,
    "valorUnit" DECIMAL(12,2) NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendaHipcomId" TEXT NOT NULL,

    CONSTRAINT "vendas_hipcom_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hipcom_configs_estabelecimentoId_key" ON "hipcom_configs"("estabelecimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "vendas_hipcom_numeroCupom_terminal_estabelecimentoId_key" ON "vendas_hipcom"("numeroCupom", "terminal", "estabelecimentoId");

-- AddForeignKey
ALTER TABLE "hipcom_configs" ADD CONSTRAINT "hipcom_configs_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas_hipcom" ADD CONSTRAINT "vendas_hipcom_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas_hipcom_itens" ADD CONSTRAINT "vendas_hipcom_itens_vendaHipcomId_fkey" FOREIGN KEY ("vendaHipcomId") REFERENCES "vendas_hipcom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "vendas_hipcom_pagtos" (
    "id" TEXT NOT NULL,
    "meioPagamento" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "nsu" TEXT,
    "bin" TEXT,
    "host" TEXT,
    "vendaHipcomId" TEXT NOT NULL,

    CONSTRAINT "vendas_hipcom_pagtos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "vendas_hipcom_pagtos" ADD CONSTRAINT "vendas_hipcom_pagtos_vendaHipcomId_fkey" FOREIGN KEY ("vendaHipcomId") REFERENCES "vendas_hipcom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
