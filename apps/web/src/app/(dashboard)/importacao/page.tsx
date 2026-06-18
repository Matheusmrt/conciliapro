'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { Upload, CheckCircle, AlertTriangle, FileText, X, Play, Wifi, RefreshCw } from 'lucide-react'
import { FRow, FField, FSelect, FInput, fmtDate } from '@/components/ui/TablePage'
import { Toast, type ToastState } from '@/components/ui/Toast'

const ADQUIRENTES = [
  { group: 'Cartões de Crédito/Débito' },
  { value: 'CIELO',      label: 'Cielo',                   ext: '.txt, .dat, .edi' },
  { value: 'REDE',       label: 'Rede',                    ext: '.txt, .dat, .edi' },
  { value: 'STONE',      label: 'Stone',                   ext: '.txt, .dat, .edi' },
  { value: 'GETNET',     label: 'GetNet',                  ext: '.txt, .dat, .edi' },
  { value: 'PAGSEGURO',  label: 'PagSeguro',               ext: '.txt, .dat' },
  { value: 'SAFRA',      label: 'Safra',                   ext: '.txt, .dat' },
  { value: 'BIN',        label: 'Bin',                     ext: '.txt, .dat' },
  { group: 'Benefícios (CSV do portal)' },
  { value: 'ALELO',         label: 'Alelo',                ext: '.csv' },
  { value: 'PLUXEE',        label: 'Pluxee (Sodexo)',      ext: '.csv' },
  { value: 'VR_BENEFICIOS', label: 'VR Benefícios',        ext: '.csv' },
  { value: 'TICKET',        label: 'Ticket',               ext: '.csv' },
  { value: 'VEROCARD',      label: 'Verocard',             ext: '.csv' },
  { value: 'UP_BRASIL',     label: 'Up Brasil / Policard', ext: '.csv' },
  { value: 'BEN_VISA_VALE', label: 'Ben Visa Vale',        ext: '.csv' },
]

const PVS_REDE = [
  { pv: '9060898',  label: '9060898 — Matriz' },
  { pv: '13501968', label: '13501968' },
  { pv: '36477761', label: '36477761' },
  { pv: '84700610', label: '84700610' },
  { pv: '87076195', label: '87076195' },
]

interface Estabelecimento { id: string; nome: string; cnpj: string }
interface Arquivo { id: string; nome: string; adquirente: string; totalImportadas: number; status: string; criadoEm: string }

export default function ImportacaoPage() {
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([])
  const [arquivo, setArquivo]         = useState<File | null>(null)
  const [adquirente, setAdquirente]   = useState('REDE')
  const [estabId, setEstabId]         = useState('')
  const [status, setStatus]           = useState<'idle' | 'enviando' | 'ok' | 'erro'>('idle')
  const [resultado, setResultado]     = useState<any>(null)
  const [arquivos, setArquivos]       = useState<Arquivo[]>([])
  const [executando, setExecutando]   = useState(false)
  const [drag, setDrag]               = useState(false)
  const [toast, setToast]             = useState<ToastState | null>(null)

  // Coleta Rede API
  const [pvSelecionado, setPvSelecionado] = useState(PVS_REDE[0].pv)
  const [apiInicio, setApiInicio]     = useState(() => new Date(new Date().setDate(1)).toISOString().slice(0, 10))
  const [apiFim, setApiFim]           = useState(() => new Date().toISOString().slice(0, 10))
  const [apiStatus, setApiStatus]     = useState<'idle' | 'buscando' | 'ok' | 'erro'>('idle')
  const [apiResultado, setApiResultado] = useState<any>(null)

  // Opt-in
  const [optinStatus, setOptinStatus] = useState<'idle' | 'enviando' | 'ok' | 'erro'>('idle')
  const [optinResultado, setOptinResultado] = useState<any>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get('/empresa/estabelecimentos').then(r => {
      setEstabelecimentos(r.data)
      if (r.data.length > 0) setEstabId(r.data[0].id)
    }).catch(() => {})
    carregarArquivos()
  }, [])

  function carregarArquivos() {
    api.get('/importacao/arquivos').then(r => setArquivos(r.data)).catch(() => {})
  }

  async function enviar() {
    if (!arquivo || !estabId) return
    setStatus('enviando')
    const form = new FormData()
    form.append('file', arquivo)
    try {
      const r = await api.post(`/importacao/upload?estabelecimentoId=${estabId}&adquirente=${adquirente}`, form)
      setResultado(r.data)
      setStatus('ok')
      setArquivo(null)
      carregarArquivos()
    } catch { setStatus('erro') }
  }

  async function executarConciliacao() {
    if (!estabId) return
    setExecutando(true)
    try {
      await api.post(`/conciliacao/executar/${estabId}`)
      setToast({ tipo: 'ok', msg: 'Conciliação executada com sucesso!' })
    } catch { setToast({ tipo: 'erro', msg: 'Erro ao executar conciliação.' }) }
    finally { setExecutando(false) }
  }

  async function solicitarOptin() {
    setOptinStatus('enviando')
    setOptinResultado(null)
    try {
      const r = await api.post('/rede-acesso/solicitar-todos')
      setOptinResultado(r.data)
      setOptinStatus('ok')
    } catch (e: any) {
      setOptinStatus('erro')
      setOptinResultado({ erro: e?.response?.data?.erro ?? e.message })
    }
  }

  async function buscarViaApi() {
    if (!estabId) return
    setApiStatus('buscando')
    setApiResultado(null)
    try {
      const r = await api.post('/rede-coleta/vendas', {
        parentCompanyNumber: pvSelecionado,
        estabelecimentoId: estabId,
        startDate: apiInicio,
        endDate: apiFim,
      })
      setApiResultado(r.data)
      setApiStatus('ok')
      carregarArquivos()
    } catch (e: any) {
      setApiStatus('erro')
      setApiResultado({ erro: e?.response?.data?.message ?? e.message })
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) setArquivo(f)
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">

      {/* ── Upload EDI ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-bold text-gray-800">Importar Arquivo EDI</p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Upload manual de arquivos EDI das adquirentes</p>
        </div>
        <div className="p-5 space-y-4">
          <FRow>
            <FField label="Adquirente">
              <FSelect value={adquirente} onChange={e => setAdquirente(e.target.value)}>
                {ADQUIRENTES.map((a, i) =>
                  'group' in a
                    ? <optgroup key={i} label={a.group} />
                    : <option key={a.value} value={a.value}>{a.label}</option>
                )}
              </FSelect>
            </FField>
            <FField label="Estabelecimento">
              <FSelect value={estabId} onChange={e => setEstabId(e.target.value)}>
                {estabelecimentos.length === 0 && <option value="">Nenhum estabelecimento</option>}
                {estabelecimentos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </FSelect>
            </FField>
          </FRow>

          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
              ${drag ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30'}`}
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            {arquivo ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-gray-800">{arquivo.name}</span>
                <button onClick={e => { e.stopPropagation(); setArquivo(null); setStatus('idle') }}
                  className="text-gray-300 hover:text-gray-500 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-7 w-7 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-500">Clique ou arraste o arquivo aqui</p>
                <p className="text-xs text-gray-400 mt-1">Aceita .txt, .dat, .edi, .csv</p>
              </>
            )}
            <input ref={inputRef} type="file" accept=".txt,.dat,.edi,.csv" className="hidden"
              onChange={e => { setArquivo(e.target.files?.[0] ?? null); setStatus('idle') }} />
          </div>

          <div className="flex gap-3">
            <button onClick={enviar} disabled={!arquivo || !estabId || status === 'enviando'}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40
                text-white text-sm font-bold py-2.5 rounded-lg transition-colors shadow-sm">
              <Upload className="h-4 w-4" />
              {status === 'enviando' ? 'Importando...' : 'Importar Arquivo'}
            </button>
            <button onClick={executarConciliacao} disabled={!estabId || executando}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40
                text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
              <Play className="h-4 w-4" />
              {executando ? 'Executando...' : 'Conciliar'}
            </button>
          </div>

          {status === 'ok' && resultado && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Arquivo importado com sucesso!</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {resultado.totalTransacoes} transações importadas
                  {resultado.erros > 0 && ` · ${resultado.erros} linhas com erro`}
                </p>
              </div>
            </div>
          )}
          {status === 'erro' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">Erro ao importar o arquivo. Verifique o formato e tente novamente.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Coleta via API Rede ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-bold text-gray-800">Coleta via API Rede</p>
            </div>
          <p className="text-xs text-gray-400 mt-0.5">Busca vendas diretamente da Rede sem precisar de arquivo EDI</p>
          <div className="mt-2 flex items-center gap-3">
            <button onClick={solicitarOptin} disabled={optinStatus === 'enviando'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50
                text-white text-xs font-bold rounded-lg transition-colors">
              <Wifi className="h-3.5 w-3.5" />
              {optinStatus === 'enviando' ? 'Solicitando...' : 'Solicitar Opt-in nos 5 PVs'}
            </button>
            {optinStatus === 'ok' && <span className="text-xs text-emerald-600 font-medium">✓ Solicitações enviadas — aguarde aprovação da Rede</span>}
            {optinStatus === 'erro' && <span className="text-xs text-red-600">{optinResultado?.erro}</span>}
          </div>
        </div>
        <div className="p-5 space-y-4">
          <FRow>
            <FField label="PV (Ponto de Venda)">
              <FSelect value={pvSelecionado} onChange={e => setPvSelecionado(e.target.value)} className="w-80">
                {PVS_REDE.map(p => <option key={p.pv} value={p.pv}>{p.label}</option>)}
              </FSelect>
            </FField>
          </FRow>
          <FRow>
            <FField label="Período">
              <div className="flex items-center gap-2">
                <FInput type="date" value={apiInicio} onChange={e => setApiInicio(e.target.value)} />
                <span className="text-xs text-gray-400">até</span>
                <FInput type="date" value={apiFim} onChange={e => setApiFim(e.target.value)} />
              </div>
            </FField>
            <FField label="Estabelecimento">
              <FSelect value={estabId} onChange={e => setEstabId(e.target.value)}>
                {estabelecimentos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </FSelect>
            </FField>
          </FRow>

          <button onClick={buscarViaApi} disabled={!estabId || apiStatus === 'buscando'}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40
              text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-sm">
            <RefreshCw className={`h-4 w-4 ${apiStatus === 'buscando' ? 'animate-spin' : ''}`} />
            {apiStatus === 'buscando' ? 'Buscando...' : 'Buscar Vendas'}
          </button>

          {apiStatus === 'ok' && apiResultado && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Vendas importadas via API!</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {apiResultado.importadas} importadas · {apiResultado.ignoradas} duplicadas ignoradas
                </p>
              </div>
            </div>
          )}
          {apiStatus === 'erro' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{apiResultado?.erro ?? 'Erro ao buscar dados da Rede. Verifique as credenciais de produção.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Histórico ─────────────────────────────────────── */}
      {arquivos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-800">Histórico de Importações</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                <th className="text-left px-5 py-2.5">Arquivo</th>
                <th className="text-left px-4 py-2.5">Adquirente</th>
                <th className="text-right px-4 py-2.5">Transações</th>
                <th className="text-left px-4 py-2.5">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {arquivos.map((a: Arquivo) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-700">{a.nome}</td>
                  <td className="px-4 py-3 text-gray-500">{a.adquirente}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">{a.totalImportadas.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-gray-400">{fmtDate(a.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
