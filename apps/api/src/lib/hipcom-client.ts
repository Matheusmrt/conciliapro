/**
 * Cliente para a API Hipcom ERP v7.3
 * Autenticação: Basic Auth + headers cnpj e senha por loja
 * Docs: api-hipcom_docs_.pdf
 */

export interface HipcomCredentials {
  baseUrl: string    // ex: http://192.168.45.45:2222
  basicUser: string
  basicSenha: string
  cnpj: string
  senhaHipcom: string
  lojaId: number
}

export interface HipcomCupomItem {
  plu: number | null
  ean: string | null
  descricao: string
  quantidade: number
  valor_unitario: number
  valor_total: number
}

export interface HipcomCupomPagto {
  valor: number
  meio_pagamento: string
  nsu?: number | string
  bin?: number | string
  host?: string
}

export interface HipcomCupom {
  terminal: number
  numero: string
  datahora: string
  subtotal: number
  desconto: number
  acrescimo: number
  total: number
  cpfcnpj: string | null
  cancelado: boolean
  itens: HipcomCupomItem[]
  pagamento?: HipcomCupomPagto[]
}

export interface HipcomCuponsResponse {
  loja: number
  data: string
  cupons: HipcomCupom | HipcomCupom[]
}

export interface HipcomVendaProduto {
  plu: number
  ean: string
  descricao: string
  quantidade: number
  valor_total: number
}

export interface HipcomVendasProdutosResponse {
  loja: number
  data: string
  produtos: HipcomVendaProduto[]
}

export class HipcomClient {
  private headers: Record<string, string>

  constructor(private creds: HipcomCredentials) {
    const token = Buffer.from(`${creds.basicUser}:${creds.basicSenha}`).toString('base64')
    this.headers = {
      Authorization: `Basic ${token}`,
      cnpj: creds.cnpj,
      senha: creds.senhaHipcom,
      'Content-Type': 'application/json',
    }
  }

  private url(path: string) {
    const base = this.creds.baseUrl.replace(/\/$/, '')
    return `${base}${path}`
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(this.url(path), {
      method: 'GET',
      headers: this.headers,
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Hipcom API erro ${res.status}: ${body}`)
    }
    return res.json() as Promise<T>
  }

  /** Cupons (notas fiscais) do PDV para uma data específica (YYYY-MM-DD) */
  async getCupons(data: string): Promise<HipcomCupom[]> {
    const resp = await this.get<HipcomCuponsResponse>(
      `/api/hipcom/cupons?loja=${this.creds.lojaId}&data=${data}`
    )
    if (!resp.cupons) return []
    return Array.isArray(resp.cupons) ? resp.cupons : [resp.cupons]
  }

  /** Vendas por produto agregadas no dia */
  async getVendasProdutos(data: string): Promise<HipcomVendaProduto[]> {
    const resp = await this.get<HipcomVendasProdutosResponse>(
      `/api/hipcom/vendasprodutos?loja=${this.creds.lojaId}&data=${data}`
    )
    if (!resp.produtos) return []
    return Array.isArray(resp.produtos) ? resp.produtos : [resp.produtos]
  }

  /** Testa conectividade com o servidor Hipcom */
  async testarConexao(): Promise<{ ok: boolean; mensagem: string }> {
    try {
      const hoje = new Date().toISOString().slice(0, 10)
      await this.getCupons(hoje)
      return { ok: true, mensagem: 'Conexão bem-sucedida' }
    } catch (err: any) {
      return { ok: false, mensagem: err?.message ?? 'Falha na conexão' }
    }
  }
}
