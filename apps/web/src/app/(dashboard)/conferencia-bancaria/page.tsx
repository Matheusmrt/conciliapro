'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, CheckCircle, Clock, EyeOff, Trash2, AlertTriangle, X, Zap, Plug, RefreshCw, Unplug } from 'lucide-react'

import { api } from '@/lib/api'
import { Toast, type ToastState } from '@/components/ui/Toast'
import { PluggyConnectWidget } from '@/components/ui/PluggyConnect'

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Lancamento = {
  id: string
  data: string
  descricao: string
  valor: number
  tipo: 'CREDITO' | 'DEBITO'
  documento?: string
  status: 'PENDENTE' | 'CONCILIADO' | 'IGNORADO'
  banco?: string
  agencia?: string
  conta?: string
  arquivoOrigem?: string
  estabelecimento: { nome: string }
}

type Dados = {
  totalCredito: number
  totalDebito: number
  saldo: number
  pendentes: number
  conciliados: number
  qtde: number
  lancamentos: Lancamento[]
}

const STATUS_INFO = {
  PENDENTE: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  CONCILIADO: { label: 'Conciliado', color: 'bg-green-100 text-green-700' },
  IGNORADO: { label: 'Ignorado', color: 'bg-gray-100 text-gray-500' },
}

export default function ConferenciaBancariaPage() {
  const [dados, setDados] = useState<Dados | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [estabelecimentos, setEstabelecimentos] = useState<{ id: string; nome: string }[]>([])
  const [estabSelecionado, setEstabSelecionado] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [conciliandoAuto, setConciliandoAuto] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Pluggy Open Finance
  const [contasPluggy, setContasPluggy] = useState<any[]>([])
  const [showPluggy, setShowPluggy] = useState(false)
  const [pluggyToken, setPluggyToken] = useState<string | null>(null)
  const [sincronizando, setSincronizando] = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroStatus) params.set('status', filtroStatus)
      if (filtroTipo) params.set('tipo', filtroTipo)
      if (estabSelecionado) params.set('estabelecimentoId', estabSelecionado)
      const r = await api.get(`/conferencia-bancaria?${params}`)
      setDados(r.data)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    api.get('/empresa/estabelecimentos').then(r => setEstabelecimentos(r.data)).catch(() => {})
    carregarContasPluggy()
  }, [])

  async function carregarContasPluggy() {
    api.get('/open-finance/contas').then(r => setContasPluggy(r.data)).catch(() => {})
  }

  async function abrirPluggyWidget() {
    if (!estabSelecionado) {
      setToast({ tipo: 'erro', msg: 'Selecione um estabelecimento para conectar o banco.' })
      return
    }
    try {
      const r = await api.post('/open-finance/connect-token', {})
      setPluggyToken(r.data.accessToken)
      setShowPluggy(true)
    } catch (e: any) {
      setToast({ tipo: 'erro', msg: e?.response?.data?.erro ?? 'Erro ao iniciar conexão Pluggy. Verifique as credenciais no .env.' })
    }
  }

  async function onPluggySuccess(itemId: string) {
    setShowPluggy(false)
    setPluggyToken(null)
    try {
      const r = await api.post('/open-finance/conectar', { itemId, estabelecimentoId: estabSelecionado })
      setToast({ tipo: 'ok', msg: `Banco "${r.data.banco}" conectado — ${r.data.contas.length} conta(s) importada(s).` })
      carregarContasPluggy()
    } catch (e: any) {
      setToast({ tipo: 'erro', msg: e?.response?.data?.erro ?? 'Erro ao salvar conexão.' })
    }
  }

  async function sincronizarConta(contaId: string, banco: string) {
    setSincronizando(contaId)
    try {
      const r = await api.post(`/open-finance/sincronizar/${contaId}`, { dias: 30 })
      setToast({ tipo: 'ok', msg: `${banco}: ${r.data.importadas} transações importadas (${r.data.duplicatas} duplicatas ignoradas).` })
      carregar()
    } catch (e: any) {
      setToast({ tipo: 'erro', msg: e?.response?.data?.erro ?? 'Erro ao sincronizar.' })
    } finally { setSincronizando(null) }
  }

  async function desconectarConta(contaId: string) {
    if (!confirm('Desconectar esta conta do Open Finance?')) return
    await api.delete(`/open-finance/contas/${contaId}`).catch(() => {})
    carregarContasPluggy()
    setToast({ tipo: 'ok', msg: 'Conta desconectada.' })
  }

  useEffect(() => { carregar() }, [filtroStatus, filtroTipo, estabSelecionado])

  async function uploadOFX(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const r = await api.post(`/conferencia-bancaria/upload`, fd)
      setToast({ tipo: 'ok', msg: `${r.data.importados} lançamentos importados (${r.data.filtrados} de ${r.data.total} no arquivo).` })
      carregar()
    } catch (e: any) {
      setToast({ tipo: 'erro', msg: e?.response?.data?.erro ?? 'Erro ao importar o arquivo.' })
    } finally { setUploading(false) }
  }

  async function alterarStatus(id: string, status: string) {
    await api.patch(`/conferencia-bancaria/${id}`, { status })
    carregar()
  }

  async function conciliarAuto() {
    setConciliandoAuto(true)
    try {
      const r = await api.post('/conferencia-bancaria/conciliar-auto', {
        estabelecimentoId: estabSelecionado || undefined,
      })
      const { conciliados, divergencias, semRepasse } = r.data
      setToast({
        tipo: conciliados > 0 ? 'ok' : 'info',
        msg: `${conciliados} lançamento(s) conciliado(s) · ${divergencias} divergência(s) · ${semRepasse} sem repasse`,
      })
      carregar()
    } catch (e: any) {
      setToast({ tipo: 'erro', msg: e?.response?.data?.erro ?? 'Erro ao conciliar automaticamente' })
    } finally { setConciliandoAuto(false) }
  }

  async function excluirArquivo(nome: string) {
    if (!confirm(`Excluir todos os lançamentos do arquivo "${nome}"?`)) return
    await api.delete(`/conferencia-bancaria/arquivo/${encodeURIComponent(nome)}`)
    carregar()
  }

  // Agrupa por arquivo de origem para mostrar botão de excluir por lote
  const arquivos = [...new Set((dados?.lancamentos ?? []).map(l => l.arquivoOrigem).filter(Boolean))]

  return (
    <div className="p-6 space-y-6">

      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Conferência Bancária</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cruzamento do extrato bancário com os repasses das adquirentes</p>
        </div>
        <div className="flex gap-2">
          <select
            value={estabSelecionado}
            onChange={e => setEstabSelecionado(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
          >
            <option value="">Todos estabelecimentos</option>
            {estabelecimentos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <input
            ref={fileRef}
            type="file"
            accept=".ofx,.OFX"
            className="hidden"
            onChange={e => e.target.files?.[0] && uploadOFX(e.target.files[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Importando...' : 'Importar OFX'}
          </button>
          <button
            onClick={conciliarAuto}
            disabled={conciliandoAuto}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            {conciliandoAuto ? 'Conciliando...' : 'Conciliar Automaticamente'}
          </button>
          <button
            onClick={abrirPluggyWidget}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
          >
            <Plug className="h-4 w-4" />
            Conectar Banco
          </button>
        </div>
      </div>

      {/* Pluggy widget modal */}
      {showPluggy && pluggyToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md relative">
            <button
              onClick={() => { setShowPluggy(false); setPluggyToken(null) }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Conectar conta bancária</h2>
            <PluggyConnectWidget
              accessToken={pluggyToken}
              onSuccess={onPluggySuccess}
              onError={(e) => setToast({ tipo: 'erro', msg: `Erro Pluggy: ${e?.message ?? 'desconhecido'}` })}
              onClose={() => { setShowPluggy(false); setPluggyToken(null) }}
            />
          </div>
        </div>
      )}

      {/* Contas conectadas via Open Finance */}
      {contasPluggy.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3">Open Finance — Contas Conectadas</p>
          <div className="flex gap-3 flex-wrap">
            {contasPluggy.map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm">
                <span className="font-medium text-gray-800">{c.banco}</span>
                <span className="text-gray-400 text-xs">{c.tipoConta}</span>
                {c.ultimaSincEm && (
                  <span className="text-gray-400 text-xs">· {new Date(c.ultimaSincEm).toLocaleDateString('pt-BR')}</span>
                )}
                <button
                  onClick={() => sincronizarConta(c.id, c.banco)}
                  disabled={sincronizando === c.id}
                  className="ml-1 text-purple-500 hover:text-purple-700 disabled:opacity-40"
                  title="Sincronizar últimos 30 dias"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${sincronizando === c.id ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => desconectarConta(c.id)}
                  className="text-gray-300 hover:text-red-500"
                  title="Desconectar"
                >
                  <Unplug className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      {dados && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-600 uppercase tracking-wide font-medium">Total Créditos</p>
            <p className="text-lg font-bold text-green-800 mt-1">{fmt(dados.totalCredito)}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs text-red-600 uppercase tracking-wide font-medium">Total Débitos</p>
            <p className="text-lg font-bold text-red-800 mt-1">{fmt(dados.totalDebito)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${dados.saldo >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-xs uppercase tracking-wide font-medium ${dados.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Saldo</p>
            <p className={`text-lg font-bold mt-1 ${dados.saldo >= 0 ? 'text-blue-800' : 'text-red-800'}`}>{fmt(dados.saldo)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${dados.pendentes > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Pendentes</p>
            <p className={`text-lg font-bold mt-1 ${dados.pendentes > 0 ? 'text-yellow-700' : 'text-gray-900'}`}>{dados.pendentes}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Conciliados</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{dados.conciliados}</p>
          </div>
        </div>
      )}

      {/* Arquivos importados */}
      {arquivos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {arquivos.map(arq => (
            <div key={arq} className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full">
              {arq}
              <button onClick={() => excluirArquivo(arq!)} className="ml-1 text-gray-400 hover:text-red-500">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3">
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
        >
          <option value="">Todos status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="CONCILIADO">Conciliado</option>
          <option value="IGNORADO">Ignorado</option>
        </select>
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
        >
          <option value="">Créditos e Débitos</option>
          <option value="CREDITO">Apenas Créditos</option>
          <option value="DEBITO">Apenas Débitos</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              <th className="py-3 pl-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estabelecimento</th>
              <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Crédito</th>
              <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Débito</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-16 text-center text-gray-400 text-sm">Carregando...</td></tr>
            ) : !dados || dados.lancamentos.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <Upload className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Nenhum lançamento importado</p>
                  <p className="text-gray-400 text-xs mt-1">Importe um arquivo OFX do seu banco para começar</p>
                </td>
              </tr>
            ) : dados.lancamentos.map(l => {
              const st = STATUS_INFO[l.status]
              const isIgnorado = l.status === 'IGNORADO'
              return (
                <tr key={l.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isIgnorado ? 'opacity-40' : ''}`}>
                  <td className="py-3 pl-4 pr-4 text-sm text-gray-600">{new Date(l.data).toLocaleDateString('pt-BR')}</td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-gray-800 max-w-[260px] truncate">{l.descricao}</p>
                    {l.documento && <p className="text-xs text-gray-400">{l.documento}</p>}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">{l.estabelecimento.nome}</td>
                  <td className="py-3 px-4 text-sm text-right font-medium text-green-700">
                    {l.tipo === 'CREDITO' ? fmt(Number(l.valor)) : '—'}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-medium text-red-600">
                    {l.tipo === 'DEBITO' ? fmt(Number(l.valor)) : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      {l.status !== 'CONCILIADO' && (
                        <button
                          onClick={() => alterarStatus(l.id, 'CONCILIADO')}
                          className="p-1 text-green-500 hover:text-green-700" title="Marcar conciliado"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {l.status !== 'PENDENTE' && (
                        <button
                          onClick={() => alterarStatus(l.id, 'PENDENTE')}
                          className="p-1 text-yellow-500 hover:text-yellow-700" title="Marcar pendente"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                      )}
                      {l.status !== 'IGNORADO' && (
                        <button
                          onClick={() => alterarStatus(l.id, 'IGNORADO')}
                          className="p-1 text-gray-400 hover:text-gray-600" title="Ignorar"
                        >
                          <EyeOff className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

