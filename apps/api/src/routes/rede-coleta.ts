import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@conciliacao/db'
import { buscarVendas, buscarPagamentos, buscarRecebiveis, getToken } from '../lib/rede-api.js'

export async function rotasRedeColeta(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // POST /rede-coleta/vendas — busca vendas da Rede e salva como Repasse
  app.post('/vendas', { ...opts }, async (request, reply) => {
    const body = z.object({
      parentCompanyNumber: z.string(),
      estabelecimentoId: z.string(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      modality: z.enum(['CREDIT', 'DEBIT']).optional(),
    }).parse(request.body)

    let page = 0
    let totalImportadas = 0
    let totalIgnoradas = 0

    while (true) {
      const result = await buscarVendas({
        parentCompanyNumber: body.parentCompanyNumber,
        startDate: body.startDate,
        endDate: body.endDate,
        modality: body.modality,
        page,
        size: 100,
      })

      const vendas: any[] = result.sales ?? result.content ?? result.data ?? []
      if (vendas.length === 0) break

      for (const v of vendas) {
        try {
          await prisma.repasse.upsert({
            where: {
              nsu_adquirente_parcela_estabelecimentoId: {
                nsu: v.nsu ?? v.saleId,
                adquirente: 'REDE',
                parcela: v.installments ?? 1,
                estabelecimentoId: body.estabelecimentoId,
              },
            },
            update: {},
            create: {
              nsu: v.nsu ?? v.saleId,
              tid: v.authorizationCode ?? v.saleId,
              dataVenda: new Date(v.saleDate),
              dataPagamento: new Date(v.saleDate),
              valorBruto: Math.round((v.grossAmount ?? 0) * 100),
              taxaMdr: 0,
              valorTaxa: Math.round((v.mdrAmount ?? 0) * 100),
              valorLiquido: Math.round((v.netAmount ?? v.grossAmount ?? 0) * 100),
              parcela: v.installments ?? 1,
              totalParcelas: v.totalInstallments ?? 1,
              bandeira: v.brandName ?? 'REDE',
              modalidade: v.modality ?? 'CREDIT',
              adquirente: 'REDE',
              tipoRegistro: 'V',
              arquivoOrigem: `rede-api-${body.startDate}`,
              estabelecimentoId: body.estabelecimentoId,
            },
          })
          totalImportadas++
        } catch {
          totalIgnoradas++
        }
      }

      if (page >= (result.totalPages ?? 1) - 1) break
      page++
    }

    return { ok: true, importadas: totalImportadas, ignoradas: totalIgnoradas }
  })

  // GET /rede-coleta/vendas — preview sem salvar (útil para testar)
  app.get('/vendas', { ...opts }, async (request) => {
    const query = z.object({
      parentCompanyNumber: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      modality: z.string().optional(),
      page: z.coerce.number().default(0),
      size: z.coerce.number().default(20),
    }).parse(request.query)

    return buscarVendas(query)
  })

  // GET /rede-coleta/pagamentos
  app.get('/pagamentos', { ...opts }, async (request) => {
    const query = z.object({
      parentCompanyNumber: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      page: z.coerce.number().default(0),
    }).parse(request.query)

    return buscarPagamentos(query)
  })

  // GET /rede-coleta/recebiveis
  app.get('/recebiveis', { ...opts }, async (request) => {
    const query = z.object({
      parentCompanyNumber: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      type: z.enum(['DAY', 'MONTH']).optional(),
    }).parse(request.query)

    return buscarRecebiveis(query)
  })

  // GET /rede-coleta/status — verifica se credenciais estão funcionando
  app.get('/status', { ...opts }, async (_request, reply) => {
    try {
      await getToken()
      return { ok: true, mensagem: 'Autenticação Rede OK' }
    } catch (err: any) {
      reply.code(502)
      return { ok: false, erro: err.message }
    }
  })
}
