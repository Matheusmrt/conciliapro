// Pagar.me API v5 — https://docs.pagar.me/reference

const BASE = 'https://api.pagar.me/core/v5'

function headers() {
  const key = process.env.PAGARME_API_KEY ?? ''
  const token = Buffer.from(`${key}:`).toString('base64')
  return {
    'Authorization': `Basic ${token}`,
    'Content-Type': 'application/json',
  }
}

async function req(method: string, path: string, body?: object) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json() as any
  if (!res.ok) throw new Error(json.message ?? `Pagar.me ${res.status}`)
  return json
}

export async function criarCliente(dados: {
  nome: string
  email: string
  cnpj: string
  telefone?: string
}) {
  return req('POST', '/customers', {
    name: dados.nome,
    email: dados.email,
    type: 'company',
    document: dados.cnpj.replace(/\D/g, ''),
    document_type: 'CNPJ',
    phones: dados.telefone ? {
      mobile_phone: {
        country_code: '55',
        number: dados.telefone.replace(/\D/g, '').slice(-9),
        area_code: dados.telefone.replace(/\D/g, '').slice(0, 2),
      }
    } : undefined,
  })
}

export async function criarAssinatura(dados: {
  customerId: string
  planId: string          // ID do plano no Pagar.me
  cardToken?: string      // token do cartão (se imediato)
  trialDias?: number
}) {
  return req('POST', '/subscriptions', {
    customer_id: dados.customerId,
    plan_id: dados.planId,
    payment_method: dados.cardToken ? 'credit_card' : 'boleto',
    card_token: dados.cardToken,
    ...(dados.trialDias ? { trial_period_days: dados.trialDias } : {}),
  })
}

export async function cancelarAssinatura(subscriptionId: string) {
  return req('DELETE', `/subscriptions/${subscriptionId}`)
}

export async function buscarAssinatura(subscriptionId: string) {
  return req('GET', `/subscriptions/${subscriptionId}`)
}

// Valida webhook do Pagar.me
export function validarWebhook(payload: string, signature: string): boolean {
  const secret = process.env.PAGARME_WEBHOOK_SECRET ?? ''
  if (!secret) return true // sem secret configurado, aceita tudo (dev)
  const crypto = require('crypto')
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return expected === signature
}
