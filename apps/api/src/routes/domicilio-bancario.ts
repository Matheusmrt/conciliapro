import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'

export async function rotasDomicilioBancario(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Lista contas bancárias
  app.get('/', { ...opts }, async (request) => {
    const payload = (request as any).user
    const { estabelecimentoId } = z.object({ estabelecimentoId: z.string().optional() }).parse(request.query)

    const where: any = { estabelecimento: { empresaId: payload.empresaId } }
    if (estabelecimentoId) where.estabelecimentoId = estabelecimentoId

    return prisma.contaBancaria.findMany({ where, orderBy: { banco: 'asc' } })
  })

  // Cria conta bancária
  app.post('/', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const dados = z.object({
      estabelecimentoId: z.string(),
      banco: z.string(),
      codigoBanco: z.string().optional(),
      agencia: z.string(),
      conta: z.string(),
      tipoConta: z.enum(['CORRENTE', 'POUPANCA', 'PAGAMENTO']).default('CORRENTE'),
      titular: z.string(),
    }).parse(request.body)

    // Verifica que o estabelecimento pertence à empresa
    const estab = await prisma.estabelecimento.findFirst({
      where: { id: dados.estabelecimentoId, empresaId: payload.empresaId },
    })
    if (!estab) return reply.code(403).send({ erro: 'Estabelecimento não encontrado' })

    return reply.code(201).send(await prisma.contaBancaria.create({ data: dados }))
  })

  // Atualiza
  app.patch('/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user
    const dados = z.object({
      banco: z.string().optional(),
      agencia: z.string().optional(),
      conta: z.string().optional(),
      tipoConta: z.enum(['CORRENTE', 'POUPANCA', 'PAGAMENTO']).optional(),
      titular: z.string().optional(),
      ativo: z.boolean().optional(),
    }).parse(request.body)

    const existe = await prisma.contaBancaria.findFirst({
      where: { id, estabelecimento: { empresaId: payload.empresaId } },
    })
    if (!existe) return reply.code(404).send({ erro: 'Não encontrado' })

    return prisma.contaBancaria.update({ where: { id }, data: dados })
  })

  // Remove
  app.delete('/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user

    const existe = await prisma.contaBancaria.findFirst({
      where: { id, estabelecimento: { empresaId: payload.empresaId } },
    })
    if (!existe) return reply.code(404).send({ erro: 'Não encontrado' })

    await prisma.contaBancaria.delete({ where: { id } })
    return reply.code(204).send()
  })

  // Conciliação domicílio — verifica repasses vs lançamentos bancários por data
  app.get('/conferir', { ...opts }, async (request) => {
    const payload = (request as any).user
    const { dataInicio, dataFim, estabelecimentoId } = z.object({
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      estabelecimentoId: z.string().optional(),
    }).parse(request.query)

    const inicio = dataInicio ? new Date(dataInicio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const fim = dataFim ? new Date(dataFim) : new Date()

    const where: any = {
      estabelecimento: { empresaId: payload.empresaId },
      dataPagamento: { gte: inicio, lte: fim },
    }
    if (estabelecimentoId) where.estabelecimentoId = estabelecimentoId

    const [repasses, lancamentos] = await Promise.all([
      prisma.repasse.groupBy({
        by: ['dataPagamento', 'adquirente'],
        where,
        _sum: { valorLiquido: true },
        _count: true,
      }),
      prisma.lancamentoBancario.findMany({
        where: {
          estabelecimento: { empresaId: payload.empresaId },
          data: { gte: inicio, lte: fim },
          tipo: 'CREDITO',
          ...(estabelecimentoId ? { estabelecimentoId } : {}),
        },
        select: { data: true, valor: true, descricao: true, status: true },
      }),
    ])

    const totalRepasses = repasses.reduce((s, r) => s + Number(r._sum.valorLiquido ?? 0), 0)
    const totalLancamentos = lancamentos.reduce((s, l) => s + Number(l.valor), 0)

    return {
      periodo: { inicio, fim },
      totalEsperado: totalRepasses,
      totalRecebido: totalLancamentos,
      diferenca: totalLancamentos - totalRepasses,
      repasses,
      lancamentos,
    }
  })
}
