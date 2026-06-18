import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'

export async function rotasParcelas(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Repasses detalhados por parcela com filtros
  app.get('/', { ...opts }, async (request) => {
    const payload = (request as any).user
    const { adquirente, bandeira, modalidade, dataInicio, dataFim, estabelecimentoId, pagina } = z.object({
      adquirente: z.string().optional(),
      bandeira: z.string().optional(),
      modalidade: z.string().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      estabelecimentoId: z.string().optional(),
      pagina: z.coerce.number().default(1),
    }).parse(request.query)

    const LIMIT = 100
    const where: any = { estabelecimento: { empresaId: payload.empresaId } }
    if (adquirente) where.adquirente = adquirente
    if (bandeira) where.bandeira = bandeira
    if (modalidade) where.modalidade = modalidade
    if (estabelecimentoId) where.estabelecimentoId = estabelecimentoId
    if (dataInicio || dataFim) {
      where.dataPagamento = {}
      if (dataInicio) where.dataPagamento.gte = new Date(dataInicio)
      if (dataFim) where.dataPagamento.lte = new Date(dataFim)
    }

    const [total, repasses, totais] = await Promise.all([
      prisma.repasse.count({ where }),
      prisma.repasse.findMany({
        where,
        select: {
          id: true, nsu: true, dataVenda: true, dataPagamento: true,
          valorBruto: true, valorTaxa: true, valorLiquido: true,
          taxaMdr: true, parcela: true, totalParcelas: true,
          bandeira: true, modalidade: true, adquirente: true,
          estabelecimento: { select: { nome: true } },
        },
        orderBy: { dataPagamento: 'asc' },
        skip: (pagina - 1) * LIMIT,
        take: LIMIT,
      }),
      prisma.repasse.aggregate({
        where,
        _sum: { valorBruto: true, valorTaxa: true, valorLiquido: true },
        _count: true,
        _avg: { taxaMdr: true },
      }),
    ])

    return {
      total,
      pagina,
      dados: repasses,
      totais: {
        valorBruto: Number(totais._sum.valorBruto ?? 0),
        valorTaxa: Number(totais._sum.valorTaxa ?? 0),
        valorLiquido: Number(totais._sum.valorLiquido ?? 0),
        taxaMdrMedia: Number(totais._avg.taxaMdr ?? 0),
        qtde: totais._count,
      },
    }
  })

  // Breakdown por bandeira
  app.get('/por-bandeira', { ...opts }, async (request) => {
    const payload = (request as any).user
    const { dataInicio, dataFim } = z.object({
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }).parse(request.query)

    const where: any = { estabelecimento: { empresaId: payload.empresaId } }
    if (dataInicio) where.dataPagamento = { ...where.dataPagamento, gte: new Date(dataInicio) }
    if (dataFim) where.dataPagamento = { ...where.dataPagamento, lte: new Date(dataFim) }

    return prisma.repasse.groupBy({
      by: ['bandeira'],
      where,
      _sum: { valorBruto: true, valorLiquido: true, valorTaxa: true },
      _count: true,
      _avg: { taxaMdr: true },
      orderBy: { _sum: { valorBruto: 'desc' } },
    })
  })

  // Breakdown por modalidade
  app.get('/por-modalidade', { ...opts }, async (request) => {
    const payload = (request as any).user
    const { dataInicio, dataFim } = z.object({
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }).parse(request.query)

    const where: any = { estabelecimento: { empresaId: payload.empresaId } }
    if (dataInicio) where.dataPagamento = { gte: new Date(dataInicio) }
    if (dataFim) where.dataPagamento = { ...where.dataPagamento, lte: new Date(dataFim) }

    return prisma.repasse.groupBy({
      by: ['modalidade'],
      where,
      _sum: { valorBruto: true, valorLiquido: true },
      _count: true,
      _avg: { taxaMdr: true },
      orderBy: { _sum: { valorBruto: 'desc' } },
    })
  })
}
