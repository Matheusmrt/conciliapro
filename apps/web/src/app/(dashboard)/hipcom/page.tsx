'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Settings, RefreshCw, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, PackageSearch } from 'lucide-react'
import { api } from '@/lib/api'
import { fmtBRL, fmtDate, Spinner, EmptySearch } from '@/components/ui/TablePage'

type Estab = { id: string; nome: string; cnpj: string }
type HipcomConfig = { id: string; baseUrl: string; basicUser: string; cnpj: string; lojaId: number; ativo: boolean; ultimaSincEm?: string }
type VendaItem = { id: string; descricao: string; quantidade: number; valorUnit: number; valorTotal: number }
type Venda = {
  id: string; numeroCupom: string; terminal: number; dataHora: string
  subtotal: number; desconto: number; acrescimo: number; total: number
  cpfCnpj?: string; cancelado: boolean; itens: VendaItem[]
  estabelecimento: { nome: string }
}

// ─── Aba Vendas ────────────────────────────────────────────────────────────────
function AbaVendas({ estabelecimentos }: { estabelecimentos: Estab[] }) {
  const hoje = new Date()
  const [dataInicio, setDataInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10))
  const [dataFim, setDataFim] = useState(hoje.toISOString().slice(0, 10))
  const [estabId, setEstabId] = useState('')
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)

  async function pesquisar() {
    setLoading(true); setDados(null)
    try {
      const qs = new URLSearchParams({ dataInicio, dataFim, limite: '100' })
      if (estabId) qs.set('estabelecimentoId', estabId)
      const r = await api.get(`/hipcom/vendas?${qs}`)
      setDados(r.data)
    } catch (e: any) {
      alert(e?.response?.data?.erro ?? 'Erro ao buscar vendas')
    } finally { setLoading(false) }
  }

  const vendas: Venda[] = dados?.vendas ?? []

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500 block mb-1">De</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Até</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Estabelecimento</label>
            <select value={estabId} onChange={e => setEstabId(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
              <option value="">Todos</option>
              {estabelecimentos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <button onClick={pesquisar} disabled={loading}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Pesquisar
          </button>
        </div>
      </div>

      {/* KPIs */}
      {dados && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total em vendas', val: fmtBRL(dados.totalVendas) },
            { label: 'Qtde de cupons', val: dados.qtdeVendas.toLocaleString('pt-BR') },
            { label: 'Total registros', val: dados.total.toLocaleString('pt-BR') },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{k.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabela */}
      {loading && <Spinner />}
      {!loading && dados && vendas.length === 0 && (
        <EmptySearch message="Nenhuma venda encontrada. Sincronize o PDV primeiro na aba Sincronização." />
      )}
      {!loading && vendas.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left w-6" />
                <th className="px-4 py-3 text-left">Cupom / Terminal</th>
                <th className="px-4 py-3 text-left">Estabelecimento</th>
                <th className="px-4 py-3 text-left">Data/Hora</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendas.map(v => (
                <>
                  <tr key={v.id} onClick={() => setExpandido(expandido === v.id ? null : v.id)}
                    className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-3 text-slate-400">
                      {expandido === v.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-slate-700">{v.numeroCupom}</span>
                      <span className="text-slate-400 ml-2 text-xs">Terminal {v.terminal}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{v.estabelecimento.nome}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(v.dataHora).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {fmtBRL(Number(v.total))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {v.cancelado
                        ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Cancelado</span>
                        : <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Ativo</span>}
                    </td>
                  </tr>
                  {expandido === v.id && (
                    <tr key={`${v.id}-itens`} className="bg-slate-50">
                      <td colSpan={6} className="px-8 py-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-400 uppercase">
                              <th className="text-left py-1">Produto</th>
                              <th className="text-right py-1">Qtde</th>
                              <th className="text-right py-1">Vlr. Unit.</th>
                              <th className="text-right py-1">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {v.itens.map((item, i) => (
                              <tr key={i} className="border-t border-slate-200">
                                <td className="py-1 text-slate-700">{item.descricao}</td>
                                <td className="py-1 text-right text-slate-500">{Number(item.quantidade).toFixed(3)}</td>
                                <td className="py-1 text-right text-slate-500">{fmtBRL(Number(item.valorUnit))}</td>
                                <td className="py-1 text-right font-medium">{fmtBRL(Number(item.valorTotal))}</td>
                              </tr>
                            ))}
                            <tr className="border-t-2 border-slate-300 font-semibold">
                              <td className="py-1" colSpan={3}>Total do cupom</td>
                              <td className="py-1 text-right">{fmtBRL(Number(v.total))}</td>
                            </tr>
                          </tbody>
                        </table>
                        {v.cpfCnpj && <p className="text-xs text-slate-400 mt-1">CPF/CNPJ: {v.cpfCnpj}</p>}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Aba Sincronização ────────────────────────────────────────────────────────
function AbaSincronizacao({ estabelecimentos }: { estabelecimentos: Estab[] }) {
  const hoje = new Date()
  const [estabId, setEstabId] = useState('')
  const [dataInicio, setDataInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10))
  const [dataFim, setDataFim] = useState(hoje.toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<any>(null)

  async function sincronizar() {
    if (!estabId) return alert('Selecione um estabelecimento')
    setLoading(true); setResultado(null)
    try {
      const r = await api.post('/hipcom/sincronizar', { estabelecimentoId: estabId, dataInicio, dataFim })
      setResultado(r.data)
    } catch (e: any) {
      setResultado({ ok: false, erro: e?.response?.data?.erro ?? 'Falha na sincronização' })
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h3 className="font-semibold text-slate-700">Sincronizar vendas do PDV</h3>
        <p className="text-sm text-slate-500">
          Busca os cupons fiscais do servidor Hipcom para o período selecionado e salva no banco de dados do ConciliaPro.
        </p>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Estabelecimento</label>
          <select value={estabId} onChange={e => setEstabId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Selecione...</option>
            {estabelecimentos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1">Data início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1">Data fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <button onClick={sincronizar} disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? 'Sincronizando...' : 'Iniciar sincronização'}
        </button>
      </div>

      {resultado && (
        <div className={`rounded-xl border p-4 ${resultado.ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-2">
            {resultado.ok
              ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              : <XCircle className="w-5 h-5 text-red-600" />}
            <span className="font-medium text-sm">
              {resultado.ok ? `${resultado.importados} cupons importados` : resultado.erro}
            </span>
          </div>
          {resultado.erros?.length > 0 && (
            <div className="mt-2 text-xs text-red-700 space-y-0.5">
              {resultado.erros.map((e: string, i: number) => <p key={i}>{e}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Aba Configuração ─────────────────────────────────────────────────────────
function AbaConfiguracao({ estabelecimentos }: { estabelecimentos: Estab[] }) {
  const [estabId, setEstabId] = useState('')
  const [config, setConfig] = useState<HipcomConfig | null>(null)
  const [form, setForm] = useState({ baseUrl: '', basicUser: '', basicSenha: '', cnpj: '', senhaHipcom: '', lojaId: 1 })
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [testeResult, setTesteResult] = useState<any>(null)

  useEffect(() => {
    if (!estabId) return
    setConfig(null)
    api.get(`/hipcom/config?estabelecimentoId=${estabId}`)
      .then(r => {
        if (r.data.config) {
          setConfig(r.data.config)
          setForm(f => ({ ...f, ...r.data.config, basicSenha: '', senhaHipcom: '' }))
        }
      })
  }, [estabId])

  function f(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: key === 'lojaId' ? Number(e.target.value) : e.target.value }))
  }

  async function salvar() {
    if (!estabId) return alert('Selecione um estabelecimento')
    setSalvando(true)
    try {
      await api.post('/hipcom/config', { estabelecimentoId: estabId, ...form })
      alert('Configuração salva!')
    } catch (e: any) {
      alert(e?.response?.data?.erro ?? 'Erro ao salvar')
    } finally { setSalvando(false) }
  }

  async function testarConexao() {
    if (!estabId) return alert('Salve a configuração primeiro')
    setTestando(true); setTesteResult(null)
    try {
      const r = await api.post('/hipcom/testar', { estabelecimentoId: estabId })
      setTesteResult(r.data)
    } finally { setTestando(false) }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h3 className="font-semibold text-slate-700">Conexão com o servidor Hipcom</h3>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <strong>Atenção:</strong> O servidor Hipcom roda na rede local da loja. Para o ConciliaPro acessá-lo
          da nuvem, o servidor precisa estar acessível via IP público, VPN ou ferramenta como ngrok.
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Estabelecimento</label>
          <select value={estabId} onChange={e => setEstabId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Selecione...</option>
            {estabelecimentos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">URL base do servidor Hipcom</label>
          <input value={form.baseUrl} onChange={f('baseUrl')} placeholder="http://192.168.45.45:2222"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono" />
          <p className="text-xs text-slate-400 mt-1">IP/hostname + porta do servidor Hipcom</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Usuário (Basic Auth)</label>
            <input value={form.basicUser} onChange={f('basicUser')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Senha (Basic Auth)</label>
            <input type="password" value={form.basicSenha} onChange={f('basicSenha')}
              placeholder={config ? '••••••••' : ''}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">CNPJ (header da API)</label>
            <input value={form.cnpj} onChange={f('cnpj')} placeholder="00.000.000/0001-00"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Senha Hipcom (header)</label>
            <input type="password" value={form.senhaHipcom} onChange={f('senhaHipcom')}
              placeholder={config ? '••••••••' : 'Gerada pela Hipcom'}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <p className="text-xs text-slate-400 mt-1">Solicite em integracao@hipcom.com.br</p>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">ID da loja (loja)</label>
          <input type="number" min={1} value={form.lojaId} onChange={f('lojaId')}
            className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="flex gap-2">
          <button onClick={salvar} disabled={salvando}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Salvar configuração
          </button>
          {config && (
            <button onClick={testarConexao} disabled={testando}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2">
              {testando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Testar
            </button>
          )}
        </div>

        {testeResult && (
          <div className={`rounded-lg p-3 flex items-center gap-2 text-sm ${testeResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {testeResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {testeResult.mensagem}
          </div>
        )}

        {config?.ultimaSincEm && (
          <p className="text-xs text-slate-400">
            Última sincronização: {new Date(config.ultimaSincEm).toLocaleString('pt-BR')}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HipcomPage() {
  const [aba, setAba] = useState<'vendas' | 'sinc' | 'config'>('vendas')
  const [estabelecimentos, setEstabelecimentos] = useState<Estab[]>([])

  useEffect(() => {
    api.get('/empresa/estabelecimentos').then(r => setEstabelecimentos(r.data ?? []))
  }, [])

  const abas = [
    { id: 'vendas', label: 'Vendas PDV', icon: ShoppingCart },
    { id: 'sinc', label: 'Sincronização', icon: RefreshCw },
    { id: 'config', label: 'Configuração', icon: Settings },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <PackageSearch className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Hipcom PDV</h1>
          <p className="text-sm text-slate-500">Vendas do ponto de venda para conciliação ponta a ponta</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              aba === a.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            <a.icon className="w-4 h-4" />
            {a.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {aba === 'vendas' && <AbaVendas estabelecimentos={estabelecimentos} />}
      {aba === 'sinc' && <AbaSincronizacao estabelecimentos={estabelecimentos} />}
      {aba === 'config' && <AbaConfiguracao estabelecimentos={estabelecimentos} />}
    </div>
  )
}
