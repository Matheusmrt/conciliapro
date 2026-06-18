'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import {
  FilterPanel, TabBar, THead, TotalRow, EmptySearch, Spinner,
  FRow, FField, FInput, FSelect, fmtBRL, fmtDate, StatusBadge
} from '@/components/ui/TablePage'

const ADQUIRENTES = ['CIELO', 'REDE', 'STONE', 'GETNET', 'PAGSEGURO', 'SAFRA', 'BIN', 'ALELO', 'PLUXEE']
const BANDEIRAS   = ['VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD']

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  CONCILIADA:        { label: 'Conciliada',      cls: 'bg-emerald-100 text-emerald-700' },
  DIVERGENCIA_VALOR: { label: 'Div. Valor',       cls: 'bg-amber-100 text-amber-700' },
  DIVERGENCIA_TAXA:  { label: 'Div. Taxa',        cls: 'bg-amber-100 text-amber-700' },
  DIVERGENCIA_PRAZO: { label: 'Div. Prazo',       cls: 'bg-orange-100 text-orange-700' },
  VENDA_SEM_REPASSE: { label: 'Sem Repasse',      cls: 'bg-red-100 text-red-700' },
  REPASSE_SEM_VENDA: { label: 'Sem Venda',        cls: 'bg-red-100 text-red-700' },
}

const ABAS = [
  { key: '', label: 'Todos' },
  { key: 'CONCILIADA', label: 'Conciliadas' },
  { key: 'DIVERGENCIA_VALOR', label: 'Div. Valor' },
  { key: 'DIVERGENCIA_TAXA', label: 'Div. Taxa' },
  { key: 'VENDA_SEM_REPASSE', label: 'Sem Repasse' },
  { key: 'REPASSE_SEM_VENDA', label: 'Sem Venda' },
]

export default function ConciliacaoPage() {
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [aba, setAba] = useState('')

  // Filtros
  const hoje = new Date()
  const [dataInicio, setDataInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10))
  const [dataFim, setDataFim]       = useState(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10))
  const [adquirente, setAdquirente] = useState('')
  const [bandeira, setBandeira]     = useState('')
  const [nsu, setNsu]               = useState('')

  async function pesquisar(statusOverride?: string) {
    setLoading(true)
    setDados(null)
    try {
      const status = statusOverride !== undefined ? statusOverride : aba
      const qs = new URLSearchParams({ limit: '500' })
      if (dataInicio) qs.set('dataInicio', dataInicio)
      if (dataFim)    qs.set('dataFim', dataFim)
      if (status)     qs.set('status', status)
      if (adquirente) qs.set('adquirente', adquirente)
      if (bandeira)   qs.set('bandeira', bandeira)
      if (nsu)        qs.set('nsu', nsu)
      const r = await api.get(`/conciliacao?${qs}`)
      setDados(r.data)
    } finally { setLoading(false) }
  }

  function mudarAba(label: string) {
    const key = ABAS.find(a => a.label === label)?.key ?? ''
    setAba(key)
    if (dados) pesquisar(key)
  }

  function exportarCSV() {
    if (!dados?.dados) return
    const rows = [['NSU', 'Data Venda', 'Data Pagamento', 'Adquirente', 'Bandeira', 'Modalidade', 'Vlr. Bruto', 'Vlr. Repasse', 'Status']]
    for (const c of dados.dados) {
      const v = c.venda ?? {}; const r = c.repasse ?? {}
      rows.push([v.nsu ?? r.nsu ?? '', fmtDate(v.dataVenda), fmtDate(r.dataPagamento),
        v.adquirente ?? r.adquirente ?? '', r.bandeira ?? '', r.modalidade ?? '',
        fmtBRL(Number(v.valorBruto ?? 0)), fmtBRL(Number(r.valorBruto ?? 0)), c.status])
    }
    const csv = rows.map(r => r.join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `conciliacao-${dataInicio}-${dataFim}.csv`; a.click()
  }

  const abaAtual = ABAS.find(a => a.key === aba)?.label ?? 'Todos'
  const contadores = dados?.contadores ?? {}
  const tabsComCount = ABAS.map(a => ({
    label: a.label,
    count: dados ? (a.key === '' ? dados.total : contadores[a.key] ?? 0) : undefined,
  }))

  return (
    <div className="flex flex-col h-full">
      <FilterPanel onSearch={() => pesquisar()} loading={loading} count={dados?.total}>
        <FRow>
          <FField label="Período">
            <div className="flex items-center gap-2">
              <FInput type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              <span className="text-xs text-gray-400">até</span>
              <FInput type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
          </FField>
          <FField label="Adquirente">
            <FSelect value={adquirente} onChange={e => setAdquirente(e.target.value)}>
              <option value="">Todos</option>
              {ADQUIRENTES.map(a => <option key={a}>{a}</option>)}
            </FSelect>
          </FField>
          <FField label="Bandeira">
            <FSelect value={bandeira} onChange={e => setBandeira(e.target.value)}>
              <option value="">Todas</option>
              {BANDEIRAS.map(b => <option key={b}>{b}</option>)}
            </FSelect>
          </FField>
          <FField label="NSU / Código">
            <FInput placeholder="Ex: 123456789" value={nsu} onChange={e => setNsu(e.target.value)} className="w-40" />
          </FField>
          <FField label="Status">
            <FSelect value={aba} onChange={e => setAba(e.target.value)}>
              {ABAS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
            </FSelect>
          </FField>
        </FRow>
      </FilterPanel>

      {!dados && !loading && <EmptySearch />}
      {loading && <Spinner />}

      {dados && !loading && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <TabBar tabs={tabsComCount} active={abaAtual} onChange={mudarAba} onExport={exportarCSV} />
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[11px] border-collapse min-w-[900px]">
              <THead cols={[
                { label: 'NSU / Código' },
                { label: 'Data Venda' },
                { label: 'Data Pagamento' },
                { label: 'Adquirente' },
                { label: 'Bandeira' },
                { label: 'Modalidade' },
                { label: 'Vlr. Venda', right: true },
                { label: 'Vlr. Repasse', right: true },
                { label: 'Diferença', right: true },
                { label: 'Status' },
              ]} />
              <tbody>
                {dados.dados.length === 0 ? (
                  <tr><td colSpan={10} className="py-12 text-center text-gray-400">Nenhum registro encontrado</td></tr>
                ) : dados.dados.map((c: any, i: number) => {
                  const v = c.venda ?? {}
                  const r = c.repasse ?? {}
                  const vlrVenda   = Number(v.valorBruto ?? 0)
                  const vlrRepasse = Number(r.valorBruto ?? 0)
                  const diff = vlrRepasse - vlrVenda
                  return (
                    <tr key={c.id ?? i} className={`border-b border-gray-100 text-[11px] hover:bg-gray-50
                      ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      <td className="py-2 px-3 font-mono text-gray-600">{v.nsu ?? r.nsu ?? '—'}</td>
                      <td className="py-2 px-3 text-gray-600">{fmtDate(v.dataVenda)}</td>
                      <td className="py-2 px-3 text-gray-600">{fmtDate(r.dataPagamento)}</td>
                      <td className="py-2 px-3 text-gray-700 font-medium">{v.adquirente ?? r.adquirente ?? '—'}</td>
                      <td className="py-2 px-3 text-gray-600">{r.bandeira ?? '—'}</td>
                      <td className="py-2 px-3 text-gray-500">{r.modalidade?.replace('_', ' ') ?? '—'}</td>
                      <td className="py-2 px-3 text-right font-semibold text-gray-800">{vlrVenda ? fmtBRL(vlrVenda) : '—'}</td>
                      <td className="py-2 px-3 text-right font-semibold text-gray-800">{vlrRepasse ? fmtBRL(vlrRepasse) : '—'}</td>
                      <td className={`py-2 px-3 text-right font-semibold ${Math.abs(diff) > 50 ? 'text-red-600' : 'text-gray-400'}`}>
                        {vlrVenda && vlrRepasse ? fmtBRL(diff) : '—'}
                      </td>
                      <td className="py-2 px-3">
                        <StatusBadge status={c.status} map={STATUS_MAP} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {dados.dados.length > 0 && (
                <TotalRow cells={[
                  `TOTAL — ${dados.total.toLocaleString('pt-BR')} registros`,
                  '', '', '', '', '',
                  fmtBRL(dados.dados.reduce((s: number, c: any) => s + Number(c.venda?.valorBruto ?? 0), 0)),
                  fmtBRL(dados.dados.reduce((s: number, c: any) => s + Number(c.repasse?.valorBruto ?? 0), 0)),
                  '', '',
                ]} />
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
