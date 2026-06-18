import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'
import { enviarEmail, htmlAlertaDivergencias, htmlRelatorioDiario } from '../lib/mailer.js'

export async function rotasNotificacoes(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Retorna config SMTP do .env (sem expor senhas)
  app.get('/config', { ...opts }, async () => {
    return {
      smtpHost: process.env.SMTP_HOST ?? '',
      smtpPort: process.env.SMTP_PORT ?? '587',
      smtpUser: process.env.SMTP_USER ?? '',
      smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    }
  })

  // Enviar alerta de divergências manualmente
  app.post('/alertar-divergencias', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const { para } = z.object({ para: z.string().email().optional() }).parse(request.body)

    const empresa = await prisma.empresa.findUnique({
      where: { id: payload.empresaId },
      select: { nome: true, email: true },
    })
    if (!empresa) return reply.code(404).send({ erro: 'Empresa não encontrada' })

    const divergencias = await prisma.divergencia.findMany({
      where: { estabelecimento: { empresaId: payload.empresaId }, resolvida: false },
      include: { estabelecimento: true },
      take: 20,
      orderBy: { criadoEm: 'desc' },
    })

    if (divergencias.length === 0) {
      return { enviado: false, motivo: 'Nenhuma divergência em aberto' }
    }

    const destino = para ?? empresa.email
    const html = htmlAlertaDivergencias(empresa.nome, divergencias.map(d => ({
      tipo: d.tipo,
      adquirente: d.estabelecimento?.nome,
      valorImpacto: d.valorImpacto,
    })))

    const result = await enviarEmail(
      destino,
      `⚠ ConciliaPro — ${divergencias.length} divergência(s) em aberto`,
      html
    )

    return { enviado: result.ok, destino, qtde: divergencias.length, motivo: result.motivo }
  })

  // Enviar relatório diário manualmente
  app.post('/relatorio-diario', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const { para } = z.object({ para: z.string().email().optional() }).parse(request.body)

    const empresa = await prisma.empresa.findUnique({
      where: { id: payload.empresaId },
      select: { nome: true, email: true },
    })
    if (!empresa) return reply.code(404).send({ erro: 'Empresa não encontrada' })

    const baseWhere = { estabelecimento: { empresaId: payload.empresaId } }
    const [totalVendas, conciliadas, divergenciasAbertas, semRepasse, valorDiv] = await Promise.all([
      prisma.venda.count({ where: baseWhere }),
      prisma.conciliacao.count({ where: { ...baseWhere, status: 'CONCILIADA' } }),
      prisma.divergencia.count({ where: { ...baseWhere, resolvida: false } }),
      prisma.conciliacao.count({ where: { ...baseWhere, status: 'VENDA_SEM_REPASSE' } }),
      prisma.divergencia.aggregate({ where: { ...baseWhere, resolvida: false }, _sum: { valorImpacto: true } }),
    ])

    const resumo = {
      totalVendas,
      conciliadas,
      divergenciasAbertas,
      semRepasse,
      valorEmDivergencia: valorDiv._sum.valorImpacto ?? 0,
      taxaConciliacao: totalVendas > 0 ? ((conciliadas / totalVendas) * 100).toFixed(1) : '0',
    }

    const destino = para ?? empresa.email
    const html = htmlRelatorioDiario(empresa.nome, resumo)

    const result = await enviarEmail(
      destino,
      `📊 ConciliaPro — Resumo diário ${new Date().toLocaleDateString('pt-BR')}`,
      html
    )

    return { enviado: result.ok, destino, resumo, motivo: result.motivo }
  })

  // Teste de conexão SMTP
  app.post('/testar-smtp', { ...opts }, async (request) => {
    const payload = (request as any).user
    const { para } = z.object({ para: z.string().email() }).parse(request.body)

    const empresa = await prisma.empresa.findUnique({
      where: { id: payload.empresaId },
      select: { nome: true },
    })

    const result = await enviarEmail(
      para,
      '✅ ConciliaPro — Teste de conexão SMTP',
      `<p style="font-family:system-ui">Conexão SMTP funcionando corretamente para <strong>${empresa?.nome}</strong>.</p>`
    )

    return result
  })
}
