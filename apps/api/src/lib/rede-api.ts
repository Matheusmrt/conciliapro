// Cliente para a API Sales Management da Rede
// Docs: https://developer.userede.com.br/gestao-vendas
// Base: https://api.userede.com.br/redelabs
// Auth: OAuth 2.0 client_credentials — token expira em 24min, refresh em 24h

const SANDBOX = process.env.REDE_ENV !== 'production'
const BASE_URL = SANDBOX
  ? 'https://rl7-sandbox-api.useredecloud.com.br'
  : 'https://api.userede.com.br/redelabs'
const TOKEN_URL = SANDBOX
  ? 'https://rl7-sandbox-api.useredecloud.com.br/oauth/token'
  : 'https://api.userede.com.br/redelabs/oauth/token'

let cachedToken: string | null = null
let tokenExpiresAt = 0

export async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken

  const clientId = process.env.REDE_CLIENT_ID
  const clientSecret = process.env.REDE_CLIENT_SECRET

  if (!clientId || !clientSecret) throw new Error('REDE_CLIENT_ID / REDE_CLIENT_SECRET não configurados')

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Rede OAuth falhou (${res.status}): ${body}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }
  cachedToken = data.access_token
  tokenExpiresAt = Date.now() + data.expires_in * 1000
  return cachedToken
}

async function redeGet(path: string, params: Record<string, string> = {}) {
  const token = await getToken()
  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Rede API ${path} falhou (${res.status}): ${body}`)
  }

  return res.json()
}

// ── Vendas ────────────────────────────────────────────────────────────────────

export interface RedeVenda {
  saleId: string
  nsu: string
  authorizationCode: string
  saleDate: string          // ISO date
  brandId: number
  brandName: string
  modality: string          // CREDIT | DEBIT
  status: string            // APPROVED | CANCELLED | etc
  grossAmount: number       // em centavos (valor * 100 já na API? — confirmar)
  netAmount: number
  mdrAmount: number
  installments: number
  totalInstallments: number
  terminalId: string
  establishmentId: string
}

export async function buscarVendas(params: {
  parentCompanyNumber: string
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
  page?: number
  size?: number
  modality?: string
  status?: string
}): Promise<{ sales: RedeVenda[]; totalElements: number; totalPages: number }> {
  const p: Record<string, string> = {
    parentCompanyNumber: params.parentCompanyNumber,
    startDate: params.startDate,
    endDate: params.endDate,
    page: String(params.page ?? 0),
    size: String(params.size ?? 100),
  }
  if (params.modality) p.modality = params.modality
  if (params.status)   p.status   = params.status

  return redeGet('/merchant-statement/v1/sales/', p)
}

// ── Pagamentos ────────────────────────────────────────────────────────────────

export async function buscarPagamentos(params: {
  parentCompanyNumber: string
  startDate: string
  endDate: string
  page?: number
  size?: number
}): Promise<any> {
  return redeGet('/merchant-statement/v1/payments/', {
    parentCompanyNumber: params.parentCompanyNumber,
    startDate: params.startDate,
    endDate: params.endDate,
    page: String(params.page ?? 0),
    size: String(params.size ?? 100),
  })
}

// ── Recebíveis ────────────────────────────────────────────────────────────────

export async function buscarRecebiveis(params: {
  parentCompanyNumber: string
  startDate: string
  endDate: string
  type?: 'DAY' | 'MONTH'
}): Promise<any> {
  const p: Record<string, string> = {
    parentCompanyNumber: params.parentCompanyNumber,
    startDate: params.startDate,
    endDate: params.endDate,
  }
  if (params.type) p.type = params.type
  return redeGet('/merchant-statement/v1/receivables/', p)
}
