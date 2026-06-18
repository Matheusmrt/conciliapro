import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'

export async function rotasAgenda(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Agenda de recebimentos — agrupa repasses por dataPagamento (futuro e passado recente)
  app.get('/', { ...opts }, async (request) => {
    const query = z.object({
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      adquirente: z.string().optional(),
      estabelecimentoId: z.string().optional(),
    }).parse(request.query)

    const payload = (request as any).user

    // Default: mês atual + próximos 60 dias
    const hoje = new Date()
    const inicio = query.dataInicio
      ? new Date(query.dataInicio)
      : new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fim = query.dataFim
      ? new Date(query.dataFim)
      : new Date(hoje.getFullYear(), hoje.getMonth() + 3, 0)

    const where: any = {
      estabelecimento: { empresaId: payload.empresaId },
      dataPagamento: { gte: inicio, lte: fim },
    }
    if (query.adquirente) where.adquirente = query.adquirente
    if (query.estabelecimentoId) where.estabelecimentoId = query.estabelecimentoId

    const repasses = await prisma.repasse.findMany({
      where,
      include: { estabelecimento: true },
      orderBy: { dataPagamento: 'asc' },
    })

    // Agrupa por data
    const porData: Record<string, {
      data: string
      isPast: boolean
      isToday: boolean
      totalBruto: number
      totalLiquido: number
      qtde: number
      adquirentes: Record<string, {
        adquirente: string
        totalBruto: number
        totalLiquido: number
        qtde: number
        modalidades: Record<string, {
          modalidade: string
          totalBruto: number
          totalLiquido: number
          qtde: number
        }>
      }>
    }> = {}

    const hojeStr = hoje.toISOString().slice(0, 10)

    for (const r of repasses) {
      const dataKey = r.dataPagamento.toISOString().slice(0, 10)
      const bruto = Number(r.valorBruto)
      const comissao = Number(r.valorComissao ?? 0)
      const liquido = bruto - comissao

      if (!porData[dataKey]) {
        porData[dataKey] = {
          data: dataKey,
          isPast: dataKey < hojeStr,
          isToday: dataKey === hojeStr,
          totalBruto: 0, totalLiquido: 0, qtde: 0,
          adquirentes: {},
        }
      }
      const d = porData[dataKey]
      d.totalBruto += bruto; d.totalLiquido += liquido; d.qtde++

      if (!d.adquirentes[r.adquirente]) {
        d.adquirentes[r.adquirente] = {
          adquirente: r.adquirente,
          totalBruto: 0, totalLiquido: 0, qtde: 0,
          modalidades: {},
        }
      }
      const a = d.adquirentes[r.adquirente]
      a.totalBruto += bruto; a.totalLiquido += liquido; a.qtde++

      if (!a.modalidades[r.modalidade]) {
        a.modalidades[r.modalidade] = { modalidade: r.modalidade, totalBruto: 0, totalLiquido: 0, qtde: 0 }
      }
      const m = a.modalidades[r.modalidade]
      m.totalBruto += bruto; m.totalLiquido += liquido; m.qtde++
    }

    // Totais por mês (para resumo do calendário)
    const porMes: Record<string, { mes: string; totalBruto: number; totalLiquido: number; qtde: number }> = {}
    for (const d of Object.values(porData)) {
      const mesKey = d.data.slice(0, 7)
      if (!porMes[mesKey]) porMes[mesKey] = { mes: mesKey, totalBruto: 0, totalLiquido: 0, qtde: 0 }
      porMes[mesKey].totalBruto += d.totalBruto
      porMes[mesKey].totalLiquido += d.totalLiquido
      porMes[mesKey].qtde += d.qtde
    }

    const round = (n: number) => Math.round(n)

    return {
      totalBruto: round(repasses.reduce((s, r) => s + Number(r.valorBruto), 0)),
      totalLiquido: round(repasses.reduce((s, r) => s + Number(r.valorLiquido), 0)),
      qtde: repasses.length,
      meses: Object.values(porMes).map(m => ({ ...m, totalBruto: round(m.totalBruto), totalLiquido: round(m.totalLiquido) })),
      dias: Object.values(porData).map(d => ({
        ...d,
        totalBruto: round(d.totalBruto),
        totalLiquido: round(d.totalLiquido),
        adquirentes: Object.values(d.adquirentes).map(a => ({
          ...a,
          totalBruto: round(a.totalBruto),
          totalLiquido: round(a.totalLiquido),
          modalidades: Object.values(a.modalidades).map(m => ({
            ...m,
            totalBruto: round(m.totalBruto),
            totalLiquido: round(m.totalLiquido),
          })),
        })),
      })),
    }
  })

  // Previsão acumulada de caixa — próximos 30/60/90 dias
  app.get('/previsao', { ...opts }, async (request) => {
    const payload = (request as any).user
    const { horizonte, adquirente, estabelecimentoId } = z.object({
      horizonte: z.coerce.number().default(90),
      adquirente: z.string().optional(),
      estabelecimentoId: z.string().optional(),
    }).parse(request.query)

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const fim = new Date(hoje)
    fim.setDate(fim.getDate() + horizonte)

    const where: any = {
      estabelecimento: { empresaId: payload.empresaId },
      dataPagamento: { gte: hoje, lte: fim },
    }
    if (adquirente) where.adquirente = adquirente
    if (estabelecimentoId) where.estabelecimentoId = estabelecimentoId

    const repasses = await prisma.repasse.findMany({
      where,
      select: { dataPagamento: true, valorLiquido: true, adquirente: true },
      orderBy: { dataPagamento: 'asc' },
    })

    // Monta série diária acumulada
    const porDia: Record<string, number> = {}
    for (const r of repasses) {
      const dia = r.dataPagamento.toISOString().slice(0, 10)
      porDia[dia] = (porDia[dia] ?? 0) + Number(r.valorLiquido)
    }

    // Acumula dia a dia
    let acumulado = 0
    const serie: { data: string; diario: number; acumulado: number }[] = []
    const cursor = new Date(hoje)
    while (cursor <= fim) {
      const dia = cursor.toISOString().slice(0, 10)
      const diario = Math.round((porDia[dia] ?? 0))
      acumulado += diario
      if (diario > 0) serie.push({ data: dia, diario, acumulado })
      cursor.setDate(cursor.getDate() + 1)
    }

    // KPIs por horizonte
    const kpis = [30, 60, 90].map(h => {
      const dataLimite = new Date(hoje)
      dataLimite.setDate(dataLimite.getDate() + h)
      const total = repasses
        .filter(r => r.dataPagamento <= dataLimite)
        .reduce((s, r) => s + Number(r.valorLiquido), 0)
      return { horizonte: h, total: Math.round(total) }
    })

    // Por adquirente
    const porAdq: Record<string, number> = {}
    for (const r of repasses) {
      porAdq[r.adquirente] = (porAdq[r.adquirente] ?? 0) + Number(r.valorLiquido)
    }

    return {
      totalGeral: Math.round(repasses.reduce((s, r) => s + Number(r.valorLiquido), 0)),
      qtde: repasses.length,
      kpis,
      serie,
      porAdquirente: Object.entries(porAdq).map(([adq, v]) => ({ adquirente: adq, total: Math.round(v) })).sort((a, b) => b.total - a.total),
    }
  })
}
