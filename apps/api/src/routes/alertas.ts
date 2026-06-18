import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'
import { enviarEmail } from '../lib/mailer.js'

export async function rotasAlertas(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Lista regras
  app.get('/', { ...opts }, async (request) => {
    const payload = (request as any).user
    const regras = await prisma.alertaRegra.findMany({
      where: { empresaId: payload.empresaId },
      include: { _count: { select: { disparos: true } } },
      orderBy: { criadoEm: 'desc' },
    })
    return regras
  })

  // Cria regra
  app.post('/', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const dados = z.object({
      nome: z.string().min(3),
      tipo: z.enum(['TAXA_MDR_ALTA', 'DIVERGENCIA_NOVA', 'SEM_REPASSE_DIAS', 'TAXA_CONCILIACAO_BAIXA', 'VALOR_REPASSE_DIVERGENTE']),
      condicao: z.record(z.any()),
      emailNotif: z.string().email().optional(),
      ativo: z.boolean().default(true),
    }).parse(request.body)

    return reply.code(201).send(
      await prisma.alertaRegra.create({ data: { ...dados, empresaId: payload.empresaId } })
    )
  })

  // Atualiza regra
  app.patch('/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user
    const dados = z.object({
      nome: z.string().optional(),
      condicao: z.record(z.any()).optional(),
      emailNotif: z.string().email().optional(),
      ativo: z.boolean().optional(),
    }).parse(request.body)

    const existe = await prisma.alertaRegra.findFirst({ where: { id, empresaId: payload.empresaId } })
    if (!existe) return reply.code(404).send({ erro: 'Não encontrado' })
    return prisma.alertaRegra.update({ where: { id }, data: dados })
  })

  // Remove regra
  app.delete('/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user
    const existe = await prisma.alertaRegra.findFirst({ where: { id, empresaId: payload.empresaId } })
    if (!existe) return reply.code(404).send({ erro: 'Não encontrado' })
    await prisma.alertaRegra.delete({ where: { id } })
    return reply.code(204).send()
  })

  // Histórico de disparos
  app.get('/disparos', { ...opts }, async (request) => {
    const payload = (request as any).user
    return prisma.alertaDisparo.findMany({
      where: { regra: { empresaId: payload.empresaId } },
      include: { regra: { select: { nome: true, tipo: true } } },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    })
  })

  // Marcar todos os disparos como lidos
  app.patch('/disparos/marcar-lidas', { ...opts }, async (request) => {
    const payload = (request as any).user
    await prisma.alertaDisparo.updateMany({
      where: { regra: { empresaId: payload.empresaId }, lido: false },
      data:  { lido: true },
    })
    return { ok: true }
  })

  // Verificar alertas manualmente
  app.post('/verificar', { ...opts }, async (request) => {
    const payload = (request as any).user
    const empresa = await prisma.empresa.findUnique({ where: { id: payload.empresaId } })
    const regras = await prisma.alertaRegra.findMany({ where: { empresaId: payload.empresaId, ativo: true } })

    const disparados: any[] = []

    for (const regra of regras) {
      const cond = regra.condicao as any
      let disparar = false
      let mensagem = ''
      let valorAtual: number | null = null

      if (regra.tipo === 'TAXA_MDR_ALTA') {
        // Verifica se taxa média MDR dos últimos 30 dias está acima do limite
        const limite = cond.valor ?? 0.03
        const adqWhere = cond.adquirente ? { adquirente: cond.adquirente } : {}
        const agg = await prisma.repasse.aggregate({
          where: { estabelecimento: { empresaId: payload.empresaId }, ...adqWhere,
            dataPagamento: { gte: new Date(Date.now() - 30 * 86400000) } },
          _avg: { taxaMdr: true },
        })
        valorAtual = Number(agg._avg.taxaMdr ?? 0)
        if (valorAtual > limite) {
          disparar = true
          mensagem = `Taxa MDR média ${(valorAtual * 100).toFixed(2)}% está acima do limite configurado de ${(limite * 100).toFixed(2)}%`
        }
      }

      if (regra.tipo === 'TAXA_CONCILIACAO_BAIXA') {
        const limite = cond.valor ?? 0.8
        const [total, conciliadas] = await Promise.all([
          prisma.venda.count({ where: { estabelecimento: { empresaId: payload.empresaId } } }),
          prisma.conciliacao.count({ where: { estabelecimento: { empresaId: payload.empresaId }, status: 'CONCILIADA' } }),
        ])
        valorAtual = total > 0 ? conciliadas / total : 0
        if (valorAtual < limite) {
          disparar = true
          mensagem = `Taxa de conciliação ${(valorAtual * 100).toFixed(1)}% está abaixo do mínimo configurado de ${(limite * 100).toFixed(1)}%`
        }
      }

      if (regra.tipo === 'DIVERGENCIA_NOVA') {
        const desde = new Date(Date.now() - (cond.horas ?? 24) * 3600000)
        const qtde = await prisma.divergencia.count({
          where: { estabelecimento: { empresaId: payload.empresaId }, resolvida: false, criadoEm: { gte: desde } },
        })
        valorAtual = qtde
        if (qtde >= (cond.minimo ?? 1)) {
          disparar = true
          mensagem = `${qtde} nova(s) divergência(s) nas últimas ${cond.horas ?? 24}h`
        }
      }

      if (disparar) {
        const disparo = await prisma.alertaDisparo.create({
          data: { regraId: regra.id, mensagem, valorAtual: valorAtual ?? undefined },
        })
        disparados.push({ regra: regra.nome, mensagem })

        // Envia e-mail se configurado
        const emailDestino = regra.emailNotif ?? empresa?.email
        if (emailDestino) {
          await enviarEmail(
            emailDestino,
            `⚠ ConciliaPro — Alerta: ${regra.nome}`,
            `<p style="font-family:system-ui"><strong>${regra.nome}</strong><br>${mensagem}</p>`
          ).catch(() => null)
          await prisma.alertaDisparo.update({ where: { id: disparo.id }, data: { emailEnviado: true } })
        }
      }
    }

    return { verificadas: regras.length, disparadas: disparados.length, disparados }
  })
}
