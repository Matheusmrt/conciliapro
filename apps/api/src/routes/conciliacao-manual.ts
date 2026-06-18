import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'

export async function rotasConciliacaoManual(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Vendas sem repasse
  app.get('/vendas-pendentes', { ...opts }, async (request) => {
    const query = z.object({
      estabelecimentoId: z.string().optional(),
      adquirente: z.string().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }).parse(request.query)

    const payload = (request as any).user

    const where: any = {
      estabelecimento: { empresaId: payload.empresaId },
      status: { in: ['PENDENTE', 'NAO_ENCONTRADA'] },
      conciliacao: null,
    }
    if (query.estabelecimentoId) where.estabelecimentoId = query.estabelecimentoId
    if (query.adquirente) where.adquirente = query.adquirente
    if (query.dataInicio) where.dataVenda = { gte: new Date(query.dataInicio) }
    if (query.dataFim) where.dataVenda = { ...where.dataVenda, lte: new Date(query.dataFim) }

    return prisma.venda.findMany({
      where,
      include: { estabelecimento: true },
      orderBy: { dataVenda: 'desc' },
      take: 100,
    })
  })

  // Repasses sem venda (não conciliados)
  app.get('/repasses-pendentes', { ...opts }, async (request) => {
    const query = z.object({
      estabelecimentoId: z.string().optional(),
      adquirente: z.string().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }).parse(request.query)

    const payload = (request as any).user

    const where: any = {
      estabelecimento: { empresaId: payload.empresaId },
      conciliacao: null,
    }
    if (query.estabelecimentoId) where.estabelecimentoId = query.estabelecimentoId
    if (query.adquirente) where.adquirente = query.adquirente
    if (query.dataInicio) where.dataVenda = { gte: new Date(query.dataInicio) }
    if (query.dataFim) where.dataVenda = { ...where.dataVenda, lte: new Date(query.dataFim) }

    return prisma.repasse.findMany({
      where,
      include: { estabelecimento: true },
      orderBy: { dataVenda: 'desc' },
      take: 100,
    })
  })

  // Conciliar manualmente: vincula venda a repasse
  app.post('/conciliar', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const dados = z.object({
      vendaId: z.string().optional(),
      repasseId: z.string().optional(),
      observacao: z.string().optional(),
    }).parse(request.body)

    if (!dados.vendaId && !dados.repasseId) {
      return reply.code(400).send({ erro: 'Informe vendaId e/ou repasseId' })
    }

    let venda = null
    let repasse = null

    if (dados.vendaId) {
      venda = await prisma.venda.findFirst({
        where: { id: dados.vendaId, estabelecimento: { empresaId: payload.empresaId } },
      })
      if (!venda) return reply.code(404).send({ erro: 'Venda não encontrada' })
      if (await prisma.conciliacao.findUnique({ where: { vendaId: dados.vendaId } })) {
        return reply.code(409).send({ erro: 'Venda já conciliada' })
      }
    }

    if (dados.repasseId) {
      repasse = await prisma.repasse.findFirst({
        where: { id: dados.repasseId, estabelecimento: { empresaId: payload.empresaId } },
      })
      if (!repasse) return reply.code(404).send({ erro: 'Repasse não encontrado' })
      if (await prisma.conciliacao.findUnique({ where: { repasseId: dados.repasseId } })) {
        return reply.code(409).send({ erro: 'Repasse já conciliado' })
      }
    }

    const estabelecimentoId = venda?.estabelecimentoId ?? repasse!.estabelecimentoId

    // Calcula diferença se tiver os dois
    let diferencaValor = null
    if (venda && repasse) {
      diferencaValor = Number(repasse.valorBruto) - Number(venda.valor)
    }

    const conciliacao = await prisma.conciliacao.create({
      data: {
        status: 'CONCILIADA',
        diferencaValor,
        observacao: dados.observacao ?? 'Conciliação manual',
        vendaId: dados.vendaId,
        repasseId: dados.repasseId,
        estabelecimentoId,
      },
    })

    // Atualiza status da venda
    if (venda) {
      await prisma.venda.update({
        where: { id: venda.id },
        data: { status: 'CONCILIADA' },
      })
    }

    return reply.code(201).send(conciliacao)
  })

  // Desfazer conciliação manual
  app.delete('/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user

    const conc = await prisma.conciliacao.findFirst({
      where: { id, estabelecimento: { empresaId: payload.empresaId } },
    })
    if (!conc) return reply.code(404).send({ erro: 'Conciliação não encontrada' })

    // Restaura status da venda
    if (conc.vendaId) {
      await prisma.venda.update({ where: { id: conc.vendaId }, data: { status: 'PENDENTE' } })
    }

    await prisma.conciliacao.delete({ where: { id } })
    return reply.code(204).send()
  })
}
