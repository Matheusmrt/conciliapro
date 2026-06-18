'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  FilterPanel, TabBar, THead, TotalRow, EmptySearch, Spinner,
  FRow, FField, FInput, FSelect, fmtBRL, fmtDate
} from '@/components/ui/TablePage'

const ADQUIRENTES = ['CIELO', 'REDE', 'STONE', 'GETNET', 'PAGSEGURO', 'SAFRA', 'BIN', 'ALELO', 'PLUXEE']
const BANDEIRAS   = ['VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'CABAL']
const MODALIDADES = ['DEBITO', 'CREDITO_AVISTA', 'CREDITO_PARCELADO', 'PIX', 'VOUCHER']

const ABAS = ['Repasses', 'Por Bandeira', 'Por Modalidade']

export default function ParcelasPage() {
  const [dados, setDados] = useState<any>(null)
  const [porBandeira, setPorBandeira] = useState<any[]>([])
  const [porModalidade, setPorModalidade] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [aba, setAba] = useState('Repasses')
  const [pagina, setPagina] = useState(1)

  const hoje = new Date()
  const [dataInicio, setDataInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10))
  const [dataFim, setDataFim]       = useState(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10))
  const [adquirente, setAdquirente] = useState('')
  const [bandeira, setBandeira]     = useState('')
  const [modalidade, setModalidade] = useState('')

  async function pesquisar(pag = 1) {
    setLoading(true); setPagina(pag); setDados(null)
    try {
      const qs = new URLSearchParams({ pagina: String(pag) })
      if (dataInicio) qs.set('dataInicio', dataInicio)
      if (dataFim)    qs.set('dataFim', dataFim)
      if (adquirente) qs.set('adquirente', adquirente)
      if (bandeira)   qs.set('bandeira', bandeira)
      if (modalidade) qs.set('modalidade', modalidade)

      const bqs = new URLSearchParams()
      if (dataInicio) bqs.set('dataInicio', dataInicio)
      if (dataFim)    bqs.set('dataFim', dataFim)

      const [r1, r2, r3] = await Promise.all([
        api.get(`/parcelas?${qs}`),
        api.get(`/parcelas/por-bandeira?${bqs}`),
        api.get(`/parcelas/por-modalidade?${bqs}`),
      ])
      setDados(r1.data); setPorBandeira(r2.data); setPorModalidade(r3.data)
    } finally { setLoading(false) }
  }

  function exportarCSV() {
    if (!dados?.dados) return
    const rows = [['NSU', 'Data Venda', 'Data Pgto', 'Adquirente', 'Bandeira', 'Modalidade', 'Parcela', 'Vlr. Bruto', 'Vlr. Taxa', 'Vlr. Líquido', 'MDR%']]
    for (const r of dados.dados) {
      rows.push([r.nsu, fmtDate(r.dataVenda), fmtDate(r.dataPagamento), r.adquirente, r.bandeira, r.modalidade,
        `${r.parcela}/${r.totalParcelas}`, fmtBRL(Number(r.valorBruto)), fmtBRL(Number(r.valorTaxa)), fmtBRL(Number(r.valorLiquido)),
        (Number(r.taxaMdr) * 100).toFixed(2) + '%'])
    }
    const csv = rows.map(r => r.join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `parcelas-${dataInicio}-${dataFim}.csv`; a.click()
  }

  const totalPags = dados ? Math.ceil(dados.total / 100) : 0

  return (
    <div className="flex flex-col h-full">
      <FilterPanel onSearch={() => pesquisar(1)} loading={loading} count={dados?.total}>
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
          <FField label="Modalidade">
            <FSelect value={modalidade} onChange={e => setModalidade(e.target.value)}>
              <option value="">Todas</option>
              {MODALIDADES.map(m => <option key={m}>{m}</option>)}
            </FSelect>
          </FField>
        </FRow>
      </FilterPanel>

      {!dados && !loading && <EmptySearch />}
      {loading && <Spinner />}

      {dados && !loading && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <TabBar tabs={ABAS.map(a => ({ label: a }))} active={aba} onChange={setAba} onExport={exportarCSV} />
          <div className="flex-1 overflow-auto">

            {aba === 'Repasses' && (
              <>
                <table className="w-full text-[11px] border-collapse min-w-[900px]">
                  <THead cols={[
                    { label: 'NSU' }, { label: 'Data Venda' }, { label: 'Data Pgto' },
                    { label: 'Adquirente' }, { label: 'Bandeira' }, { label: 'Modalidade' }, { label: 'Parcela' },
                    { label: 'Vlr. Bruto', right: true }, { label: 'Vlr. Taxa', right: true },
                    { label: 'Vlr. Líquido', right: true }, { label: 'MDR %', right: true },
                  ]} />
                  <tbody>
                    {dados.dados.map((r: any, i: number) => (
                      <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="py-2 px-3 font-mono text-gray-500">{r.nsu}</td>
                        <td className="py-2 px-3 text-gray-600">{fmtDate(r.dataVenda)}</td>
                        <td className="py-2 px-3 text-gray-600">{fmtDate(r.dataPagamento)}</td>
                        <td className="py-2 px-3 font-medium text-gray-700">{r.adquirente}</td>
                        <td className="py-2 px-3"><span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-medium">{r.bandeira}</span></td>
                        <td className="py-2 px-3 text-gray-500">{r.modalidade}</td>
                        <td className="py-2 px-3 text-center text-gray-400">{r.parcela}/{r.totalParcelas}</td>
                        <td className="py-2 px-3 text-right font-semibold text-gray-800">{fmtBRL(Number(r.valorBruto))}</td>
                        <td className="py-2 px-3 text-right text-red-500">{fmtBRL(Number(r.valorTaxa))}</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-700">{fmtBRL(Number(r.valorLiquido))}</td>
                        <td className="py-2 px-3 text-right text-gray-400">{(Number(r.taxaMdr) * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <TotalRow cells={[
                    `TOTAL — ${dados.total.toLocaleString('pt-BR')} registros`, '', '', '', '', '', '',
                    fmtBRL(dados.totais.valorBruto), fmtBRL(dados.totais.valorTaxa),
                    fmtBRL(dados.totais.valorLiquido),
                    `${(dados.totais.taxaMdrMedia * 100).toFixed(2)}%`,
                  ]} />
                </table>
                {totalPags > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-white">
                    <span className="text-xs text-gray-400">Página {pagina} de {totalPags}</span>
                    <div className="flex gap-1">
                      <button onClick={() => pesquisar(pagina - 1)} disabled={pagina === 1}
                        className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /></button>
                      <button onClick={() => pesquisar(pagina + 1)} disabled={pagina === totalPags}
                        className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )}
              </>
            )}

            {aba === 'Por Bandeira' && (
              <table className="w-full text-[11px] border-collapse">
                <THead cols={[{ label: 'Bandeira' }, { label: 'Qtde', right: true }, { label: 'Vlr. Bruto', right: true }, { label: 'Vlr. Taxa', right: true }, { label: 'Vlr. Líquido', right: true }, { label: 'MDR Médio', right: true }]} />
                <tbody>
                  {porBandeira.map((b: any, i: number) => (
                    <tr key={b.bandeira} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-2 px-3 font-semibold text-gray-800">{b.bandeira}</td>
                      <td className="py-2 px-3 text-right text-gray-600">{Number(b._count).toLocaleString('pt-BR')}</td>
                      <td className="py-2 px-3 text-right font-semibold text-gray-800">{fmtBRL(Number(b._sum?.valorBruto ?? 0))}</td>
                      <td className="py-2 px-3 text-right text-red-500">{fmtBRL(Number(b._sum?.valorTaxa ?? 0))}</td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-700">{fmtBRL(Number(b._sum?.valorLiquido ?? 0))}</td>
                      <td className="py-2 px-3 text-right text-gray-400">{(Number(b._avg?.taxaMdr ?? 0) * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {aba === 'Por Modalidade' && (
              <table className="w-full text-[11px] border-collapse">
                <THead cols={[{ label: 'Modalidade' }, { label: 'Qtde', right: true }, { label: 'Vlr. Bruto', right: true }, { label: 'Vlr. Líquido', right: true }, { label: 'MDR Médio', right: true }]} />
                <tbody>
                  {porModalidade.map((m: any, i: number) => (
                    <tr key={m.modalidade} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-2 px-3 font-semibold text-gray-800">{m.modalidade}</td>
                      <td className="py-2 px-3 text-right text-gray-600">{Number(m._count).toLocaleString('pt-BR')}</td>
                      <td className="py-2 px-3 text-right font-semibold text-gray-800">{fmtBRL(Number(m._sum?.valorBruto ?? 0))}</td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-700">{fmtBRL(Number(m._sum?.valorLiquido ?? 0))}</td>
                      <td className="py-2 px-3 text-right text-gray-400">{(Number(m._avg?.taxaMdr ?? 0) * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
