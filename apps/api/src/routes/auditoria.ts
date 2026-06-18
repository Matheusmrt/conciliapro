import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'

export async function rotasAuditoria(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Auditoria de Taxas — compara taxaMdr do repasse vs contrato cadastrado
  app.get('/taxas', { ...opts }, async (request) => {
    const query = z.object({
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      adquirente: z.string().optional(),
      estabelecimentoId: z.string().optional(),
      apenasDivergentes: z.enum(['true', 'false']).default('false'),
    }).parse(request.query)

    const payload = (request as any).user

    // Busca contratos ativos da empresa
    const contratos = await prisma.contratoTaxa.findMany({
      where: { empresaId: payload.empresaId, ativo: true },
      include: { itens: true },
    })

    // Busca repasses com filtros
    const where: any = {
      estabelecimento: { empresaId: payload.empresaId },
      taxaMdr: { gt: 0 },
    }
    if (query.dataInicio) where.dataVenda = { gte: new Date(query.dataInicio) }
    if (query.dataFim) where.dataVenda = { ...where.dataVenda, lte: new Date(query.dataFim) }
    if (query.adquirente) where.adquirente = query.adquirente
    if (query.estabelecimentoId) where.estabelecimentoId = query.estabelecimentoId

    const repasses = await prisma.repasse.findMany({
      where,
      include: { estabelecimento: true },
      orderBy: { dataVenda: 'desc' },
    })

    // Para cada repasse, encontra a taxa contratada
    type LinhaAuditoria = {
      repasseId: string
      nsu: string
      dataVenda: Date
      adquirente: string
      estabelecimentoId: string
      estabelecimentoNome: string
      modalidade: string
      bandeira: string
      parcela: number
      totalParcelas: number
      valorBruto: number
      taxaPraticada: number      // decimal, ex: 0.0318
      taxaContratada: number | null
      divergencia: number        // em pontos percentuais
      valorDivergencia: number   // em centavos
      temContrato: boolean
    }

    const linhas: LinhaAuditoria[] = []

    for (const r of repasses) {
      const contrato = contratos.find(c => c.adquirente === r.adquirente)
      const taxaPraticada = Number(r.taxaMdr)

      let taxaContratada: number | null = null

      if (contrato) {
        // Encontra o item mais específico: modalidade + bandeira + parcelas
        const candidatos = contrato.itens.filter(item =>
          item.modalidade === r.modalidade &&
          (item.bandeira == null || item.bandeira === r.bandeira) &&
          (item.parcelas == null || item.parcelas === r.totalParcelas)
        )
        // Ordena do mais específico (com bandeira e parcelas) para o mais genérico
        candidatos.sort((a, b) => {
          const scoreA = (a.bandeira ? 2 : 0) + (a.parcelas ? 1 : 0)
          const scoreB = (b.bandeira ? 2 : 0) + (b.parcelas ? 1 : 0)
          return scoreB - scoreA
        })
        if (candidatos[0]) taxaContratada = Number(candidatos[0].taxa) / 100
      }

      const divergencia = taxaContratada !== null
        ? taxaPraticada - taxaContratada
        : 0

      const valorBruto = Number(r.valorBruto)
      const valorDivergencia = Math.round(divergencia * valorBruto)

      if (query.apenasDivergentes === 'true' && Math.abs(valorDivergencia) <= 1) continue

      linhas.push({
        repasseId: r.id,
        nsu: r.nsu,
        dataVenda: r.dataVenda,
        adquirente: r.adquirente,
        estabelecimentoId: r.estabelecimentoId,
        estabelecimentoNome: r.estabelecimento.nome,
        modalidade: r.modalidade,
        bandeira: r.bandeira,
        parcela: r.parcela,
        totalParcelas: r.totalParcelas,
        valorBruto,
        taxaPraticada,
        taxaContratada: taxaContratada !== null ? taxaContratada : null,
        divergencia: taxaContratada !== null ? divergencia : 0,
        valorDivergencia: taxaContratada !== null ? valorDivergencia : 0,
        temContrato: taxaContratada !== null,
      })
    }

    // Agrupa: adquirente → estabelecimento → produto (modalidade+bandeira)
    const agrupado: Record<string, {
      adquirente: string
      totalBruto: number
      totalComissao: number
      totalDivergencia: number
      qtdeVendas: number
      estabelecimentos: Record<string, {
        id: string
        nome: string
        totalBruto: number
        totalComissao: number
        totalDivergencia: number
        qtdeVendas: number
        produtos: Record<string, {
          modalidade: string
          bandeira: string
          taxaContratada: number | null
          totalBruto: number
          totalComissao: number
          totalDivergencia: number
          qtdeVendas: number
          transacoes: typeof linhas
        }>
      }>
    }> = {}

    for (const l of linhas) {
      if (!agrupado[l.adquirente]) {
        agrupado[l.adquirente] = {
          adquirente: l.adquirente,
          totalBruto: 0, totalComissao: 0, totalDivergencia: 0, qtdeVendas: 0,
          estabelecimentos: {},
        }
      }
      const adq = agrupado[l.adquirente]
      adq.totalBruto += l.valorBruto
      adq.totalComissao += l.taxaPraticada * l.valorBruto
      adq.totalDivergencia += l.valorDivergencia
      adq.qtdeVendas++

      if (!adq.estabelecimentos[l.estabelecimentoId]) {
        adq.estabelecimentos[l.estabelecimentoId] = {
          id: l.estabelecimentoId, nome: l.estabelecimentoNome,
          totalBruto: 0, totalComissao: 0, totalDivergencia: 0, qtdeVendas: 0,
          produtos: {},
        }
      }
      const estab = adq.estabelecimentos[l.estabelecimentoId]
      estab.totalBruto += l.valorBruto
      estab.totalComissao += l.taxaPraticada * l.valorBruto
      estab.totalDivergencia += l.valorDivergencia
      estab.qtdeVendas++

      const prodKey = `${l.modalidade}|${l.bandeira}`
      if (!estab.produtos[prodKey]) {
        estab.produtos[prodKey] = {
          modalidade: l.modalidade, bandeira: l.bandeira,
          taxaContratada: l.taxaContratada,
          totalBruto: 0, totalComissao: 0, totalDivergencia: 0, qtdeVendas: 0,
          transacoes: [],
        }
      }
      const prod = estab.produtos[prodKey]
      prod.totalBruto += l.valorBruto
      prod.totalComissao += l.taxaPraticada * l.valorBruto
      prod.totalDivergencia += l.valorDivergencia
      prod.qtdeVendas++
      prod.transacoes.push(l)
    }

    // Totais globais
    const totalBruto = linhas.reduce((s, l) => s + l.valorBruto, 0)
    const totalComissao = linhas.reduce((s, l) => s + l.taxaPraticada * l.valorBruto, 0)
    const totalDivergencia = linhas.reduce((s, l) => s + l.valorDivergencia, 0)
    const qtdeVendas = linhas.length

    return {
      totalBruto: Math.round(totalBruto),
      totalComissao: Math.round(totalComissao),
      totalDivergencia: Math.round(totalDivergencia),
      qtdeVendas,
      adquirentes: Object.values(agrupado).map(adq => ({
        ...adq,
        totalBruto: Math.round(adq.totalBruto),
        totalComissao: Math.round(adq.totalComissao),
        totalDivergencia: Math.round(adq.totalDivergencia),
        estabelecimentos: Object.values(adq.estabelecimentos).map(estab => ({
          ...estab,
          totalBruto: Math.round(estab.totalBruto),
          totalComissao: Math.round(estab.totalComissao),
          totalDivergencia: Math.round(estab.totalDivergencia),
          produtos: Object.values(estab.produtos).map(prod => ({
            ...prod,
            totalBruto: Math.round(prod.totalBruto),
            totalComissao: Math.round(prod.totalComissao),
            totalDivergencia: Math.round(prod.totalDivergencia),
          })),
        })),
      })),
    }
  })
}
