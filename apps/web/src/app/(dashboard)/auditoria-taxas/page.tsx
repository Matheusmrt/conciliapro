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
  OK:        { label: 'OK',          cls: 'bg-emerald-100 text-emerald-700' },
  ACIMA:     { label: 'Taxa Acima',  cls: 'bg-red-100 text-red-700' },
  ABAIXO:    { label: 'Taxa Abaixo', cls: 'bg-amber-100 text-amber-700' },
  SEM_CONTRATO: { label: 'Sem Contrato', cls: 'bg-gray-100 text-gray-600' },
}

export default function AuditoriaTaxasPage() {
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [aba, setAba] = useState('Todos')

  const hoje = new Date()
  const [dataInicio, setDataInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10))
  const [dataFim, setDataFim]       = useState(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10))
  const [adquirente, setAdquirente] = useState('')
  const [bandeira, setBandeira]     = useState('')

  async function pesquisar(abaOverride?: string) {
    setLoading(true); setDados(null)
    try {
      const a = abaOverride ?? aba
      const qs = new URLSearchParams({ limit: '500' })
      if (dataInicio) qs.set('dataInicio', dataInicio)
      if (dataFim)    qs.set('dataFim', dataFim)
      if (adquirente) qs.set('adquirente', adquirente)
      if (bandeira)   qs.set('bandeira', bandeira)
      if (a === 'Com Divergência') qs.set('apenasDivergentes', 'true')
      const r = await api.get(`/auditoria/taxas?${qs}`)
      setDados(r.data)
    } finally { setLoading(false) }
  }

  function mudarAba(label: string) { setAba(label); if (dados) pesquisar(label) }

  function exportarCSV() {
    const lista: any[] = Array.isArray(dados) ? dados : dados?.dados ?? []
    const rows = [['NSU', 'Data', 'Adquirente', 'Bandeira', 'Modalidade', 'Taxa Cobrada', 'Taxa Contratada', 'Diferença', 'Vlr. Bruto', 'Status']]
    for (const r of lista) {
      rows.push([r.nsu ?? '', fmtDate(r.dataPagamento), r.adquirente ?? '', r.bandeira ?? '', r.modalidade ?? '',
        (Number(r.taxaCobrada ?? 0) * 100).toFixed(3) + '%',
        (Number(r.taxaContratada ?? 0) * 100).toFixed(3) + '%',
        (Number(r.diferencaTaxa ?? 0) * 100).toFixed(3) + '%',
        fmtBRL(Number(r.valorBruto ?? 0)), r.statusTaxa ?? ''])
    }
    const csv = rows.map(r => r.join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `auditoria-taxas-${dataInicio}-${dataFim}.csv`; a.click()
  }

  const lista: any[] = Array.isArray(dados) ? dados : dados?.dados ?? []
  const comDivergencia = lista.filter(r => r.statusTaxa && r.statusTaxa !== 'OK').length
  const totalImpacto   = lista.reduce((s, r) => s + Number(r.valorImpacto ?? 0), 0)

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
        </FRow>
      </FilterPanel>

      {!dados && !loading && <EmptySearch />}
      {loading && <Spinner />}

      {dados && !loading && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <TabBar
            tabs={[
              { label: 'Todos', count: lista.length },
              { label: 'Com Divergência', count: comDivergencia },
              { label: 'OK', count: lista.length - comDivergencia },
            ]}
            active={aba} onChange={mudarAba} onExport={exportarCSV}
          />
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[11px] border-collapse min-w-[900px]">
              <THead cols={[
                { label: 'NSU' }, { label: 'Data Pgto' }, { label: 'Adquirente' },
                { label: 'Bandeira' }, { label: 'Modalidade' },
                { label: 'Taxa Cobrada', right: true }, { label: 'Taxa Contrato', right: true }, { label: 'Diferença', right: true },
                { label: 'Vlr. Bruto', right: true }, { label: 'Vlr. Impacto', right: true }, { label: 'Status' },
              ]} />
              <tbody>
                {lista.length === 0 ? (
                  <tr><td colSpan={11} className="py-12 text-center text-gray-400">Nenhum registro encontrado</td></tr>
                ) : lista.map((r: any, i: number) => {
                  const diff = Number(r.diferencaTaxa ?? 0)
                  return (
                    <tr key={r.id ?? i} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-2 px-3 font-mono text-gray-500">{r.nsu ?? '—'}</td>
                      <td className="py-2 px-3 text-gray-600">{fmtDate(r.dataPagamento)}</td>
                      <td className="py-2 px-3 font-medium text-gray-700">{r.adquirente ?? '—'}</td>
                      <td className="py-2 px-3"><span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-medium">{r.bandeira ?? '—'}</span></td>
                      <td className="py-2 px-3 text-gray-500">{r.modalidade ?? '—'}</td>
                      <td className="py-2 px-3 text-right font-semibold text-gray-800">{(Number(r.taxaCobrada ?? 0) * 100).toFixed(3)}%</td>
                      <td className="py-2 px-3 text-right text-gray-500">{(Number(r.taxaContratada ?? 0) * 100).toFixed(3)}%</td>
                      <td className={`py-2 px-3 text-right font-semibold ${Math.abs(diff) > 0.0001 ? 'text-red-600' : 'text-gray-400'}`}>
                        {diff !== 0 ? `${(diff * 100).toFixed(3)}%` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-700">{fmtBRL(Number(r.valorBruto ?? 0))}</td>
                      <td className={`py-2 px-3 text-right font-semibold ${Number(r.valorImpacto ?? 0) < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {r.valorImpacto ? fmtBRL(Number(r.valorImpacto)) : '—'}
                      </td>
                      <td className="py-2 px-3"><StatusBadge status={r.statusTaxa ?? 'OK'} map={STATUS_MAP} /></td>
                    </tr>
                  )
                })}
              </tbody>
              {lista.length > 0 && (
                <TotalRow cells={[
                  `TOTAL — ${lista.length} registros · ${comDivergencia} divergências`,
                  '', '', '', '', '', '', '',
                  fmtBRL(lista.reduce((s, r) => s + Number(r.valorBruto ?? 0), 0)),
                  fmtBRL(totalImpacto), '',
                ]} />
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
