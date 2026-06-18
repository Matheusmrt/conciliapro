import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { coletaQueue, conciliacaoQueue } from '../workers/coletador.js'

export async function rotasJobs(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Status das filas
  app.get('/status', { ...opts }, async () => {
    const [coletaWaiting, coletaActive, coletaCompleted, coletaFailed,
           concWaiting, concActive, concCompleted, concFailed] = await Promise.all([
      coletaQueue.getWaitingCount(),
      coletaQueue.getActiveCount(),
      coletaQueue.getCompletedCount(),
      coletaQueue.getFailedCount(),
      conciliacaoQueue.getWaitingCount(),
      conciliacaoQueue.getActiveCount(),
      conciliacaoQueue.getCompletedCount(),
      conciliacaoQueue.getFailedCount(),
    ])

    const ultimosColeta = await coletaQueue.getJobs(['completed', 'failed'], 0, 9)
    const ultimosConc = await conciliacaoQueue.getJobs(['completed', 'failed'], 0, 4)

    return {
      coleta: {
        waiting: coletaWaiting, active: coletaActive,
        completed: coletaCompleted, failed: coletaFailed,
        ultimos: ultimosColeta.map(j => ({
          id: j.id, name: j.name,
          arquivo: j.data?.nomeArquivo,
          adquirente: j.data?.adquirente,
          status: j.finishedOn ? (j.returnvalue ? 'completed' : 'failed') : 'active',
          finishedOn: j.finishedOn,
          resultado: j.returnvalue,
          erro: j.failedReason,
        })),
      },
      conciliacao: {
        waiting: concWaiting, active: concActive,
        completed: concCompleted, failed: concFailed,
        ultimos: ultimosConc.map(j => ({
          id: j.id, name: j.name,
          estabelecimentoId: j.data?.estabelecimentoId,
          status: j.finishedOn ? (j.returnvalue ? 'completed' : 'failed') : 'active',
          finishedOn: j.finishedOn,
          resultado: j.returnvalue,
          erro: j.failedReason,
        })),
      },
    }
  })

  // Enfileirar conciliação manual via job
  app.post('/conciliacao', { ...opts }, async (request, reply) => {
    const { estabelecimentoId } = z.object({ estabelecimentoId: z.string() }).parse(request.body)
    const payload = (request as any).user
    const job = await conciliacaoQueue.add('conciliar', { estabelecimentoId, empresaId: payload.empresaId })
    return reply.code(202).send({ jobId: job.id, status: 'enfileirado' })
  })

  // Limpar jobs concluídos
  app.delete('/limpar', { ...opts }, async () => {
    await Promise.all([
      coletaQueue.clean(0, 100, 'completed'),
      coletaQueue.clean(0, 100, 'failed'),
      conciliacaoQueue.clean(0, 100, 'completed'),
      conciliacaoQueue.clean(0, 100, 'failed'),
    ])
    return { ok: true }
  })
}
