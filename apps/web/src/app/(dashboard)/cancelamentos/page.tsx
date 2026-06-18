'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import {
  FilterPanel, TabBar, THead, TotalRow, EmptySearch, Spinner,
  FRow, FField, FInput, FSelect, fmtBRL, fmtDate, StatusBadge
} from '@/components/ui/TablePage'

const ADQUIRENTES = ['CIELO', 'REDE', 'STONE', 'GETNET', 'PAGSEGURO', 'SAFRA', 'BIN', 'ALELO', 'PLUXEE']
const BANDEIRAS   = ['VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'CABAL']

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDENTE:   { label: 'Pendente',   cls: 'bg-amber-100 text-amber-700' },
  PROCESSADO: { label: 'Processado', cls: 'bg-emerald-100 text-emerald-700' },
  DIVERGENTE: { label: 'Divergente', cls: 'bg-red-100 text-red-700' },
}

export default function CancelamentosPage() {
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [aba, setAba] = useState('Todos')

  const hoje = new Date()
  const [dataInicio, setDataInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10))
  const [dataFim, setDataFim]       = useState(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10))
  const [adquirente, setAdquirente] = useState('')
  const [bandeira, setBandeira]     = useState('')
  const [nsu, setNsu]               = useState('')

  async function pesquisar(abaOverride?: string) {
    setLoading(true); setDados(null)
    try {
      const a = abaOverride ?? aba
      const qs = new URLSearchParams({ limit: '500' })
      if (dataInicio) qs.set('dataInicio', dataInicio)
      if (dataFim)    qs.set('dataFim', dataFim)
      if (adquirente) qs.set('adquirente', adquirente)
      if (bandeira)   qs.set('bandeira', bandeira)
      if (nsu)        qs.set('nsu', nsu)
      if (a !== 'Todos') qs.set('status', a.toUpperCase())
      const r = await api.get(`/cancelamentos?${qs}`)
      setDados(r.data)
    } finally { setLoading(false) }
  }

  function mudarAba(label: string) { setAba(label); if (dados) pesquisar(label) }

  function exportarCSV() {
    const lista: any[] = Array.isArray(dados) ? dados : dados?.dados ?? []
    const rows = [['NSU Original', 'NSU Cancel.', 'Data Venda', 'Data Cancel.', 'Adquirente', 'Bandeira', 'Vlr. Original', 'Vlr. Cancelado', 'Status']]
    for (const c of lista) {
      rows.push([c.nsuOriginal ?? '', c.nsu ?? '', fmtDate(c.dataVendaOriginal), fmtDate(c.dataCancelamento),
        c.adquirente ?? '', c.bandeira ?? '',
        fmtBRL(Number(c.valorOriginal ?? 0)), fmtBRL(Number(c.valorCancelado ?? c.valorOriginal ?? 0)), c.status ?? ''])
    }
    const csv = rows.map(r => r.join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `cancelamentos-${dataInicio}-${dataFim}.csv`; a.click()
  }

  const lista: any[] = Array.isArray(dados) ? dados : dados?.dados ?? []
  const totalValor = lista.reduce((s, c) => s + Number(c.valorCancelado ?? c.valorOriginal ?? 0), 0)

  return (
    <div className="flex flex-col h-full">
      <FilterPanel onSearch={() => pesquisar()} loading={loading} count={lista.length}>
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
          <FField label="NSU">
            <FInput placeholder="NSU original" value={nsu} onChange={e => setNsu(e.target.value)} className="w-40" />
          </FField>
        </FRow>
      </FilterPanel>

      {!dados && !loading && <EmptySearch />}
      {loading && <Spinner />}

      {dados && !loading && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <TabBar
            tabs={['Todos', 'Pendente', 'Processado', 'Divergente'].map(l => ({ label: l }))}
            active={aba} onChange={mudarAba} onExport={exportarCSV}
          />
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[11px] border-collapse min-w-[800px]">
              <THead cols={[
                { label: 'NSU Original' }, { label: 'NSU Cancel.' },
                { label: 'Data Venda' }, { label: 'Data Cancel.' },
                { label: 'Adquirente' }, { label: 'Bandeira' },
                { label: 'Vlr. Original', right: true }, { label: 'Vlr. Cancelado', right: true }, { label: 'Status' },
              ]} />
              <tbody>
                {lista.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-gray-400">Nenhum cancelamento encontrado</td></tr>
                ) : lista.map((c: any, i: number) => (
                  <tr key={c.id ?? i} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-2 px-3 font-mono text-gray-500">{c.nsuOriginal ?? '—'}</td>
                    <td className="py-2 px-3 font-mono text-gray-500">{c.nsu ?? '—'}</td>
                    <td className="py-2 px-3 text-gray-600">{fmtDate(c.dataVendaOriginal)}</td>
                    <td className="py-2 px-3 text-gray-600">{fmtDate(c.dataCancelamento)}</td>
                    <td className="py-2 px-3 font-medium text-gray-700">{c.adquirente ?? '—'}</td>
                    <td className="py-2 px-3"><span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-medium">{c.bandeira ?? '—'}</span></td>
                    <td className="py-2 px-3 text-right text-gray-600">{fmtBRL(Number(c.valorOriginal ?? 0))}</td>
                    <td className="py-2 px-3 text-right font-semibold text-red-600">{fmtBRL(Number(c.valorCancelado ?? c.valorOriginal ?? 0))}</td>
                    <td className="py-2 px-3"><StatusBadge status={c.status ?? 'PENDENTE'} map={STATUS_MAP} /></td>
                  </tr>
                ))}
              </tbody>
              {lista.length > 0 && (
                <TotalRow cells={[
                  `TOTAL — ${lista.length} registros`,
                  '', '', '', '', '',
                  fmtBRL(lista.reduce((s, c) => s + Number(c.valorOriginal ?? 0), 0)),
                  fmtBRL(totalValor), '',
                ]} />
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
