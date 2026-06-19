import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'
import { HipcomClient } from '../lib/hipcom-client.js'

export async function rotasHipcom(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // ── GET /hipcom/config — retorna config da loja (sem senhas) ────────────────
  app.get('/config', { ...opts }, async (request) => {
    const { estabelecimentoId } = z.object({
      estabelecimentoId: z.string(),
    }).parse(request.query)

    const payload = (request as any).user
    const estab = await prisma.estabelecimento.findFirst({
      where: { id: estabelecimentoId, empresaId: payload.empresaId },
    })
    if (!estab) return { config: null }

    const config = await prisma.hipcomConfig.findUnique({
      where: { estabelecimentoId },
    })
    if (!config) return { config: null }

    return {
      config: {
        id: config.id,
        baseUrl: config.baseUrl,
        basicUser: config.basicUser,
        cnpj: config.cnpj,
        lojaId: config.lojaId,
        ativo: config.ativo,
        ultimaSincEm: config.ultimaSincEm,
      },
    }
  })

  // ── POST /hipcom/config — salva / atualiza configuração ─────────────────────
  app.post('/config', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const body = z.object({
      estabelecimentoId: z.string(),
      baseUrl: z.string().url(),
      basicUser: z.string().min(1),
      basicSenha: z.string().min(1),
      cnpj: z.string().min(14).max(18),
      senhaHipcom: z.string().min(1),
      lojaId: z.number().int().positive().default(1),
    }).parse(request.body)

    const estab = await prisma.estabelecimento.findFirst({
      where: { id: body.estabelecimentoId, empresaId: payload.empresaId },
    })
    if (!estab) return reply.code(404).send({ erro: 'Estabelecimento não encontrado' })

    const config = await prisma.hipcomConfig.upsert({
      where: { estabelecimentoId: body.estabelecimentoId },
      create: {
        baseUrl: body.baseUrl,
        basicUser: body.basicUser,
        basicSenha: body.basicSenha,
        cnpj: body.cnpj,
        senhaHipcom: body.senhaHipcom,
        lojaId: body.lojaId,
        estabelecimentoId: body.estabelecimentoId,
      },
      update: {
        baseUrl: body.baseUrl,
        basicUser: body.basicUser,
        basicSenha: body.basicSenha,
        cnpj: body.cnpj,
        senhaHipcom: body.senhaHipcom,
        lojaId: body.lojaId,
        ativo: true,
      },
    })

    return { ok: true, id: config.id }
  })

  // ── POST /hipcom/testar — testa conectividade com o servidor ────────────────
  app.post('/testar', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const { estabelecimentoId } = z.object({ estabelecimentoId: z.string() }).parse(request.body)

    const config = await prisma.hipcomConfig.findFirst({
      where: {
        estabelecimentoId,
        estabelecimento: { empresaId: payload.empresaId },
      },
    })
    if (!config) return reply.code(404).send({ erro: 'Configuração Hipcom não encontrada' })

    const client = new HipcomClient({
      baseUrl: config.baseUrl,
      basicUser: config.basicUser,
      basicSenha: config.basicSenha,
      cnpj: config.cnpj,
      senhaHipcom: config.senhaHipcom,
      lojaId: config.lojaId,
    })

    const resultado = await client.testarConexao()
    return resultado
  })

  // ── POST /hipcom/sincronizar — sincroniza vendas de um período ───────────────
  app.post('/sincronizar', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const body = z.object({
      estabelecimentoId: z.string(),
      dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(request.body)

    const config = await prisma.hipcomConfig.findFirst({
      where: {
        estabelecimentoId: body.estabelecimentoId,
        estabelecimento: { empresaId: payload.empresaId },
        ativo: true,
      },
    })
    if (!config) return reply.code(404).send({ erro: 'Configuração Hipcom não encontrada ou inativa' })

    const client = new HipcomClient({
      baseUrl: config.baseUrl,
      basicUser: config.basicUser,
      basicSenha: config.basicSenha,
      cnpj: config.cnpj,
      senhaHipcom: config.senhaHipcom,
      lojaId: config.lojaId,
    })

    // Itera cada dia no período
    const inicio = new Date(body.dataInicio)
    const fim = new Date(body.dataFim)
    let importados = 0
    let erros: string[] = []
    const cursor = new Date(inicio)

    while (cursor <= fim) {
      const data = cursor.toISOString().slice(0, 10)
      try {
        const cupons = await client.getCupons(data)

        for (const cupom of cupons) {
          const dataHora = new Date(cupom.datahora)
          await prisma.vendaHipcom.upsert({
            where: {
              numeroCupom_terminal_estabelecimentoId: {
                numeroCupom: cupom.numero,
                terminal: cupom.terminal,
                estabelecimentoId: body.estabelecimentoId,
              },
            },
            create: {
              numeroCupom: cupom.numero,
              terminal: cupom.terminal,
              dataHora,
              subtotal: cupom.subtotal,
              desconto: cupom.desconto ?? 0,
              acrescimo: cupom.acrescimo ?? 0,
              total: cupom.total,
              cpfCnpj: cupom.cpfcnpj ?? null,
              cancelado: cupom.cancelado ?? false,
              estabelecimentoId: body.estabelecimentoId,
              itens: {
                create: (cupom.itens ?? []).map((item) => ({
                  plu: item.plu ?? null,
                  ean: item.ean ?? null,
                  descricao: item.descricao,
                  quantidade: item.quantidade,
                  valorUnit: item.valor_unitario,
                  valorTotal: item.valor_total,
                })),
              },
              pagamentos: {
                create: (cupom.pagamento ?? []).map((p) => ({
                  meioPagamento: p.meio_pagamento,
                  valor: p.valor,
                  nsu: p.nsu != null ? String(p.nsu) : null,
                  bin: p.bin != null ? String(p.bin) : null,
                  host: p.host ?? null,
                })),
              },
            },
            update: {
              cancelado: cupom.cancelado ?? false,
              total: cupom.total,
              sincEm: new Date(),
            },
          })
          importados++
        }
      } catch (err: any) {
        erros.push(`${data}: ${err?.message}`)
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    // Atualiza timestamp da última sinc
    await prisma.hipcomConfig.update({
      where: { id: config.id },
      data: { ultimaSincEm: new Date() },
    })

    return { ok: true, importados, erros }
  })

  // ── GET /hipcom/vendas — lista vendas do PDV com filtros ────────────────────
  app.get('/vendas', { ...opts }, async (request) => {
    const payload = (request as any).user
    const query = z.object({
      estabelecimentoId: z.string().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      cancelado: z.enum(['true', 'false']).optional(),
      pagina: z.coerce.number().int().positive().default(1),
      limite: z.coerce.number().int().positive().max(200).default(50),
    }).parse(request.query)

    const where: any = {
      estabelecimento: { empresaId: payload.empresaId },
    }
    if (query.estabelecimentoId) where.estabelecimentoId = query.estabelecimentoId
    if (query.cancelado !== undefined) where.cancelado = query.cancelado === 'true'
    if (query.dataInicio || query.dataFim) {
      where.dataHora = {}
      if (query.dataInicio) where.dataHora.gte = new Date(query.dataInicio)
      if (query.dataFim) {
        const fim = new Date(query.dataFim)
        fim.setHours(23, 59, 59, 999)
        where.dataHora.lte = fim
      }
    }

    const [total, vendas] = await Promise.all([
      prisma.vendaHipcom.count({ where }),
      prisma.vendaHipcom.findMany({
        where,
        include: {
          itens: true,
          pagamentos: true,
          estabelecimento: { select: { nome: true } },
        },
        orderBy: { dataHora: 'desc' },
        skip: (query.pagina - 1) * query.limite,
        take: query.limite,
      }),
    ])

    const totalizador = await prisma.vendaHipcom.aggregate({
      where: { ...where, cancelado: false },
      _sum: { total: true },
      _count: true,
    })

    return {
      total,
      paginas: Math.ceil(total / query.limite),
      pagina: query.pagina,
      totalVendas: Number(totalizador._sum.total ?? 0),
      qtdeVendas: totalizador._count,
      vendas,
    }
  })

  // ── GET /hipcom/resumo — resumo diário de vendas por estabelecimento ─────────
  app.get('/resumo', { ...opts }, async (request) => {
    const payload = (request as any).user
    const query = z.object({
      estabelecimentoId: z.string().optional(),
      dataInicio: z.string(),
      dataFim: z.string(),
    }).parse(request.query)

    const where: any = {
      cancelado: false,
      estabelecimento: { empresaId: payload.empresaId },
      dataHora: {
        gte: new Date(query.dataInicio),
        lte: (() => { const d = new Date(query.dataFim); d.setHours(23,59,59,999); return d })(),
      },
    }
    if (query.estabelecimentoId) where.estabelecimentoId = query.estabelecimentoId

    const vendas = await prisma.vendaHipcom.findMany({
      where,
      select: { dataHora: true, total: true, estabelecimentoId: true },
      orderBy: { dataHora: 'asc' },
    })

    // Agrupa por dia
    const porDia: Record<string, { data: string; total: number; qtde: number }> = {}
    for (const v of vendas) {
      const dia = v.dataHora.toISOString().slice(0, 10)
      if (!porDia[dia]) porDia[dia] = { data: dia, total: 0, qtde: 0 }
      porDia[dia].total += Number(v.total)
      porDia[dia].qtde++
    }

    const round = (n: number) => Math.round(n * 100) / 100

    return {
      totalGeral: round(vendas.reduce((s: number, v: any) => s + Number(v.total), 0)),
      qtdeTotal: vendas.length,
      dias: Object.values(porDia).map(d => ({ ...d, total: round(d.total) })),
    }
  })
}
