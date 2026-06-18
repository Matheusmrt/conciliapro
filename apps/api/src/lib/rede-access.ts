// Rede Access Management API — Opt-in / Solicitação de acesso aos extratos

const BASE_PROD = 'https://api.userede.com.br/redelabs'
const BASE_SAND = 'https://rl7-sandbox-api.useredecloud.com.br'
const SANDBOX   = process.env.REDE_ENV !== 'production'
const BASE_URL  = SANDBOX ? BASE_SAND : BASE_PROD

const TOKEN_URL = SANDBOX
  ? 'https://rl7-sandbox-api.useredecloud.com.br/oauth/token'
  : 'https://api.userede.com.br/redelabs/oauth/token'

let cachedToken: { token: string; refreshToken: string; expiresAt: number } | null = null

// A API de Acesso usa grant_type=password (diferente da de Vendas que usa client_credentials)
export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token
  }

  const clientId     = process.env.REDE_CLIENT_ID ?? ''
  const secretCode   = process.env.REDE_CLIENT_SECRET ?? ''
  const username     = process.env.REDE_USERNAME ?? ''
  const password     = process.env.REDE_PASSWORD ?? ''

  const basicAuth = Buffer.from(`${clientId}:${secretCode}`).toString('base64')

  const body = new URLSearchParams({
    grant_type: cachedToken?.refreshToken ? 'refresh_token' : 'password',
    ...(cachedToken?.refreshToken
      ? { refresh_token: cachedToken.refreshToken }
      : { username, password }
    ),
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!res.ok) {
    cachedToken = null
    throw new Error(`Rede Access Token error: ${res.status} ${await res.text()}`)
  }

  const data = await res.json() as any
  cachedToken = {
    token:        data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    Date.now() + (data.expires_in ?? 1440) * 1000,
  }

  return cachedToken.token
}

// Solicitar acesso (Opt-in) a um PV
// requestType: 'TOTAL' = todos os dados | 'PARTIAL' = só matriz
export async function solicitarAcesso(params: {
  requestCompanyNumber: string
  requestType?: 'TOTAL' | 'PARTIAL'
  branches?: string[]
}) {
  const token = await getAccessToken()

  const body: any = {
    requestCompanyNumber: params.requestCompanyNumber,
    requestType: params.requestType ?? 'TOTAL',
  }

  if (params.branches && params.branches.length > 0) {
    body.branches = params.branches.map(b => ({ branchCompanyNumber: b }))
  }

  const res = await fetch(`${BASE_URL}/gestao-acessos/v1/solicitacoes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  try {
    return { status: res.status, data: JSON.parse(text) }
  } catch {
    return { status: res.status, data: { raw: text } }
  }
}

// Consultar status de uma solicitação
export async function consultarSolicitacao(requestId: string) {
  const token = await getAccessToken()

  const res = await fetch(`${BASE_URL}/gestao-acessos/v1/solicitacoes/${requestId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  return { status: res.status, data: await res.json() }
}

// Listar todas as solicitações
export async function listarSolicitacoes() {
  const token = await getAccessToken()

  const res = await fetch(`${BASE_URL}/gestao-acessos/v1/solicitacoes`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  return { status: res.status, data: await res.json() }
}
