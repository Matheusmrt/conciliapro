import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { conciliarEstabelecimento } from '@conciliacao/conciliador'
import { z } from 'zod'

export async function rotasConciliacao(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Listar conciliações com filtros
  app.get('/', { ...opts }, async (request) => {
    const query = z.object({
      estabelecimentoId: z.string().optional(),
      status: z.string().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      page: z.coerce.number().default(1),
      limit: z.coerce.number().default(50),
    }).parse(request.query)

    const where: any = {}
    if (query.estabelecimentoId) where.estabelecimentoId = query.estabelecimentoId
    if (query.status) where.status = query.status

    const [total, conciliacoes] = await Promise.all([
      prisma.conciliacao.count({ where }),
      prisma.conciliacao.findMany({
        where,
        include: {
          venda: true,
          repasse: true,
          divergencias: true,
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { conciliadoEm: 'desc' },
      }),
    ])

    return { total, pagina: query.page, dados: conciliacoes }
  })

  // Executar conciliação manualmente
  app.post('/executar/:estabelecimentoId', { ...opts }, async (request, reply) => {
    const { estabelecimentoId } = z.object({
      estabelecimentoId: z.string(),
    }).parse(request.params)

    const resultado = await conciliarEstabelecimento(estabelecimentoId)
    return { mensagem: 'Conciliação executada', resultado }
  })

  // Buscar divergências
  app.get('/divergencias', { ...opts }, async (request) => {
    const query = z.object({
      estabelecimentoId: z.string().optional(),
      resolvida: z.enum(['true', 'false']).optional(),
      tipo: z.string().optional(),
      page: z.coerce.number().default(1),
      limit: z.coerce.number().default(50),
    }).parse(request.query)

    const where: any = {}
    if (query.estabelecimentoId) where.estabelecimentoId = query.estabelecimentoId
    if (query.resolvida !== undefined) where.resolvida = query.resolvida === 'true'
    else where.resolvida = false
    if (query.tipo) where.tipo = query.tipo

    const [total, divergencias] = await Promise.all([
      prisma.divergencia.count({ where }),
      prisma.divergencia.findMany({
        where,
        include: { conciliacao: { include: { venda: true, repasse: true } } },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { criadoEm: 'desc' },
      }),
    ])

    return { total, pagina: query.page, dados: divergencias }
  })

  // Resolver divergência
  app.patch('/divergencias/:id/resolver', { ...opts }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user
    const body = z.object({
      motivo: z.string().min(1),
      observacao: z.string().optional(),
    }).parse(request.body)
    const divergencia = await prisma.divergencia.update({
      where: { id },
      data: {
        resolvida: true,
        motivoResolucao: body.motivo,
        observacaoResolucao: body.observacao ?? null,
        resolvidaEm: new Date(),
        resolvidaPor: payload.nome ?? payload.email ?? payload.sub,
      },
    })
    return divergencia
  })
}
