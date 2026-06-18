import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'

export async function rotasAntecipacao(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Busca repasses futuros para simular antecipação
  app.get('/repasses-futuros', { ...opts }, async (request) => {
    const payload = (request as any).user
    const { adquirente, horizonte } = z.object({
      adquirente: z.string().optional(),
      horizonte: z.coerce.number().default(90),
    }).parse(request.query)

    const hoje = new Date()
    const fim = new Date()
    fim.setDate(fim.getDate() + horizonte)

    const where: any = {
      estabelecimento: { empresaId: payload.empresaId },
      dataPagamento: { gt: hoje, lte: fim },
    }
    if (adquirente) where.adquirente = adquirente

    const repasses = await prisma.repasse.findMany({
      where,
      select: {
        id: true, dataPagamento: true, valorLiquido: true,
        valorBruto: true, adquirente: true, bandeira: true,
        modalidade: true, parcela: true, totalParcelas: true,
      },
      orderBy: { dataPagamento: 'asc' },
    })

    // Agrupa por adquirente
    const porAdquirente: Record<string, { total: number; qtde: number; repasses: any[] }> = {}
    for (const r of repasses) {
      if (!porAdquirente[r.adquirente]) porAdquirente[r.adquirente] = { total: 0, qtde: 0, repasses: [] }
      porAdquirente[r.adquirente].total += Number(r.valorLiquido)
      porAdquirente[r.adquirente].qtde++
      porAdquirente[r.adquirente].repasses.push(r)
    }

    return {
      totalGeral: repasses.reduce((s, r) => s + Number(r.valorLiquido), 0),
      qtdeTotal: repasses.length,
      horizonte,
      porAdquirente,
    }
  })

  // Simula custo de antecipação
  app.post('/simular', { ...opts }, async (request) => {
    const payload = (request as any).user
    const { taxaDiaria, adquirente, horizonte } = z.object({
      taxaDiaria: z.number().min(0).max(1),   // ex: 0.0012 = 0.12% ao dia
      adquirente: z.string().optional(),
      horizonte: z.number().default(90),
    }).parse(request.body)

    const hoje = new Date()
    const fim = new Date()
    fim.setDate(fim.getDate() + horizonte)

    const where: any = {
      estabelecimento: { empresaId: payload.empresaId },
      dataPagamento: { gt: hoje, lte: fim },
    }
    if (adquirente) where.adquirente = adquirente

    const repasses = await prisma.repasse.findMany({
      where,
      select: { dataPagamento: true, valorLiquido: true, adquirente: true },
    })

    let custoTotal = 0
    const detalhes = repasses.map(r => {
      const dias = Math.ceil((new Date(r.dataPagamento).getTime() - hoje.getTime()) / 86400000)
      const valor = Number(r.valorLiquido)
      const custo = valor * taxaDiaria * dias
      const liquido = valor - custo
      custoTotal += custo
      return { dataPagamento: r.dataPagamento, adquirente: r.adquirente, valorBruto: valor, custo, liquido, dias }
    })

    const valorBrutoTotal = repasses.reduce((s, r) => s + Number(r.valorLiquido), 0)

    return {
      taxaDiaria,
      horizonte,
      valorBrutoTotal,
      custoTotal,
      valorLiquidoTotal: valorBrutoTotal - custoTotal,
      percentualCusto: valorBrutoTotal > 0 ? (custoTotal / valorBrutoTotal) * 100 : 0,
      qtde: repasses.length,
      detalhes,
    }
  })

  // Salva uma antecipação realizada
  app.post('/', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const dados = z.object({
      valorBruto: z.number(),
      taxaAntecipacao: z.number(),
      custoTotal: z.number(),
      valorLiquido: z.number(),
      diasAntecipados: z.number(),
      adquirente: z.string().optional(),
      status: z.enum(['SIMULACAO', 'SOLICITADA', 'APROVADA', 'LIQUIDADA', 'CANCELADA']).default('SOLICITADA'),
      observacao: z.string().optional(),
    }).parse(request.body)

    const ant = await prisma.antecipacao.create({
      data: { ...dados, empresaId: payload.empresaId },
    })
    return reply.code(201).send(ant)
  })

  // Lista antecipações
  app.get('/', { ...opts }, async (request) => {
    const payload = (request as any).user
    return prisma.antecipacao.findMany({
      where: { empresaId: payload.empresaId },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    })
  })

  // Atualiza status
  app.patch('/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user
    const { status, observacao } = z.object({
      status: z.enum(['SIMULACAO', 'SOLICITADA', 'APROVADA', 'LIQUIDADA', 'CANCELADA']),
      observacao: z.string().optional(),
    }).parse(request.body)

    const existe = await prisma.antecipacao.findFirst({ where: { id, empresaId: payload.empresaId } })
    if (!existe) return reply.code(404).send({ erro: 'Não encontrado' })

    return prisma.antecipacao.update({ where: { id }, data: { status, observacao, dataRealizada: status === 'LIQUIDADA' ? new Date() : undefined } })
  })
}
