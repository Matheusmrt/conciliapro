import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'

export async function rotasFluxoCaixa(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Fluxo de Caixa — agrupa repasses por dataPagamento
  app.get('/', { ...opts }, async (request) => {
    const query = z.object({
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      adquirente: z.string().optional(),
      estabelecimentoId: z.string().optional(),
    }).parse(request.query)

    const payload = (request as any).user

    const where: any = {
      estabelecimento: { empresaId: payload.empresaId },
    }

    if (query.dataInicio) where.dataPagamento = { gte: new Date(query.dataInicio) }
    if (query.dataFim) where.dataPagamento = { ...where.dataPagamento, lte: new Date(query.dataFim) }
    if (query.adquirente) where.adquirente = query.adquirente
    if (query.estabelecimentoId) where.estabelecimentoId = query.estabelecimentoId

    const repasses = await prisma.repasse.findMany({
      where,
      include: { estabelecimento: true },
      orderBy: { dataPagamento: 'asc' },
    })

    // Agrupa por data de pagamento → estabelecimento → adquirente
    const porData: Record<string, {
      data: string
      totalBruto: number
      totalComissao: number
      totalLiquidoPrevisto: number
      totalLiquidoPago: number
      diferenca: number
      qtde: number
      estabelecimentos: Record<string, {
        id: string
        nome: string
        totalBruto: number
        totalComissao: number
        totalLiquidoPrevisto: number
        totalLiquidoPago: number
        diferenca: number
        qtde: number
        adquirentes: Record<string, {
          adquirente: string
          totalBruto: number
          totalComissao: number
          totalLiquidoPrevisto: number
          totalLiquidoPago: number
          diferenca: number
          qtde: number
          repasses: {
            id: string
            nsu: string
            bandeira: string
            modalidade: string
            parcela: number
            totalParcelas: number
            valorBruto: number
            valorComissao: number
            valorLiquidoPrevisto: number
            valorLiquidoPago: number
            diferenca: number
          }[]
        }>
      }>
    }> = {}

    for (const r of repasses) {
      const dataKey = r.dataPagamento!.toISOString().slice(0, 10)
      const bruto = Number(r.valorBruto)
      const comissao = Number(r.valorTaxa ?? 0)
      const liqPrevisto = bruto - comissao
      const liqPago = Number(r.valorLiquido ?? 0)
      const dif = liqPago - liqPrevisto

      if (!porData[dataKey]) {
        porData[dataKey] = {
          data: dataKey,
          totalBruto: 0, totalComissao: 0,
          totalLiquidoPrevisto: 0, totalLiquidoPago: 0, diferenca: 0, qtde: 0,
          estabelecimentos: {},
        }
      }
      const d = porData[dataKey]
      d.totalBruto += bruto; d.totalComissao += comissao
      d.totalLiquidoPrevisto += liqPrevisto; d.totalLiquidoPago += liqPago
      d.diferenca += dif; d.qtde++

      if (!d.estabelecimentos[r.estabelecimentoId]) {
        d.estabelecimentos[r.estabelecimentoId] = {
          id: r.estabelecimentoId, nome: r.estabelecimento.nome,
          totalBruto: 0, totalComissao: 0,
          totalLiquidoPrevisto: 0, totalLiquidoPago: 0, diferenca: 0, qtde: 0,
          adquirentes: {},
        }
      }
      const e = d.estabelecimentos[r.estabelecimentoId]
      e.totalBruto += bruto; e.totalComissao += comissao
      e.totalLiquidoPrevisto += liqPrevisto; e.totalLiquidoPago += liqPago
      e.diferenca += dif; e.qtde++

      if (!e.adquirentes[r.adquirente]) {
        e.adquirentes[r.adquirente] = {
          adquirente: r.adquirente,
          totalBruto: 0, totalComissao: 0,
          totalLiquidoPrevisto: 0, totalLiquidoPago: 0, diferenca: 0, qtde: 0,
          repasses: [],
        }
      }
      const a = e.adquirentes[r.adquirente]
      a.totalBruto += bruto; a.totalComissao += comissao
      a.totalLiquidoPrevisto += liqPrevisto; a.totalLiquidoPago += liqPago
      a.diferenca += dif; a.qtde++
      a.repasses.push({
        id: r.id, nsu: r.nsu,
        bandeira: r.bandeira, modalidade: r.modalidade,
        parcela: r.parcela, totalParcelas: r.totalParcelas,
        valorBruto: Math.round(bruto),
        valorComissao: Math.round(comissao),
        valorLiquidoPrevisto: Math.round(liqPrevisto),
        valorLiquidoPago: Math.round(liqPago),
        diferenca: Math.round(dif),
      })
    }

    // Totais globais
    const totalBruto = repasses.reduce((s, r) => s + Number(r.valorBruto), 0)
    const totalComissao = repasses.reduce((s, r) => s + Number(r.valorTaxa ?? 0), 0)
    const totalLiquidoPrevisto = totalBruto - totalComissao
    const totalLiquidoPago = repasses.reduce((s, r) => s + Number(r.valorLiquido ?? 0), 0)

    // Lista de adquirentes distintos para filtro no frontend
    const adquirentesDistintos = [...new Set(repasses.map(r => r.adquirente))].sort()

    const roundObj = (o: any) => ({
      ...o,
      totalBruto: Math.round(o.totalBruto),
      totalComissao: Math.round(o.totalComissao),
      totalLiquidoPrevisto: Math.round(o.totalLiquidoPrevisto),
      totalLiquidoPago: Math.round(o.totalLiquidoPago),
      diferenca: Math.round(o.diferenca),
    })

    return {
      totalBruto: Math.round(totalBruto),
      totalComissao: Math.round(totalComissao),
      totalLiquidoPrevisto: Math.round(totalLiquidoPrevisto),
      totalLiquidoPago: Math.round(totalLiquidoPago),
      diferenca: Math.round(totalLiquidoPago - totalLiquidoPrevisto),
      qtde: repasses.length,
      adquirentes: adquirentesDistintos,
      dias: Object.values(porData).map(d => ({
        ...roundObj(d),
        estabelecimentos: Object.values(d.estabelecimentos).map(e => ({
          ...roundObj(e),
          adquirentes: Object.values(e.adquirentes).map(a => roundObj(a)),
        })),
      })),
    }
  })
}
