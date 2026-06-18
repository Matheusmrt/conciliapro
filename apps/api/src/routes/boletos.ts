import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'

export async function rotasBoletos(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  app.get('/', { ...opts }, async (request) => {
    const payload = (request as any).user
    const { estabelecimentoId, status, dataInicio, dataFim } = z.object({
      estabelecimentoId: z.string().optional(),
      status: z.string().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }).parse(request.query)

    const where: any = { estabelecimento: { empresaId: payload.empresaId } }
    if (estabelecimentoId) where.estabelecimentoId = estabelecimentoId
    if (status) where.status = status
    if (dataInicio || dataFim) {
      where.dataVencimento = {}
      if (dataInicio) where.dataVencimento.gte = new Date(dataInicio)
      if (dataFim) where.dataVencimento.lte = new Date(dataFim)
    }

    const [boletos, totais] = await Promise.all([
      prisma.boleto.findMany({ where, orderBy: { dataVencimento: 'asc' }, take: 200 }),
      prisma.boleto.groupBy({
        by: ['status'],
        where,
        _sum: { valor: true },
        _count: true,
      }),
    ])

    const kpis = { EMITIDO: 0, PAGO: 0, VENCIDO: 0, CANCELADO: 0 }
    for (const t of totais) { (kpis as any)[t.status] = Number(t._sum.valor ?? 0) }

    return { boletos, kpis, total: boletos.length }
  })

  app.post('/', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const dados = z.object({
      estabelecimentoId: z.string(),
      nossoNumero: z.string(),
      dataEmissao: z.string(),
      dataVencimento: z.string(),
      valor: z.number(),
      pagador: z.string().optional(),
      banco: z.string().optional(),
    }).parse(request.body)

    const estab = await prisma.estabelecimento.findFirst({ where: { id: dados.estabelecimentoId, empresaId: payload.empresaId } })
    if (!estab) return reply.code(403).send({ erro: 'Estabelecimento não encontrado' })

    return reply.code(201).send(await prisma.boleto.create({
      data: {
        ...dados,
        dataEmissao: new Date(dados.dataEmissao),
        dataVencimento: new Date(dados.dataVencimento),
        valor: dados.valor,
      },
    }))
  })

  app.patch('/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user
    const dados = z.object({
      status: z.enum(['EMITIDO', 'PAGO', 'VENCIDO', 'CANCELADO']).optional(),
      dataPagamento: z.string().optional(),
      valorPago: z.number().optional(),
    }).parse(request.body)

    const existe = await prisma.boleto.findFirst({ where: { id, estabelecimento: { empresaId: payload.empresaId } } })
    if (!existe) return reply.code(404).send({ erro: 'Não encontrado' })

    return prisma.boleto.update({
      where: { id },
      data: { ...dados, dataPagamento: dados.dataPagamento ? new Date(dados.dataPagamento) : undefined },
    })
  })

  app.delete('/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user
    const existe = await prisma.boleto.findFirst({ where: { id, estabelecimento: { empresaId: payload.empresaId } } })
    if (!existe) return reply.code(404).send({ erro: 'Não encontrado' })
    await prisma.boleto.delete({ where: { id } })
    return reply.code(204).send()
  })
}
