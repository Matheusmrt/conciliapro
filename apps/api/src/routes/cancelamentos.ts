import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'

export async function rotasCancelamentos(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Listar cancelamentos com KPIs
  app.get('/', { ...opts }, async (request) => {
    const query = z.object({
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      adquirente: z.string().optional(),
      estabelecimentoId: z.string().optional(),
      tipo: z.string().optional(),
      status: z.string().optional(),
    }).parse(request.query)

    const payload = (request as any).user

    const where: any = {
      estabelecimento: { empresaId: payload.empresaId },
    }
    if (query.dataInicio) where.dataCancelamento = { gte: new Date(query.dataInicio) }
    if (query.dataFim) where.dataCancelamento = { ...where.dataCancelamento, lte: new Date(query.dataFim) }
    if (query.adquirente) where.adquirente = query.adquirente
    if (query.estabelecimentoId) where.estabelecimentoId = query.estabelecimentoId
    if (query.tipo) where.tipo = query.tipo
    if (query.status) where.status = query.status

    const itens = await prisma.cancelamento.findMany({
      where,
      include: { estabelecimento: true },
      orderBy: { dataCancelamento: 'desc' },
    })

    const totalValor = itens.reduce((s, c) => s + Number(c.valorBruto), 0)
    const porStatus = itens.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1
      return acc
    }, {})
    const porTipo = itens.reduce<Record<string, number>>((acc, c) => {
      acc[c.tipo] = (acc[c.tipo] ?? 0) + 1
      return acc
    }, {})

    return {
      totalValor: Math.round(totalValor),
      qtde: itens.length,
      pendentes: porStatus['PENDENTE_ESTORNO'] ?? 0,
      chargebacks: porTipo['CHARGEBACK'] ?? 0,
      porStatus,
      porTipo,
      itens,
    }
  })

  // Criar cancelamento manualmente
  app.post('/', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const dados = z.object({
      nsu: z.string(),
      tid: z.string().optional(),
      dataVenda: z.string(),
      dataCancelamento: z.string(),
      adquirente: z.string(),
      bandeira: z.string(),
      modalidade: z.string(),
      valorBruto: z.number(),
      tipo: z.string().default('CANCELAMENTO_CLIENTE'),
      status: z.string().default('DETECTADO'),
      motivoDescricao: z.string().optional(),
      estabelecimentoId: z.string(),
    }).parse(request.body)

    // Verifica se o estabelecimento pertence à empresa
    const estab = await prisma.estabelecimento.findFirst({
      where: { id: dados.estabelecimentoId, empresaId: payload.empresaId },
    })
    if (!estab) return reply.code(404).send({ erro: 'Estabelecimento não encontrado' })

    const item = await prisma.cancelamento.create({
      data: {
        nsu: dados.nsu,
        tid: dados.tid,
        dataVenda: new Date(dados.dataVenda),
        dataCancelamento: new Date(dados.dataCancelamento),
        adquirente: dados.adquirente as any,
        bandeira: dados.bandeira as any,
        modalidade: dados.modalidade as any,
        valorBruto: dados.valorBruto,
        tipo: dados.tipo as any,
        status: dados.status as any,
        motivoDescricao: dados.motivoDescricao,
        estabelecimentoId: dados.estabelecimentoId,
      },
      include: { estabelecimento: true },
    })

    return reply.code(201).send(item)
  })

  // Atualizar status
  app.patch('/:id/status', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { status, motivoDescricao } = z.object({
      status: z.enum(['DETECTADO', 'ESTORNADO', 'PENDENTE_ESTORNO', 'CONTESTADO']),
      motivoDescricao: z.string().optional(),
    }).parse(request.body)
    const payload = (request as any).user

    const existe = await prisma.cancelamento.findFirst({
      where: { id, estabelecimento: { empresaId: payload.empresaId } },
    })
    if (!existe) return reply.code(404).send({ erro: 'Não encontrado' })

    return prisma.cancelamento.update({
      where: { id },
      data: { status, motivoDescricao },
    })
  })

  // Deletar
  app.delete('/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user

    const existe = await prisma.cancelamento.findFirst({
      where: { id, estabelecimento: { empresaId: payload.empresaId } },
    })
    if (!existe) return reply.code(404).send({ erro: 'Não encontrado' })

    await prisma.cancelamento.delete({ where: { id } })
    return reply.code(204).send()
  })
}
