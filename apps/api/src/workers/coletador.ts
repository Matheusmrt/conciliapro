import { Queue, Worker, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'
import { prisma } from '@conciliacao/db'
import { parseCieloEDI, parseRedeEDI, parseBeneficioCSV } from '@conciliacao/edi-parser'
import type { Adquirente } from '@conciliacao/edi-parser'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

export const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })

export const QUEUE_COLETA = 'coleta-edi'
export const QUEUE_CONCILIACAO = 'conciliacao'

export const coletaQueue = new Queue(QUEUE_COLETA, { connection })
export const conciliacaoQueue = new Queue(QUEUE_CONCILIACAO, { connection })

// ─── Worker de Coleta ─────────────────────────────────────────────────────────
// Por enquanto processa uploads manuais enfileirados via API.
// Quando SFTP for ativado, adiciona client SSH aqui.

export const coletaWorker = new Worker(
  QUEUE_COLETA,
  async (job) => {
    const { conteudo, nomeArquivo, adquirente, estabelecimentoId, empresaId } = job.data

    job.log(`Processando ${nomeArquivo} (${adquirente})`)

    let resultado
    if (adquirente === 'CIELO') resultado = parseCieloEDI(conteudo, nomeArquivo)
    else if (adquirente === 'REDE') resultado = parseRedeEDI(conteudo, nomeArquivo)
    else resultado = parseBeneficioCSV(conteudo, nomeArquivo, adquirente as Adquirente)

    const isBeneficio = ['ALELO', 'PLUXEE', 'VR_BENEFICIOS', 'TICKET', 'VEROCARD', 'UP_BRASIL', 'BEN_VISA_VALE'].includes(adquirente)
    const ehPagamento = isBeneficio || resultado.transacoes[0]?.tipoRegistro === 'C'

    let importadas = 0
    if (ehPagamento) {
      for (const t of resultado.transacoes) {
        try {
          await prisma.repasse.upsert({
            where: {
              nsu_adquirente_parcela_estabelecimentoId: {
                nsu: t.nsu, adquirente: t.adquirente,
                parcela: t.parcela, estabelecimentoId,
              },
            },
            update: {},
            create: {
              nsu: t.nsu, tid: t.tid,
              dataVenda: t.dataVenda,
              dataPagamento: t.dataPagamento ?? t.dataVenda,
              valorBruto: t.valorBruto,
              taxaMdr: t.taxaMdr ?? 0,
              valorTaxa: t.valorTaxa ?? 0,
              valorLiquido: t.valorLiquido ?? t.valorBruto,
              parcela: t.parcela, totalParcelas: t.totalParcelas,
              bandeira: t.bandeira, modalidade: t.modalidade, adquirente: t.adquirente,
              tipoRegistro: t.tipoRegistro, arquivoOrigem: t.arquivoOrigem,
              estabelecimentoId,
            },
          })
          importadas++
        } catch { /* duplicata */ }
      }
    }

    await prisma.arquivoImportado.create({
      data: {
        nome: nomeArquivo,
        tipo: 'CSV_VENDAS',
        adquirente: adquirente as any,
        totalLinhas: resultado.totalLinhas,
        totalImportadas: importadas,
        status: 'CONCLUIDO',
        erros: resultado.erros.length > 0 ? resultado.erros : undefined,
        processadoEm: new Date(),
      },
    })

    job.log(`Importadas ${importadas} transações de ${resultado.transacoes.length}`)
    return { importadas, erros: resultado.erros.length }
  },
  { connection, concurrency: 3 },
)

// ─── Worker de Conciliação ────────────────────────────────────────────────────
// Chamado após importação para processar o motor automaticamente.

export const conciliacaoWorker = new Worker(
  QUEUE_CONCILIACAO,
  async (job) => {
    const { estabelecimentoId, empresaId } = job.data
    job.log(`Iniciando conciliação para estabelecimento ${estabelecimentoId}`)

    const { executarConciliacao } = await import('@conciliacao/conciliador')
    const resultado = await executarConciliacao(estabelecimentoId)

    job.log(`Resultado: ${JSON.stringify(resultado)}`)
    return resultado
  },
  { connection, concurrency: 2 },
)

coletaWorker.on('completed', (job) => {
  console.log(`[Coleta] Job ${job.id} concluído`)
})
coletaWorker.on('failed', (job, err) => {
  console.error(`[Coleta] Job ${job?.id} falhou:`, err.message)
})
conciliacaoWorker.on('completed', (job) => {
  console.log(`[Conciliação] Job ${job.id} concluído`)
})
conciliacaoWorker.on('failed', (job, err) => {
  console.error(`[Conciliação] Job ${job?.id} falhou:`, err.message)
})

console.log('Workers iniciados: coletaWorker, conciliacaoWorker')
