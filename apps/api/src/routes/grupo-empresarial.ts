import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'

export async function rotasGrupoEmpresarial(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Visão consolidada do grupo
  app.get('/consolidado', { ...opts }, async (request) => {
    const payload = (request as any).user

    // Busca empresa atual e grupo
    const empresa = await prisma.empresa.findUnique({
      where: { id: payload.empresaId },
      include: { grupo: { include: { empresas: true } } },
    })

    // Empresas do grupo (ou só a atual se não tiver grupo)
    const empresasIds = empresa?.grupo
      ? empresa.grupo.empresas.map(e => e.id)
      : [payload.empresaId]

    // KPIs consolidados por empresa
    const consolidado = await Promise.all(
      empresasIds.map(async (empId) => {
        const emp = empresa?.grupo?.empresas.find(e => e.id === empId) ?? empresa!
        const baseWhere = { estabelecimento: { empresaId: empId } }

        const [totalVendas, conciliadas, divergencias, valorDiv, repassesMes] = await Promise.all([
          prisma.venda.count({ where: baseWhere }),
          prisma.conciliacao.count({ where: { ...baseWhere, status: 'CONCILIADA' } }),
          prisma.divergencia.count({ where: { ...baseWhere, resolvida: false } }),
          prisma.divergencia.aggregate({ where: { ...baseWhere, resolvida: false }, _sum: { valorImpacto: true } }),
          prisma.repasse.aggregate({
            where: {
              estabelecimento: { empresaId: empId },
              dataPagamento: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
            },
            _sum: { valorBruto: true, valorLiquido: true },
          }),
        ])

        return {
          empresa: { id: emp.id, nome: emp.nome, cnpj: emp.cnpj },
          taxaConciliacao: totalVendas > 0 ? ((conciliadas / totalVendas) * 100).toFixed(1) : '0',
          totalVendas,
          conciliadas,
          divergencias,
          valorDivergencia: Number(valorDiv._sum.valorImpacto ?? 0),
          recebimentosMes: {
            bruto: Number(repassesMes._sum.valorBruto ?? 0),
            liquido: Number(repassesMes._sum.valorLiquido ?? 0),
          },
        }
      })
    )

    const totalGrupo = {
      totalVendas: consolidado.reduce((s, e) => s + e.totalVendas, 0),
      conciliadas: consolidado.reduce((s, e) => s + e.conciliadas, 0),
      divergencias: consolidado.reduce((s, e) => s + e.divergencias, 0),
      valorDivergencia: consolidado.reduce((s, e) => s + e.valorDivergencia, 0),
      brutMes: consolidado.reduce((s, e) => s + e.recebimentosMes.bruto, 0),
      liquidoMes: consolidado.reduce((s, e) => s + e.recebimentosMes.liquido, 0),
    }

    return {
      grupo: empresa?.grupo?.nome ?? empresa?.nome,
      empresas: consolidado,
      totalGrupo,
    }
  })

  // Lista grupos
  app.get('/grupos', { ...opts }, async () => {
    return prisma.grupoEmpresarial.findMany({ include: { _count: { select: { empresas: true } } } })
  })

  // Cria grupo
  app.post('/grupos', { ...opts }, async (request, reply) => {
    const { nome } = z.object({ nome: z.string().min(2) }).parse(request.body)
    return reply.code(201).send(await prisma.grupoEmpresarial.create({ data: { nome } }))
  })

  // Associa empresa a grupo
  app.patch('/vincular', { ...opts }, async (request) => {
    const payload = (request as any).user
    const { grupoId } = z.object({ grupoId: z.string().nullable() }).parse(request.body)
    return prisma.empresa.update({ where: { id: payload.empresaId }, data: { grupoId } })
  })
}
