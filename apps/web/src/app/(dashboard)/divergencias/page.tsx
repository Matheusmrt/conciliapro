'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import {
  FilterPanel, TabBar, THead, TotalRow, EmptySearch, Spinner,
  FRow, FField, FInput, FSelect, fmtBRL, fmtDate, StatusBadge
} from '@/components/ui/TablePage'

const TIPOS_MAP: Record<string, { label: string; cls: string }> = {
  VALOR_DIFERENTE:       { label: 'Valor Diferente',      cls: 'bg-amber-100 text-amber-700' },
  TAXA_MAIOR_CONTRATADA: { label: 'Taxa Alta',             cls: 'bg-red-100 text-red-700' },
  VENDA_NAO_REPASSADA:   { label: 'Sem Repasse',           cls: 'bg-red-100 text-red-700' },
  PRAZO_ATRASADO:        { label: 'Prazo Atrasado',        cls: 'bg-orange-100 text-orange-700' },
  PRAZO_ANTECIPADO:      { label: 'Prazo Antecipado',      cls: 'bg-blue-100 text-blue-700' },
}

const ADQUIRENTES = ['CIELO', 'REDE', 'STONE', 'GETNET', 'PAGSEGURO', 'SAFRA', 'BIN', 'ALELO', 'PLUXEE']
const TIPOS = Object.keys(TIPOS_MAP)
const ABAS = ['Todas', 'Em aberto', 'Resolvidas']

const MOTIVOS = [
  'Valor correto (arredondamento)',
  'Estorno recebido',
  'Contestacao enviada',
  'Erro de importacao',
  'Outro',
]

function ModalResolver({ divergencia, onClose, onResolvida }: {
  divergencia: any
  onClose: () => void
  onResolvida: () => void
}) {
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      await api.patch(`/conciliacao/divergencias/${divergencia.id}/resolver`, { motivo, observacao })
      onResolvida()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">Resolver Divergencia</h2>
        <p className="text-[11px] text-gray-500 mb-4 truncate">{divergencia.descricao}</p>

        <label className="block text-[11px] font-medium text-gray-700 mb-1">Motivo da resolucao</label>
        <select
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          className="w-full border border-gray-300 rounded-md text-xs px-2 py-1.5 mb-3 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <label className="block text-[11px] font-medium text-gray-700 mb-1">Observacao (opcional)</label>
        <textarea
          value={observacao}
          onChange={e => setObservacao(e.target.value)}
          rows={3}
          placeholder="Detalhe adicional sobre a resolucao..."
          className="w-full border border-gray-300 rounded-md text-xs px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="text-xs px-4 py-1.5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DivergenciasPage() {
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [aba, setAba] = useState('Todas')
  const [modalDivergencia, setModalDivergencia] = useState<any>(null)

  const hoje = new Date()
  const [dataInicio, setDataInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10))
  const [dataFim, setDataFim]       = useState(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10))
  const [adquirente, setAdquirente] = useState('')
  const [tipo, setTipo]             = useState('')

  async function pesquisar(abaOverride?: string) {
    setLoading(true); setDados(null)
    try {
      const a = abaOverride ?? aba
      const qs = new URLSearchParams({ limit: '500' })
      if (dataInicio) qs.set('dataInicio', dataInicio)
      if (dataFim)    qs.set('dataFim', dataFim)
      if (adquirente) qs.set('adquirente', adquirente)
      if (tipo)       qs.set('tipo', tipo)
      if (a === 'Em aberto')  qs.set('resolvida', 'false')
      if (a === 'Resolvidas') qs.set('resolvida', 'true')
      const r = await api.get(`/conciliacao/divergencias?${qs}`)
      setDados(r.data)
    } finally { setLoading(false) }
  }

  function mudarAba(label: string) {
    setAba(label)
    if (dados) pesquisar(label)
  }

  function exportarCSV() {
    const lista = Array.isArray(dados) ? dados : dados?.dados ?? []
    if (!lista.length) return
    const rows = [['ID', 'Tipo', 'Descricao', 'Adquirente', 'NSU', 'Data', 'Vlr. Impacto', 'Status', 'Motivo', 'Resolvida por']]
    for (const d of lista) {
      rows.push([d.id, d.tipo, d.descricao ?? '', d.estabelecimento?.nome ?? '', d.venda?.nsu ?? '',
        fmtDate(d.criadoEm), fmtBRL(Number(d.valorImpacto ?? 0)),
        d.resolvida ? 'Resolvida' : 'Em aberto',
        d.motivoResolucao ?? '', d.resolvidaPor ?? ''])
    }
    const csv = rows.map(r => r.join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `divergencias-${dataInicio}-${dataFim}.csv`; a.click()
  }

  const lista: any[] = Array.isArray(dados) ? dados : dados?.dados ?? []
  const totalImpacto = lista.reduce((s, d) => s + Number(d.valorImpacto ?? 0), 0)
  const totalAberto  = lista.filter(d => !d.resolvida).length

  return (
    <div className="flex flex-col h-full">
      {modalDivergencia && (
        <ModalResolver
          divergencia={modalDivergencia}
          onClose={() => setModalDivergencia(null)}
          onResolvida={() => { setModalDivergencia(null); pesquisar() }}
        />
      )}

      <FilterPanel onSearch={() => pesquisar()} loading={loading} count={lista.length}>
        <FRow>
          <FField label="Periodo (criacao)">
            <div className="flex items-center gap-2">
              <FInput type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              <span className="text-xs text-gray-400">ate</span>
              <FInput type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
          </FField>
          <FField label="Adquirente">
            <FSelect value={adquirente} onChange={e => setAdquirente(e.target.value)}>
              <option value="">Todos</option>
              {ADQUIRENTES.map(a => <option key={a}>{a}</option>)}
            </FSelect>
          </FField>
          <FField label="Tipo de divergencia">
            <FSelect value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="">Todos</option>
              {TIPOS.map(t => <option key={t} value={t}>{TIPOS_MAP[t].label}</option>)}
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
              { label: 'Todas', count: lista.length },
              { label: 'Em aberto', count: totalAberto },
              { label: 'Resolvidas', count: lista.length - totalAberto },
            ]}
            active={aba} onChange={mudarAba} onExport={exportarCSV}
          />
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[11px] border-collapse min-w-[800px]">
              <THead cols={[
                { label: 'Tipo' }, { label: 'Descricao' }, { label: 'Estabelecimento' },
                { label: 'NSU' }, { label: 'Data' },
                { label: 'Vlr. Impacto', right: true }, { label: 'Status' }, { label: '' },
              ]} />
              <tbody>
                {lista.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">Nenhuma divergencia encontrada</td></tr>
                ) : lista.map((d: any, i: number) => (
                  <tr key={d.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-2 px-3"><StatusBadge status={d.tipo} map={TIPOS_MAP} /></td>
                    <td className="py-2 px-3 text-gray-600 max-w-[280px]">
                      <div className="truncate">{d.descricao ?? '-'}</div>
                      {d.resolvida && d.motivoResolucao && (
                        <div className="text-[10px] text-emerald-600 mt-0.5">
                          {d.motivoResolucao}{d.resolvidaPor ? ` - ${d.resolvidaPor}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-600">{d.estabelecimento?.nome ?? '-'}</td>
                    <td className="py-2 px-3 font-mono text-gray-500">{d.venda?.nsu ?? '-'}</td>
                    <td className="py-2 px-3 text-gray-500">{fmtDate(d.criadoEm)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-red-600">
                      {d.valorImpacto ? fmtBRL(Number(d.valorImpacto)) : '-'}
                    </td>
                    <td className="py-2 px-3">
                      {d.resolvida
                        ? <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Resolvida</span>
                        : <span className="text-[10px] bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">Em aberto</span>}
                    </td>
                    <td className="py-2 px-3">
                      {!d.resolvida && (
                        <button
                          onClick={() => setModalDivergencia(d)}
                          className="text-[10px] text-blue-600 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-50 font-semibold"
                        >
                          Resolver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {lista.length > 0 && (
                <TotalRow cells={[
                  `TOTAL - ${lista.length} registros - ${totalAberto} em aberto`,
                  '', '', '', '',
                  fmtBRL(totalImpacto), '', '',
                ]} />
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
