import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'

export async function rotasDashboard(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  app.get('/resumo', { ...opts }, async (request) => {
    const { estabelecimentoId } = z.object({
      estabelecimentoId: z.string().optional(),
    }).parse(request.query)

    const payload = (request as any).user
    const baseWhere = { estabelecimento: { empresaId: payload.empresaId } }
    const where = estabelecimentoId ? { ...baseWhere, estabelecimentoId } : baseWhere

    const [totalVendas, conciliadas, divergentes, semRepasse, totalDivergencias] = await Promise.all([
      prisma.venda.count({ where }),
      prisma.conciliacao.count({ where: { ...where, status: 'CONCILIADA' } }),
      prisma.conciliacao.count({ where: { ...where, status: { in: ['DIVERGENCIA_VALOR', 'DIVERGENCIA_TAXA', 'DIVERGENCIA_PRAZO'] } } }),
      prisma.conciliacao.count({ where: { ...where, status: 'VENDA_SEM_REPASSE' } }),
      prisma.divergencia.count({ where: { ...where, resolvida: false } }),
    ])

    // Soma de valor em divergência
    const divergenciasValor = await prisma.divergencia.aggregate({
      where: { ...where, resolvida: false },
      _sum: { valorImpacto: true },
    })

    return {
      totalVendas,
      conciliadas,
      divergentes,
      semRepasse,
      divergenciasAbertas: totalDivergencias,
      valorEmDivergencia: divergenciasValor._sum.valorImpacto ?? 0,
      taxaConciliacao: totalVendas > 0 ? ((conciliadas / totalVendas) * 100).toFixed(1) : '0',
    }
  })

  // Evolução mensal dos últimos 6 meses
  app.get('/evolucao', { ...opts }, async (request) => {
    const payload = (request as any).user

    const meses: { mes: string; bruto: number; liquido: number; divergencias: number }[] = []

    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const inicio = new Date(d.getFullYear(), d.getMonth(), 1)
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const mesLabel = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

      const [repasses, divs] = await Promise.all([
        prisma.repasse.findMany({
          where: { estabelecimento: { empresaId: payload.empresaId }, dataPagamento: { gte: inicio, lte: fim } },
          select: { valorBruto: true, valorLiquido: true },
        }),
        prisma.divergencia.count({
          where: { estabelecimento: { empresaId: payload.empresaId }, criadoEm: { gte: inicio, lte: fim } },
        }),
      ])

      meses.push({
        mes: mesLabel,
        bruto: Math.round(repasses.reduce((s, r) => s + Number(r.valorBruto), 0)),
        liquido: Math.round(repasses.reduce((s, r) => s + Number(r.valorLiquido), 0)),
        divergencias: divs,
      })
    }

    return meses
  })

  // Volume por bandeira (últimos 30 dias)
  app.get('/bandeiras', { ...opts }, async (request) => {
    const payload = (request as any).user
    const inicio = new Date(Date.now() - 30 * 86400000)
    const dados = await prisma.repasse.groupBy({
      by: ['bandeira'],
      where: { estabelecimento: { empresaId: payload.empresaId }, dataPagamento: { gte: inicio } },
      _sum: { valorBruto: true, valorLiquido: true },
      _count: true,
      orderBy: { _sum: { valorBruto: 'desc' } },
    })
    const total = dados.reduce((s, d) => s + Number(d._sum.valorBruto ?? 0), 0)
    return dados.map(d => ({
      bandeira: d.bandeira,
      valorBruto: Math.round(Number(d._sum.valorBruto ?? 0)),
      valorLiquido: Math.round(Number(d._sum.valorLiquido ?? 0)),
      qtde: d._count,
      percentual: total > 0 ? ((Number(d._sum.valorBruto ?? 0) / total) * 100).toFixed(1) : '0',
    }))
  })

  // Volume por modalidade (últimos 30 dias)
  app.get('/modalidades', { ...opts }, async (request) => {
    const payload = (request as any).user
    const inicio = new Date(Date.now() - 30 * 86400000)
    const dados = await prisma.repasse.groupBy({
      by: ['modalidade'],
      where: { estabelecimento: { empresaId: payload.empresaId }, dataPagamento: { gte: inicio } },
      _sum: { valorBruto: true, valorLiquido: true },
      _count: true,
      _avg: { taxaMdr: true },
      orderBy: { _sum: { valorBruto: 'desc' } },
    })
    const total = dados.reduce((s, d) => s + Number(d._sum.valorBruto ?? 0), 0)
    return dados.map(d => ({
      modalidade: d.modalidade,
      valorBruto: Math.round(Number(d._sum.valorBruto ?? 0)),
      valorLiquido: Math.round(Number(d._sum.valorLiquido ?? 0)),
      qtde: d._count,
      taxaMedia: Number(d._avg.taxaMdr ?? 0),
      percentual: total > 0 ? ((Number(d._sum.valorBruto ?? 0) / total) * 100).toFixed(1) : '0',
    }))
  })

  // Ticket médio e métricas adicionais
  app.get('/metricas', { ...opts }, async (request) => {
    const payload = (request as any).user
    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

    const [ticketMedio, topAdquirentes, vendasHoje] = await Promise.all([
      prisma.repasse.aggregate({
        where: { estabelecimento: { empresaId: payload.empresaId }, dataPagamento: { gte: inicioMes } },
        _avg: { valorBruto: true, taxaMdr: true },
        _count: true,
        _sum: { valorBruto: true, valorLiquido: true, valorTaxa: true },
      }),
      prisma.repasse.groupBy({
        by: ['adquirente'],
        where: { estabelecimento: { empresaId: payload.empresaId }, dataPagamento: { gte: inicioMes } },
        _sum: { valorBruto: true },
        _count: true,
        orderBy: { _sum: { valorBruto: 'desc' } },
        take: 5,
      }),
      prisma.venda.count({
        where: { estabelecimento: { empresaId: payload.empresaId }, dataVenda: { gte: new Date(hoje.setHours(0, 0, 0, 0)) } },
      }),
    ])

    return {
      ticketMedio: Math.round(Number(ticketMedio._avg.valorBruto ?? 0)),
      taxaMdrMedia: Number(ticketMedio._avg.taxaMdr ?? 0),
      totalMes: Math.round(Number(ticketMedio._sum.valorBruto ?? 0)),
      liquidoMes: Math.round(Number(ticketMedio._sum.valorLiquido ?? 0)),
      comissaoMes: Math.round(Number(ticketMedio._sum.valorTaxa ?? 0)),
      qtdeMes: ticketMedio._count,
      vendasHoje,
      topAdquirentes: topAdquirentes.map(a => ({
        adquirente: a.adquirente,
        valorBruto: Math.round(Number(a._sum.valorBruto ?? 0)),
        qtde: a._count,
      })),
    }
  })

  app.get('/recebiveis', { ...opts }, async (request) => {
    const { estabelecimentoId } = z.object({
      estabelecimentoId: z.string().optional(),
    }).parse(request.query)

    const where = estabelecimentoId ? { estabelecimentoId } : {}

    const agenda = await prisma.agendaRecebiveis.findMany({
      where: {
        ...where,
        dataPrevista: { gte: new Date() },
        recebido: false,
      },
      orderBy: { dataPrevista: 'asc' },
      take: 30,
    })

    return agenda
  })
}
