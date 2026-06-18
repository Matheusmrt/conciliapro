'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Link2, CheckCircle, RotateCcw } from 'lucide-react'
import { FField, FSelect } from '@/components/ui/TablePage'
import { Toast, type ToastState } from '@/components/ui/Toast'

const MODALIDADES: Record<string, string> = {
  CREDITO_A_VISTA: 'Créd. Vista', CREDITO_PARCELADO: 'Créd. Parc.',
  CREDITO_AVISTA: 'Créd. Vista', DEBITO: 'Débito', PIX: 'PIX', VOUCHER: 'Voucher',
}

function fmt(v: number | string) {
  return (Number(v) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Venda   = { id: string; nsu: string; dataVenda: string; valor: number; bandeira: string; modalidade: string; adquirente: string; estabelecimento: { nome: string } }
type Repasse = { id: string; nsu: string; dataVenda: string; valorBruto: number; bandeira: string; modalidade: string; adquirente: string; parcela: number; totalParcelas: number; estabelecimento: { nome: string } }

export default function ConciliacaoManualPage() {
  const [vendas,    setVendas]    = useState<Venda[]>([])
  const [repasses,  setRepasses]  = useState<Repasse[]>([])
  const [loading,   setLoading]   = useState(true)
  const [vendaSel,  setVendaSel]  = useState<string | null>(null)
  const [repSel,    setRepSel]    = useState<string | null>(null)
  const [obs,       setObs]       = useState('')
  const [salvando,  setSalvando]  = useState(false)
  const [filtroAdq, setFiltroAdq] = useState('')
  const [toast,     setToast]     = useState<ToastState | null>(null)

  async function carregar() {
    setLoading(true)
    try {
      const params = filtroAdq ? `?adquirente=${filtroAdq}` : ''
      const [rv, rr] = await Promise.all([
        api.get(`/conciliacao-manual/vendas-pendentes${params}`),
        api.get(`/conciliacao-manual/repasses-pendentes${params}`),
      ])
      setVendas(rv.data)
      setRepasses(rr.data)
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [filtroAdq])

  async function conciliar() {
    if (!vendaSel && !repSel) return
    setSalvando(true)
    try {
      const body: any = { observacao: obs }
      if (vendaSel) body.vendaId = vendaSel
      if (repSel)   body.repasseId = repSel
      await api.post('/conciliacao-manual/conciliar', body)
      setVendaSel(null); setRepSel(null); setObs('')
      carregar()
    } catch (e: any) {
      setToast({ tipo: 'erro', msg: e?.response?.data?.erro ?? 'Erro ao conciliar' })
    } finally { setSalvando(false) }
  }

  const adquirentes = [...new Set([...vendas.map(v => v.adquirente), ...repasses.map(r => r.adquirente)])].sort()
  const vendaSel_   = vendas.find(v => v.id === vendaSel)
  const repSel_     = repasses.find(r => r.id === repSel)

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-black text-gray-900">Conciliação Manual</h1>
          <p className="text-xs text-gray-400 mt-0.5">Vincule manualmente vendas sem repasse a repasses sem venda</p>
        </div>
        <div className="flex items-center gap-3">
          <FField label="Adquirente">
            <FSelect value={filtroAdq} onChange={e => setFiltroAdq(e.target.value)}>
              <option value="">Todos</option>
              {adquirentes.map(a => <option key={a} value={a}>{a}</option>)}
            </FSelect>
          </FField>
          <span className="text-xs text-gray-400 mt-4">
            <span className="font-semibold text-gray-700">{vendas.length}</span> vendas ·{' '}
            <span className="font-semibold text-gray-700">{repasses.length}</span> repasses
          </span>
        </div>
      </div>

      {/* Painel de vinculação */}
      {(vendaSel || repSel) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-blue-900">
              {vendaSel && repSel ? 'Vincular venda ao repasse' : vendaSel ? 'Marcar venda sem repasse' : 'Marcar repasse sem venda'}
            </p>
            {vendaSel_ && <p className="text-xs text-blue-600 mt-0.5 truncate">Venda: NSU {vendaSel_.nsu} · {fmt(vendaSel_.valor)} · {vendaSel_.adquirente}</p>}
            {repSel_   && <p className="text-xs text-blue-600 mt-0.5 truncate">Repasse: NSU {repSel_.nsu} · {fmt(repSel_.valorBruto)} · {repSel_.adquirente}</p>}
          </div>
          <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Observação (opcional)"
            className="border border-blue-200 rounded-lg px-3 py-2 text-xs bg-white w-56 focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900" />
          <button onClick={conciliar} disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0">
            <Link2 className="h-4 w-4" />
            {salvando ? 'Salvando...' : 'Conciliar'}
          </button>
          <button onClick={() => { setVendaSel(null); setRepSel(null) }}
            className="p-2 text-gray-300 hover:text-gray-500 transition-colors">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Duas colunas */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">

        {/* Vendas sem repasse */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Vendas sem Repasse</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Clique para selecionar</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : vendas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-300 mb-2" />
                <p className="text-sm font-semibold text-gray-400">Nenhuma venda pendente</p>
              </div>
            ) : vendas.map(v => (
              <div key={v.id} onClick={() => setVendaSel(s => s === v.id ? null : v.id)}
                className={`px-4 py-3 cursor-pointer transition-colors text-[11px]
                  ${vendaSel === v.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800">NSU {v.nsu}</p>
                    <p className="text-gray-500 mt-0.5">{new Date(v.dataVenda).toLocaleDateString('pt-BR')} · {v.adquirente} · {MODALIDADES[v.modalidade] ?? v.modalidade}</p>
                    <p className="text-gray-400">{v.bandeira} · {v.estabelecimento.nome}</p>
                  </div>
                  <p className="font-black text-gray-900 tabular-nums shrink-0">{fmt(v.valor)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Repasses sem venda */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Repasses sem Venda</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Clique para selecionar</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : repasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-300 mb-2" />
                <p className="text-sm font-semibold text-gray-400">Nenhum repasse pendente</p>
              </div>
            ) : repasses.map(r => (
              <div key={r.id} onClick={() => setRepSel(s => s === r.id ? null : r.id)}
                className={`px-4 py-3 cursor-pointer transition-colors text-[11px]
                  ${repSel === r.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800">NSU {r.nsu}</p>
                    <p className="text-gray-500 mt-0.5">
                      {new Date(r.dataVenda).toLocaleDateString('pt-BR')} · {r.adquirente} · {MODALIDADES[r.modalidade] ?? r.modalidade}
                      {r.totalParcelas > 1 && ` · ${r.parcela}/${r.totalParcelas}x`}
                    </p>
                    <p className="text-gray-400">{r.bandeira} · {r.estabelecimento.nome}</p>
                  </div>
                  <p className="font-black text-gray-900 tabular-nums shrink-0">{fmt(r.valorBruto)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

