import { PluggyClient } from 'pluggy-sdk'

let client: PluggyClient | null = null

export function getPluggyClient(): PluggyClient {
  if (client) return client
  const clientId     = process.env.PLUGGY_CLIENT_ID ?? ''
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET ?? ''
  if (!clientId || !clientSecret) throw new Error('PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET não configurados')
  client = new PluggyClient({ clientId, clientSecret })
  return client
}

// Gera token temporário para o Connect Widget (frontend)
export async function gerarConnectToken(clientUserId?: string, itemId?: string): Promise<string> {
  const c = getPluggyClient()
  const opts: any = {}
  if (clientUserId) opts.clientUserId = clientUserId
  const result = await c.createConnectToken(itemId, opts)
  return result.accessToken
}

// Lista todas as conexões (itens) de uma empresa
export async function listarItens() {
  const c = getPluggyClient()
  const result = await (c as any).fetchItems()
  return result.results ?? []
}

// Busca detalhes de um item
export async function buscarItem(itemId: string) {
  const c = getPluggyClient()
  return c.fetchItem(itemId)
}

// Lista contas de um item
export async function listarContas(itemId: string) {
  const c = getPluggyClient()
  const result = await c.fetchAccounts(itemId)
  return result.results ?? []
}

// Busca transações de uma conta em um período
export async function buscarTransacoes(accountId: string, de: Date, ate: Date) {
  const c = getPluggyClient()
  const dateFrom = de.toISOString().slice(0, 10)
  const dateTo   = ate.toISOString().slice(0, 10)
  // fetchAllTransactions usa cursor-based pagination internamente e retorna array direto
  return c.fetchAllTransactions(accountId, { dateFrom, dateTo })
}

// Remove uma conexão
export async function removerItem(itemId: string) {
  const c = getPluggyClient()
  return c.deleteItem(itemId)
}
