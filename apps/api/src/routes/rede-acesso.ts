import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { solicitarAcesso, consultarSolicitacao, listarSolicitacoes, getAccessToken } from '../lib/rede-access.js'

// PVs reais do Empório Villa Borghese
const PVS_REAIS = ['9060898', '13501968', '36477761', '84700610', '87076195']

export async function rotasRedeAcesso(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Testar autenticação da API de Acesso
  app.get('/status', { ...opts }, async (_, reply) => {
    try {
      const token = await getAccessToken()
      return { ok: true, token: token.slice(0, 20) + '...' }
    } catch (e: any) {
      return reply.code(500).send({ ok: false, erro: e.message })
    }
  })

  // Solicitar opt-in para um PV específico
  app.post('/solicitar', { ...opts }, async (request, reply) => {
    const { pv, tipo } = z.object({
      pv:   z.string(),
      tipo: z.enum(['TOTAL', 'PARTIAL']).default('TOTAL'),
    }).parse(request.body)

    try {
      const result = await solicitarAcesso({ requestCompanyNumber: pv, requestType: tipo })
      return result
    } catch (e: any) {
      return reply.code(500).send({ erro: e.message })
    }
  })

  // Solicitar opt-in para TODOS os 5 PVs de uma vez
  app.post('/solicitar-todos', { ...opts }, async (_, reply) => {
    const resultados: any[] = []

    for (const pv of PVS_REAIS) {
      try {
        const r = await solicitarAcesso({ requestCompanyNumber: pv, requestType: 'TOTAL' })
        resultados.push({ pv, status: r.status, data: r.data })
      } catch (e: any) {
        resultados.push({ pv, erro: e.message })
      }
      // Pequena pausa para não sobrecarregar a API
      await new Promise(r => setTimeout(r, 500))
    }

    return { pvs: PVS_REAIS, resultados }
  })

  // Consultar status de uma solicitação pelo requestId
  app.get('/consultar/:requestId', { ...opts }, async (request, reply) => {
    const { requestId } = z.object({ requestId: z.string() }).parse(request.params)
    try {
      return await consultarSolicitacao(requestId)
    } catch (e: any) {
      return reply.code(500).send({ erro: e.message })
    }
  })

  // Listar todas as solicitações feitas
  app.get('/listar', { ...opts }, async (_, reply) => {
    try {
      return await listarSolicitacoes()
    } catch (e: any) {
      return reply.code(500).send({ erro: e.message })
    }
  })

  // Diagnóstico completo — gera log de requisição para enviar ao suporte da Rede
  app.get('/diagnostico', { ...opts }, async (_, reply) => {
    const clientId     = process.env.REDE_CLIENT_ID ?? '(não configurado)'
    const clientSecret = process.env.REDE_CLIENT_SECRET ?? '(não configurado)'
    const username     = process.env.REDE_USERNAME ?? '(não configurado)'
    const sandbox      = process.env.REDE_ENV !== 'production'

    const tokenUrl = sandbox
      ? 'https://rl7-sandbox-api.useredecloud.com.br/oauth/token'
      : 'https://api.userede.com.br/redelabs/oauth/token'

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const requestBody = new URLSearchParams({ grant_type: 'password', username, password: '***' })

    const requestHeaders = {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    }

    // Faz a requisição real capturando tudo
    const inicio = Date.now()
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'password', username, password: process.env.REDE_PASSWORD ?? '' }).toString(),
    })
    const duracao = Date.now() - inicio
    const responseBody = await res.text()
    const responseHeaders: Record<string, string> = {}
    res.headers.forEach((v, k) => { responseHeaders[k] = v })

    return {
      ambiente: sandbox ? 'SANDBOX' : 'PRODUCAO',
      timestamp: new Date().toISOString(),
      requisicao: {
        metodo: 'POST',
        url: tokenUrl,
        headers: requestHeaders,
        body: requestBody.toString(),
      },
      resposta: {
        status: res.status,
        statusText: res.statusText,
        duracaoMs: duracao,
        headers: responseHeaders,
        body: responseBody,
      },
      log_formatado: [
        `=== LOG OPERACIONAL — ${new Date().toISOString()} ===`,
        ``,
        `--- REQUISIÇÃO ---`,
        `POST ${tokenUrl}`,
        `Authorization: Basic ${basicAuth}`,
        `Content-Type: application/x-www-form-urlencoded`,
        ``,
        `Body: ${requestBody.toString()}`,
        ``,
        `--- RESPOSTA ---`,
        `HTTP ${res.status} ${res.statusText}`,
        ...Object.entries(responseHeaders).map(([k, v]) => `${k}: ${v}`),
        ``,
        `Body: ${responseBody}`,
      ].join('\n'),
    }
  })
}
