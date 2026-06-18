'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Plus, X } from 'lucide-react'
import {
  FilterPanel, TabBar, THead, TotalRow, EmptySearch, Spinner,
  FRow, FField, FInput, FSelect, fmtBRL, fmtDate, StatusBadge
} from '@/components/ui/TablePage'

const BANCOS = ['Banco do Brasil', 'Bradesco', 'Itaú', 'Santander', 'Caixa Econômica', 'Inter', 'Nu Pagamentos']

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  EMITIDO:   { label: 'A vencer',   cls: 'bg-blue-100 text-blue-700' },
  PAGO:      { label: 'Pago',       cls: 'bg-emerald-100 text-emerald-700' },
  VENCIDO:   { label: 'Vencido',    cls: 'bg-red-100 text-red-700' },
  CANCELADO: { label: 'Cancelado',  cls: 'bg-gray-100 text-gray-500' },
}

const ABAS = ['Todos', 'A vencer', 'Pagos', 'Vencidos', 'Cancelados']
const ABA_STATUS: Record<string, string> = { 'A vencer': 'EMITIDO', 'Pagos': 'PAGO', 'Vencidos': 'VENCIDO', 'Cancelados': 'CANCELADO' }

export default function BoletosPage() {
  const [dados, setDados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [aba, setAba] = useState('Todos')
  const [modal, setModal] = useState(false)
  const [estabs, setEstabs] = useState<any[]>([])
  const [salvando, setSalvando] = useState(false)

  const hoje = new Date()
  const [dataInicio, setDataInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10))
  const [dataFim, setDataFim]       = useState(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10))
  const [pagador, setPagador]       = useState('')
  const [form, setForm] = useState({ nossoNumero: '', dataEmissao: '', dataVencimento: '', valor: '', pagador: '', banco: '', estabelecimentoId: '' })

  async function pesquisar(abaOverride?: string) {
    setLoading(true)
    try {
      const a = abaOverride ?? aba
      const qs = new URLSearchParams()
      if (dataInicio) qs.set('dataInicio', dataInicio)
      if (dataFim)    qs.set('dataFim', dataFim)
      if (ABA_STATUS[a]) qs.set('status', ABA_STATUS[a])
      const r = await api.get(`/boletos?${qs}`)
      const lista = Array.isArray(r.data) ? r.data : (r.data?.boletos ?? [])
      setDados(lista)
      if (!estabs.length) {
        const re = await api.get('/empresa/estabelecimentos')
        setEstabs(re.data)
      }
    } finally { setLoading(false) }
  }

  function mudarAba(label: string) { setAba(label); pesquisar(label) }

  async function salvar() {
    setSalvando(true)
    try {
      await api.post('/boletos', { ...form, valor: Math.round(Number(form.valor.replace(',', '.')) * 100) })
      setModal(false); pesquisar()
    } finally { setSalvando(false) }
  }

  async function marcarPago(id: string) {
    await api.patch(`/boletos/${id}`, { status: 'PAGO', dataPagamento: new Date().toISOString() })
    pesquisar()
  }

  function exportarCSV() {
    const rows = [['Nosso Número', 'Pagador', 'Banco', 'Emissão', 'Vencimento', 'Pagamento', 'Valor', 'Valor Pago', 'Status']]
    for (const b of dados) {
      rows.push([b.nossoNumero, b.pagador, b.banco, fmtDate(b.dataEmissao), fmtDate(b.dataVencimento),
        fmtDate(b.dataPagamento), fmtBRL(Number(b.valor)), fmtBRL(Number(b.valorPago ?? 0)), b.status])
    }
    const csv = rows.map(r => r.join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `boletos-${dataInicio}-${dataFim}.csv`; a.click()
  }

  const filtrados = pagador ? dados.filter(b => b.pagador?.toLowerCase().includes(pagador.toLowerCase())) : dados
  const totalValor = filtrados.reduce((s, b) => s + Number(b.valor), 0)

  return (
    <div className="flex flex-col h-full">
      <FilterPanel onSearch={() => pesquisar()} loading={loading} count={filtrados.length}>
        <FRow>
          <FField label="Período (vencimento)">
            <div className="flex items-center gap-2">
              <FInput type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              <span className="text-xs text-gray-400">até</span>
              <FInput type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
          </FField>
          <FField label="Pagador">
            <FInput placeholder="Nome do pagador" value={pagador} onChange={e => setPagador(e.target.value)} className="w-48" />
          </FField>
          <div className="ml-auto">
            <button onClick={() => setModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded hover:bg-blue-700">
              <Plus className="h-3.5 w-3.5" /> Novo boleto
            </button>
          </div>
        </FRow>
      </FilterPanel>

      {!dados.length && !loading && <EmptySearch message="Clique em Pesquisar para carregar os boletos" />}
      {loading && <Spinner />}

      {(dados.length > 0 || (!loading && dados !== null)) && !loading && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <TabBar
            tabs={ABAS.map(a => ({
              label: a,
              count: a === 'Todos' ? dados.length : dados.filter(b => b.status === ABA_STATUS[a]).length,
            }))}
            active={aba} onChange={mudarAba} onExport={exportarCSV}
          />
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[11px] border-collapse min-w-[800px]">
              <THead cols={[
                { label: 'Nosso Número' }, { label: 'Pagador' }, { label: 'Banco' },
                { label: 'Emissão' }, { label: 'Vencimento' }, { label: 'Pagamento' },
                { label: 'Valor', right: true }, { label: 'Valor Pago', right: true }, { label: 'Status' }, { label: '' },
              ]} />
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={10} className="py-12 text-center text-gray-400">Nenhum boleto encontrado</td></tr>
                ) : filtrados.map((b: any, i: number) => (
                  <tr key={b.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-2 px-3 font-mono text-gray-500">{b.nossoNumero}</td>
                    <td className="py-2 px-3 text-gray-700 font-medium max-w-[180px] truncate">{b.pagador}</td>
                    <td className="py-2 px-3 text-gray-500">{b.banco}</td>
                    <td className="py-2 px-3 text-gray-500">{fmtDate(b.dataEmissao)}</td>
                    <td className={`py-2 px-3 font-medium ${b.status === 'VENCIDO' ? 'text-red-600' : 'text-gray-700'}`}>{fmtDate(b.dataVencimento)}</td>
                    <td className="py-2 px-3 text-gray-500">{b.dataPagamento ? fmtDate(b.dataPagamento) : '—'}</td>
                    <td className="py-2 px-3 text-right font-semibold text-gray-800">{fmtBRL(Number(b.valor))}</td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-700">{b.valorPago ? fmtBRL(Number(b.valorPago)) : '—'}</td>
                    <td className="py-2 px-3"><StatusBadge status={b.status} map={STATUS_MAP} /></td>
                    <td className="py-2 px-3">
                      {b.status === 'EMITIDO' && (
                        <button onClick={() => marcarPago(b.id)}
                          className="text-[10px] text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded hover:bg-emerald-50 font-semibold">
                          Marcar pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <TotalRow cells={[
                `TOTAL — ${filtrados.length} boletos`, '', '', '', '', '',
                fmtBRL(totalValor),
                fmtBRL(filtrados.filter(b => b.status === 'PAGO').reduce((s, b) => s + Number(b.valorPago ?? b.valor), 0)),
                '', '',
              ]} />
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800">Novo Boleto</h3>
              <button onClick={() => setModal(false)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs text-gray-500">Nosso número</label>
                <FInput value={form.nossoNumero} onChange={e => setForm(f => ({ ...f, nossoNumero: e.target.value }))} className="w-full mt-1 font-mono" placeholder="00000000000" /></div>
              <div><label className="text-xs text-gray-500">Pagador</label>
                <FInput value={form.pagador} onChange={e => setForm(f => ({ ...f, pagador: e.target.value }))} className="w-full mt-1" /></div>
              <div><label className="text-xs text-gray-500">Valor (R$)</label>
                <FInput type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} className="w-full mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500">Emissão</label>
                  <FInput type="date" value={form.dataEmissao} onChange={e => setForm(f => ({ ...f, dataEmissao: e.target.value }))} className="w-full mt-1" /></div>
                <div><label className="text-xs text-gray-500">Vencimento</label>
                  <FInput type="date" value={form.dataVencimento} onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))} className="w-full mt-1" /></div>
              </div>
              <div><label className="text-xs text-gray-500">Banco</label>
                <FSelect value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} className="w-full mt-1">
                  <option value="">Selecione</option>
                  {BANCOS.map(b => <option key={b}>{b}</option>)}
                </FSelect></div>
              <div><label className="text-xs text-gray-500">Estabelecimento</label>
                <FSelect value={form.estabelecimentoId} onChange={e => setForm(f => ({ ...f, estabelecimentoId: e.target.value }))} className="w-full mt-1">
                  <option value="">Selecione</option>
                  {estabs.map((e: any) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </FSelect></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 py-2 border border-gray-200 text-xs text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.nossoNumero || !form.valor}
                className="flex-1 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Criar boleto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
