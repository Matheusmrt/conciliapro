import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'
import {
  gerarConnectToken, buscarItem,
  listarContas, buscarTransacoes, removerItem,
} from '../lib/pluggy.js'

export async function rotasOpenFinance(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // ── Gerar token para o widget Pluggy ────────────────────────────────────
  app.post('/connect-token', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const { itemId } = z.object({ itemId: z.string().optional() }).parse(request.body ?? {})
    try {
      const token = await gerarConnectToken(payload.empresaId, itemId)
      return { accessToken: token }
    } catch (e: any) {
      return reply.code(500).send({ erro: e.message })
    }
  })

  // ── Listar contas conectadas via Pluggy ─────────────────────────────────
  app.get('/contas', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const contas = await prisma.contaBancaria.findMany({
      where: {
        estabelecimento: { empresaId: payload.empresaId },
        pluggyItemId: { not: null },
      },
      include: { estabelecimento: { select: { nome: true } } },
    })
    return contas
  })

  // ── Salvar conexão após widget completar ────────────────────────────────
  // Chamado pelo frontend quando o usuário conecta o banco no widget
  app.post('/conectar', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const { itemId, estabelecimentoId } = z.object({
      itemId:            z.string(),
      estabelecimentoId: z.string(),
    }).parse(request.body)

    const estab = await prisma.estabelecimento.findFirst({
      where: { id: estabelecimentoId, empresaId: payload.empresaId },
    })
    if (!estab) return reply.code(404).send({ erro: 'Estabelecimento não encontrado' })

    // Busca contas do item no Pluggy
    const item   = await buscarItem(itemId)
    const contas = await listarContas(itemId)

    const salvas: any[] = []
    for (const conta of contas) {
      // Só sincroniza contas correntes e poupança
      if (!['BANK', 'CHECKING', 'SAVINGS'].includes(conta.type ?? '')) continue

      const nome = item.connector?.name ?? 'Banco'

      await prisma.contaBancaria.upsert({
        where: { id: conta.id },
        update: { pluggyItemId: itemId, pluggyAccountId: conta.id },
        create: {
          id:               conta.id,
          banco:            nome,
          codigoBanco:      String(item.connector?.primaryColor ?? ''),
          agencia:          (conta.bankData as any)?.branchNumber ?? (conta.bankData as any)?.branch ?? '0000',
          conta:            (conta.bankData as any)?.accountNumber ?? (conta.bankData as any)?.number ?? conta.id,
          tipoConta:        conta.subtype === 'SAVINGS_ACCOUNT' ? 'POUPANCA' : 'CORRENTE',
          titular:          conta.owner ?? estab.nome,
          pluggyItemId:     itemId,
          pluggyAccountId:  conta.id,
          estabelecimentoId,
        },
      })
      salvas.push({ id: conta.id, banco: nome, tipo: conta.subtype })
    }

    return { ok: true, contas: salvas, banco: item.connector?.name }
  })

  // ── Sincronizar transações de uma conta ─────────────────────────────────
  app.post('/sincronizar/:contaId', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const { contaId } = z.object({ contaId: z.string() }).parse(request.params)
    const { dias } = z.object({ dias: z.number().default(30) }).parse(request.body ?? {})

    const conta = await prisma.contaBancaria.findFirst({
      where: { id: contaId, estabelecimento: { empresaId: payload.empresaId } },
    })
    if (!conta?.pluggyAccountId) return reply.code(404).send({ erro: 'Conta não conectada ao Pluggy' })

    const ate = new Date()
    const de  = new Date(Date.now() - dias * 86400000)

    const transacoes = await buscarTransacoes(conta.pluggyAccountId, de, ate)

    let importadas = 0
    let duplicatas = 0
    for (const t of transacoes) {
      const amount = Number(t.amount ?? 0)
      const valor = Math.round(Math.abs(amount) * 100)
      // SDK retorna type 'CREDIT' | 'DEBIT' — mapeia para nosso enum
      const tipo: 'CREDITO' | 'DEBITO' = (t.type === 'CREDIT' || amount >= 0) ? 'CREDITO' : 'DEBITO'
      const dataLanc = t.date ?? new Date()
      const docId = t.id ?? String(Date.now())

      // Evita duplicata por documento+arquivo
      const existe = await prisma.lancamentoBancario.findFirst({
        where: { documento: docId, arquivoOrigem: `pluggy-${conta.pluggyAccountId}` },
      })
      if (existe) { duplicatas++; continue }

      await prisma.lancamentoBancario.create({
        data: {
          data:              new Date(dataLanc),
          descricao:         t.description ?? t.descriptionRaw ?? t.category ?? 'Sem descrição',
          valor,
          tipo,
          documento:         docId,
          banco:             conta.banco,
          agencia:           conta.agencia,
          conta:             conta.conta,
          arquivoOrigem:     `pluggy-${conta.pluggyAccountId}`,
          estabelecimentoId: conta.estabelecimentoId,
        },
      })
      importadas++
    }

    await prisma.contaBancaria.update({
      where: { id: contaId },
      data:  { ultimaSincEm: new Date() },
    })

    return { importadas, duplicatas, total: transacoes.length, periodo: { de, ate } }
  })

  // ── Sincronizar TODAS as contas conectadas ──────────────────────────────
  app.post('/sincronizar-todas', { ...opts }, async (request) => {
    const payload = (request as any).user
    const { dias } = z.object({ dias: z.number().default(30) }).parse(request.body ?? {})

    const contas = await prisma.contaBancaria.findMany({
      where: {
        estabelecimento: { empresaId: payload.empresaId },
        pluggyAccountId: { not: null },
      },
    })

    const resultados: any[] = []
    for (const conta of contas) {
      const ate = new Date()
      const de  = new Date(Date.now() - dias * 86400000)
      try {
        const transacoes = await buscarTransacoes(conta.pluggyAccountId!, de, ate)
        let importadas = 0
        for (const t of transacoes) {
          try {
            await prisma.lancamentoBancario.create({
              data: {
                data:             new Date(t.date),
                descricao:        t.description ?? t.category ?? 'Sem descrição',
                valor:            Math.round(Math.abs(t.amount) * 100),
                tipo:             (t.type === 'CREDIT' || Number(t.amount) >= 0) ? 'CREDITO' : 'DEBITO',
                documento:        t.id,
                banco:            conta.banco,
                arquivoOrigem:    `pluggy-${conta.pluggyAccountId}`,
                estabelecimentoId: conta.estabelecimentoId,
              },
            })
            importadas++
          } catch { /* duplicata */ }
        }
        await prisma.contaBancaria.update({
          where: { id: conta.id },
          data:  { ultimaSincEm: new Date() },
        })
        resultados.push({ conta: conta.banco, importadas, total: transacoes.length })
      } catch (e: any) {
        resultados.push({ conta: conta.banco, erro: e.message })
      }
    }

    return { resultados }
  })

  // ── Desconectar uma conta ───────────────────────────────────────────────
  app.delete('/contas/:contaId', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const { contaId } = z.object({ contaId: z.string() }).parse(request.params)

    const conta = await prisma.contaBancaria.findFirst({
      where: { id: contaId, estabelecimento: { empresaId: payload.empresaId } },
    })
    if (!conta) return reply.code(404).send({ erro: 'Não encontrado' })

    if (conta.pluggyItemId) {
      await removerItem(conta.pluggyItemId).catch(() => null)
    }

    await prisma.contaBancaria.update({
      where: { id: contaId },
      data:  { pluggyItemId: null, pluggyAccountId: null },
    })

    return { ok: true }
  })

  // ── Webhook Pluggy — atualização automática ─────────────────────────────
  // IMPORTANTE: deve responder 2XX em até 5 segundos (Pluggy exige)
  app.post('/webhook', async (request, reply) => {
    const evento = request.body as any
    const { event: tipo, itemId, eventId } = evento ?? {}

    // Responde imediatamente e processa em background
    reply.code(200).send({ received: true })

    if (!itemId) return

    switch (tipo) {
      case 'item/created':
      case 'item/updated': {
        // Sincroniza transações dos últimos 7 dias para todas as contas do item
        const contas = await prisma.contaBancaria.findMany({
          where: { pluggyItemId: itemId },
        })
        for (const conta of contas) {
          if (!conta.pluggyAccountId) continue
          const de  = new Date(Date.now() - 7 * 86400000)
          const ate = new Date()
          const txs = await buscarTransacoes(conta.pluggyAccountId, de, ate).catch(() => [])
          for (const t of txs) {
            await prisma.lancamentoBancario.create({
              data: {
                data:              new Date(t.date),
                descricao:         t.description ?? 'Sem descrição',
                valor:             Math.round(Math.abs(t.amount) * 100),
                tipo:              t.amount >= 0 ? 'CREDITO' : 'DEBITO',
                documento:         t.id,
                banco:             conta.banco,
                arquivoOrigem:     `pluggy-${conta.pluggyAccountId}`,
                estabelecimentoId: conta.estabelecimentoId,
              },
            }).catch(() => null) // ignora duplicata
          }
          await prisma.contaBancaria.update({
            where: { id: conta.id },
            data:  { ultimaSincEm: new Date() },
          }).catch(() => null)
        }
        break
      }

      case 'item/error': {
        // Marca as contas do item com erro para o usuário saber que a conexão falhou
        await prisma.contaBancaria.updateMany({
          where: { pluggyItemId: itemId },
          data:  { ultimaSincEm: null },
        }).catch(() => null)
        break
      }
    }
  })
}
