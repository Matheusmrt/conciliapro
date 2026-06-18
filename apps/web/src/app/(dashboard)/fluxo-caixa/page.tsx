'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Download, Search, FileSpreadsheet } from 'lucide-react'

import { api } from '@/lib/api'

function fmt(v: number) {
  return (v / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtData(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function diaSemana(iso: string) {
  return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][new Date(iso + 'T12:00:00').getDay()]
}
function difColor(v: number) {
  if (v > 50) return 'text-emerald-600 font-semibold'
  if (v < -50) return 'text-red-600 font-semibold'
  return 'text-gray-500'
}

const ADQUIRENTES = ['CIELO', 'REDE', 'STONE', 'GETNET', 'PAGSEGURO', 'SAFRA', 'BIN', 'ALELO', 'PLUXEE', 'VR']
const BANDEIRAS   = ['VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'CABAL']
const MODALIDADES_LABEL: Record<string, string> = {
  DEBITO: 'Débito', CREDITO_AVISTA: 'Créd. à Vista',
  CREDITO_PARCELADO: 'Créd. Parcelado', PIX: 'PIX', VOUCHER: 'Voucher',
}

// ─── Linha expansível por dia ───────────────────────────────────────────────
function DiaRow({ dia, colunas }: { dia: any; colunas: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr className="bg-[#eef2f7] border-b border-gray-300 cursor-pointer hover:bg-[#e4ecf4] select-none"
        onClick={() => setOpen(v => !v)}>
        <td className="py-2 pl-3 pr-2 text-xs font-bold text-gray-800 whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5">
            {open ? <ChevronDown className="h-3 w-3 text-gray-500" /> : <ChevronRight className="h-3 w-3 text-gray-500" />}
            {fmtData(dia.data)}
            <span className="font-normal text-gray-400">{diaSemana(dia.data)}</span>
          </span>
        </td>
        {colunas.includes('estabelecimento') && <td className="py-2 px-2 text-xs text-gray-400">—</td>}
        {colunas.includes('bandeira')        && <td className="py-2 px-2 text-xs text-gray-400">—</td>}
        {colunas.includes('modalidade')      && <td className="py-2 px-2 text-xs text-gray-400">—</td>}
        {colunas.includes('adquirente')      && <td className="py-2 px-2 text-xs text-gray-400">—</td>}
        <td className="py-2 px-2 text-xs text-right font-bold text-gray-800">{fmt(dia.totalBruto)}</td>
        <td className="py-2 px-2 text-xs text-right font-bold text-red-600">{fmt(dia.totalComissao)}</td>
        <td className="py-2 px-2 text-xs text-right font-bold text-gray-400">0,00</td>
        <td className="py-2 px-2 text-xs text-right font-bold text-gray-800">{fmt(dia.totalLiquidoPrevisto)}</td>
        <td className="py-2 px-2 text-xs text-right font-bold text-blue-700">{fmt(dia.totalLiquidoPago)}</td>
        <td className={`py-2 px-3 text-xs text-right ${difColor(dia.diferenca)}`}>{fmt(dia.diferenca)}</td>
      </tr>
      {open && dia.estabelecimentos?.map((estab: any) => (
        <EstabRow key={estab.id} estab={estab} colunas={colunas} />
      ))}
    </>
  )
}

function EstabRow({ estab, colunas }: { estab: any; colunas: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr className="bg-blue-50/40 border-b border-gray-100 cursor-pointer hover:bg-blue-50 select-none"
        onClick={() => setOpen(v => !v)}>
        <td className="py-1.5 pl-6 pr-2 text-xs text-gray-700 whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5">
            {open ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
            {estab.nome}
          </span>
        </td>
        {colunas.includes('estabelecimento') && <td className="py-1.5 px-2 text-xs text-blue-700 font-medium">{estab.nome}</td>}
        {colunas.includes('bandeira')        && <td className="py-1.5 px-2 text-xs text-gray-400">—</td>}
        {colunas.includes('modalidade')      && <td className="py-1.5 px-2 text-xs text-gray-400">—</td>}
        {colunas.includes('adquirente')      && <td className="py-1.5 px-2 text-xs text-gray-400">—</td>}
        <td className="py-1.5 px-2 text-xs text-right text-gray-700">{fmt(estab.totalBruto)}</td>
        <td className="py-1.5 px-2 text-xs text-right text-red-500">{fmt(estab.totalComissao)}</td>
        <td className="py-1.5 px-2 text-xs text-right text-gray-400">0,00</td>
        <td className="py-1.5 px-2 text-xs text-right text-gray-700">{fmt(estab.totalLiquidoPrevisto)}</td>
        <td className="py-1.5 px-2 text-xs text-right text-blue-600">{fmt(estab.totalLiquidoPago)}</td>
        <td className={`py-1.5 px-3 text-xs text-right ${difColor(estab.diferenca)}`}>{fmt(estab.diferenca)}</td>
      </tr>
      {open && estab.adquirentes?.map((adq: any) => (
        <AdqRow key={adq.adquirente} adq={adq} colunas={colunas} />
      ))}
    </>
  )
}

function AdqRow({ adq, colunas }: { adq: any; colunas: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr className="bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 select-none"
        onClick={() => setOpen(v => !v)}>
        <td className="py-1.5 pl-10 pr-2 text-xs text-gray-600 whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5">
            {open ? <ChevronDown className="h-3 w-3 text-gray-300" /> : <ChevronRight className="h-3 w-3 text-gray-300" />}
            {adq.adquirente}
            <span className="text-gray-300">({adq.qtde})</span>
          </span>
        </td>
        {colunas.includes('estabelecimento') && <td className="py-1.5 px-2 text-xs text-gray-400">—</td>}
        {colunas.includes('bandeira')        && <td className="py-1.5 px-2 text-xs text-gray-400">—</td>}
        {colunas.includes('modalidade')      && <td className="py-1.5 px-2 text-xs text-gray-400">—</td>}
        {colunas.includes('adquirente')      && <td className="py-1.5 px-2 text-xs font-medium text-gray-700">{adq.adquirente}</td>}
        <td className="py-1.5 px-2 text-xs text-right text-gray-600">{fmt(adq.totalBruto)}</td>
        <td className="py-1.5 px-2 text-xs text-right text-red-400">{fmt(adq.totalComissao)}</td>
        <td className="py-1.5 px-2 text-xs text-right text-gray-400">0,00</td>
        <td className="py-1.5 px-2 text-xs text-right text-gray-600">{fmt(adq.totalLiquidoPrevisto)}</td>
        <td className="py-1.5 px-2 text-xs text-right text-blue-600">{fmt(adq.totalLiquidoPago)}</td>
        <td className={`py-1.5 px-3 text-xs text-right ${difColor(adq.diferenca)}`}>{fmt(adq.diferenca)}</td>
      </tr>
      {open && adq.repasses?.map((r: any) => (
        <tr key={r.id} className="bg-gray-50/50 border-b border-gray-50">
          <td className="py-1 pl-14 pr-2 text-[11px] text-gray-400 whitespace-nowrap" colSpan={colunas.length + 1}>
            NSU {r.nsu} · {MODALIDADES_LABEL[r.modalidade] ?? r.modalidade} · {r.bandeira}
            {r.totalParcelas > 1 && ` · ${r.parcela}/${r.totalParcelas}x`}
          </td>
          <td className="py-1 px-2 text-[11px] text-right text-gray-500">{fmt(r.valorBruto)}</td>
          <td className="py-1 px-2 text-[11px] text-right text-red-300">{fmt(r.valorComissao)}</td>
          <td className="py-1 px-2 text-[11px] text-right text-gray-300">0,00</td>
          <td className="py-1 px-2 text-[11px] text-right text-gray-500">{fmt(r.valorLiquidoPrevisto)}</td>
          <td className="py-1 px-2 text-[11px] text-right text-blue-400">{fmt(r.valorLiquidoPago)}</td>
          <td className={`py-1 px-3 text-[11px] text-right ${difColor(r.diferenca)}`}>{fmt(r.diferenca)}</td>
        </tr>
      ))}
    </>
  )
}

// ─── Página principal ───────────────────────────────────────────────────────
export default function FluxoCaixaPage() {
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [abaAdq, setAbaAdq] = useState('Todos')

  // Form de pesquisa
  const hoje = new Date()
  const [dataInicio, setDataInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10))
  const [dataFim,    setDataFim]    = useState(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10))
  const [adqsSel,    setAdqsSel]    = useState<string[]>([])
  const [bandeirasSel, setBandeirasSel] = useState<string[]>([])
  const [estabelecimentoId, setEstabelecimentoId] = useState('')

  // Opções de exibição
  const [sepEstab,    setSepEstab]    = useState(true)
  const [sepAdq,      setSepAdq]      = useState(true)
  const [somenteDif,  setSomenteDif]  = useState(false)

  // Colunas extras visíveis
  const colunas: string[] = []
  if (sepEstab) colunas.push('estabelecimento')
  if (sepAdq)   colunas.push('adquirente')

  async function pesquisar() {
    setLoading(true)
    setDados(null)
    setAbaAdq('Todos')
    try {
      const params = new URLSearchParams({ dataInicio, dataFim })
      if (adqsSel.length === 1) params.set('adquirente', adqsSel[0])
      if (estabelecimentoId) params.set('estabelecimentoId', estabelecimentoId)
      const r = await api.get(`/fluxo-caixa?${params}`)
      setDados(r.data)
    } finally { setLoading(false) }
  }

  function exportarCSV() {
    if (!dados) return
    const rows = [['Data', 'Vlr Bruto', 'Comissão', 'Cancelam.', 'Liq. Previsto', 'Liq. Pago', 'Saldo']]
    for (const d of dados.dias) {
      rows.push([fmtData(d.data), fmt(d.totalBruto), fmt(d.totalComissao), '0,00',
        fmt(d.totalLiquidoPrevisto), fmt(d.totalLiquidoPago), fmt(d.diferenca)])
    }
    rows.push(['TOTAL', fmt(dados.totalBruto), fmt(dados.totalComissao), '0,00',
      fmt(dados.totalLiquidoPrevisto), fmt(dados.totalLiquidoPago), fmt(dados.diferenca)])
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `fluxo-${dataInicio}-${dataFim}.csv`; a.click()
  }

  // Filtra dias pela aba de adquirente selecionada
  const diasFiltrados = (dados?.dias ?? []).filter((d: any) => {
    if (abaAdq === 'Todos') return true
    return d.estabelecimentos?.some((e: any) =>
      e.adquirentes?.some((a: any) => a.adquirente === abaAdq)
    )
  }).filter((d: any) => {
    if (!somenteDif) return true
    return Math.abs(d.diferenca) > 50
  })

  const adquirentesResultado: string[] = [...new Set(
    (dados?.adquirentes ?? []) as string[]
  )]

  function toggleArr(arr: string[], set: (v: string[]) => void, val: string) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Formulário de Pesquisa ── */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 space-y-4 shrink-0">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Parâmetros da consulta</p>

        {/* Linha 1: Período */}
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-xs text-gray-500 mb-1">Período:</p>
            <div className="flex items-center gap-2">
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 bg-white" />
              <span className="text-xs text-gray-400">até</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 bg-white" />
            </div>
          </div>

          {/* Adquirentes */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Meios de pagamento (adquirentes):</p>
            <div className="flex gap-1 flex-wrap">
              {ADQUIRENTES.map(a => (
                <button key={a} onClick={() => toggleArr(adqsSel, setAdqsSel, a)}
                  className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                    adqsSel.includes(a) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {a}
                </button>
              ))}
              {adqsSel.length > 0 && (
                <button onClick={() => setAdqsSel([])} className="text-[11px] px-2 py-1 text-red-500 hover:underline">limpar</button>
              )}
            </div>
          </div>

          {/* Bandeiras */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Bandeiras:</p>
            <div className="flex gap-1 flex-wrap">
              {BANDEIRAS.map(b => (
                <button key={b} onClick={() => toggleArr(bandeirasSel, setBandeirasSel, b)}
                  className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                    bandeirasSel.includes(b) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {b}
                </button>
              ))}
              {bandeirasSel.length > 0 && (
                <button onClick={() => setBandeirasSel([])} className="text-[11px] px-2 py-1 text-red-500 hover:underline">limpar</button>
              )}
            </div>
          </div>
        </div>

        {/* Linha 2: Opções de visualização */}
        <div className="flex items-center gap-6 flex-wrap">
          <p className="text-xs text-gray-500">Como visualizar:</p>
          <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
            <input type="checkbox" checked={sepEstab} onChange={e => setSepEstab(e.target.checked)} className="accent-blue-600" />
            Separar por estabelecimento
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
            <input type="checkbox" checked={sepAdq} onChange={e => setSepAdq(e.target.checked)} className="accent-blue-600" />
            Separar por adquirente
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
            <input type="checkbox" checked={somenteDif} onChange={e => setSomenteDif(e.target.checked)} className="accent-blue-600" />
            Mostrar apenas dias com diferença
          </label>
        </div>

        {/* Botão pesquisar */}
        <div className="flex items-center gap-3 pt-1">
          <button onClick={pesquisar} disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded transition-colors">
            <Search className="h-3.5 w-3.5" />
            {loading ? 'Pesquisando...' : 'Pesquisar'}
          </button>
          {dados && (
            <span className="text-xs text-gray-400">
              Registros: <span className="font-semibold text-gray-700">{dados.qtde}</span>
              {' '}· Mostrados: <span className="font-semibold text-gray-700">{diasFiltrados.length} dias</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Resultado ── */}
      {!dados && !loading && (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <Search className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">Configure os parâmetros e clique em Pesquisar</p>
            <p className="text-xs text-gray-300 mt-1">Os resultados aparecerão aqui</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
        </div>
      )}

      {dados && !loading && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Abas por adquirente + exportar */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-b border-gray-200 shrink-0">
            <div className="flex gap-0.5 overflow-x-auto">
              {['Todos', ...adquirentesResultado].map(a => (
                <button key={a} onClick={() => setAbaAdq(a)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-t border-b-2 whitespace-nowrap transition-colors ${
                    abaAdq === a
                      ? 'border-blue-600 text-blue-700 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}>
                  {a}
                </button>
              ))}
            </div>
            <button onClick={exportarCSV}
              className="flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded transition-colors">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Gerar Planilha
            </button>
          </div>

          {/* Tabela */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs border-collapse min-w-[800px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#1e3a5f] text-white">
                  <th className="py-2 pl-3 pr-2 text-left font-semibold whitespace-nowrap">Dt. Vencimento</th>
                  {colunas.includes('estabelecimento') && <th className="py-2 px-2 text-left font-semibold">Estabelecimento</th>}
                  {colunas.includes('bandeira')        && <th className="py-2 px-2 text-left font-semibold">Bandeira</th>}
                  {colunas.includes('modalidade')      && <th className="py-2 px-2 text-left font-semibold">Tipo Venda</th>}
                  {colunas.includes('adquirente')      && <th className="py-2 px-2 text-left font-semibold">Adquirente</th>}
                  <th className="py-2 px-2 text-right font-semibold">Vlr. Bruto</th>
                  <th className="py-2 px-2 text-right font-semibold">Vlr. Comis.</th>
                  <th className="py-2 px-2 text-right font-semibold">Cancelam.</th>
                  <th className="py-2 px-2 text-right font-semibold">Vlr. Previsto</th>
                  <th className="py-2 px-2 text-right font-semibold">Vlr. Pago</th>
                  <th className="py-2 px-3 text-right font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {diasFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6 + colunas.length} className="py-16 text-center text-gray-400">
                      Nenhum registro encontrado para o período
                    </td>
                  </tr>
                ) : (
                  diasFiltrados.map((d: any) => (
                    <DiaRow key={d.data} dia={d} colunas={colunas} />
                  ))
                )}
              </tbody>
              {diasFiltrados.length > 0 && (
                <tfoot>
                  <tr className="bg-[#1e3a5f] text-white">
                    <td className="py-2 pl-3 pr-2 font-bold text-[11px]" colSpan={1 + colunas.length}>TOTAL</td>
                    <td className="py-2 px-2 text-right font-bold text-[11px]">{fmt(dados.totalBruto)}</td>
                    <td className="py-2 px-2 text-right font-bold text-[11px]">{fmt(dados.totalComissao)}</td>
                    <td className="py-2 px-2 text-right font-bold text-[11px]">0,00</td>
                    <td className="py-2 px-2 text-right font-bold text-[11px]">{fmt(dados.totalLiquidoPrevisto)}</td>
                    <td className="py-2 px-2 text-right font-bold text-[11px]">{fmt(dados.totalLiquidoPago)}</td>
                    <td className={`py-2 px-3 text-right font-bold text-[11px] ${dados.diferenca < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                      {fmt(dados.diferenca)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
