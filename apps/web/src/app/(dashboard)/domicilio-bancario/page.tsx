'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Landmark, Plus, Trash2, CheckCircle, AlertTriangle, X } from 'lucide-react'

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const BANCOS = [
  { codigo: '001', nome: 'Banco do Brasil' }, { codigo: '033', nome: 'Santander' },
  { codigo: '104', nome: 'Caixa Econômica' }, { codigo: '237', nome: 'Bradesco' },
  { codigo: '341', nome: 'Itaú' }, { codigo: '756', nome: 'Sicoob' },
  { codigo: '748', nome: 'Sicredi' }, { codigo: '077', nome: 'Inter' },
  { codigo: '260', nome: 'Nu Pagamentos' }, { codigo: '290', nome: 'PagBank' },
]

interface ContaBancaria { id: string; banco: string; codigoBanco: string; agencia: string; conta: string; tipoConta: string; titular: string; ativo: boolean; estabelecimentoId: string }

export default function DomicilioBancarioPage() {
  const [contas, setContas] = useState<ContaBancaria[]>([])
  const [estabs, setEstabs] = useState<any[]>([])
  const [conferencia, setConferencia] = useState<any>(null)
  const [modal, setModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confLoading, setConfLoading] = useState(false)
  const [confEstabId, setConfEstabId] = useState('')
  const [form, setForm] = useState({ banco: '', codigoBanco: '', agencia: '', conta: '', tipoConta: 'CORRENTE', titular: '', estabelecimentoId: '' })

  useEffect(() => {
    api.get('/domicilio-bancario').then(r => setContas(r.data))
    api.get('/empresa/estabelecimentos').then(r => setEstabs(r.data))
  }, [])

  function selectBanco(codigo: string) {
    const b = BANCOS.find(b => b.codigo === codigo)
    setForm(f => ({ ...f, codigoBanco: codigo, banco: b?.nome ?? codigo }))
  }

  async function salvar() {
    setSalvando(true)
    try {
      await api.post('/domicilio-bancario', form)
      const r = await api.get('/domicilio-bancario')
      setContas(r.data)
      setModal(false)
    } finally { setSalvando(false) }
  }

  async function excluir(id: string) {
    await api.delete(`/domicilio-bancario/${id}`)
    setContas(c => c.filter(x => x.id !== id))
  }

  async function conferir() {
    if (!confEstabId) return
    setConfLoading(true)
    try {
      const hoje = new Date()
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10)
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10)
      const r = await api.get(`/domicilio-bancario/conferir?estabelecimentoId=${confEstabId}&dataInicio=${inicio}&dataFim=${fim}`)
      setConferencia(r.data)
    } finally { setConfLoading(false) }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Domicílio Bancário</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie as contas bancárias cadastradas e faça a conferência de repasses</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Nova conta
        </button>
      </div>

      {/* Lista de contas */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Contas Cadastradas</h3>
        </div>
        {contas.length === 0 ? (
          <div className="py-12 text-center">
            <Landmark className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhuma conta bancária cadastrada</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-3 pl-5 text-left text-xs font-semibold text-gray-500 uppercase">Banco</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Agência / Conta</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Titular</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="py-3 pr-5 text-right text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contas.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="py-3 pl-5">
                    <span className="font-semibold text-gray-800">{c.banco}</span>
                    <span className="text-xs text-gray-400 ml-1">({c.codigoBanco})</span>
                  </td>
                  <td className="py-3 px-4 text-gray-700">{c.agencia} / {c.conta}</td>
                  <td className="py-3 px-4 text-gray-700">{c.titular}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{c.tipoConta}</span>
                  </td>
                  <td className="py-3 px-4">
                    {c.ativo
                      ? <span className="text-xs text-green-700 font-semibold flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Ativa</span>
                      : <span className="text-xs text-gray-400">Inativa</span>}
                  </td>
                  <td className="py-3 pr-5 text-right">
                    <button onClick={() => excluir(c.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Conferência bancária */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-blue-600" /> Conferência de Repasses vs Lançamentos Bancários
        </h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Estabelecimento</label>
            <select value={confEstabId} onChange={e => setConfEstabId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1">
              <option value="">Selecione...</option>
              {estabs.map((e: any) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <button onClick={conferir} disabled={!confEstabId || confLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
            {confLoading ? 'Conferindo...' : 'Conferir mês atual'}
          </button>
        </div>

        {conferencia && (
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-gray-500">Repasses esperados</p>
              <p className="text-xl font-bold text-blue-700 mt-1">{fmt(conferencia.totalRepasses)}</p>
              <p className="text-xs text-gray-400">{conferencia.qtdeRepasses} lançamentos</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs text-gray-500">Lançamentos bancários</p>
              <p className="text-xl font-bold text-green-700 mt-1">{fmt(conferencia.totalLancamentos)}</p>
              <p className="text-xs text-gray-400">{conferencia.qtdeLancamentos} lançamentos</p>
            </div>
            <div className={`rounded-xl p-4 ${conferencia.diferenca === 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <p className="text-xs text-gray-500">Diferença</p>
              <p className={`text-xl font-bold mt-1 ${conferencia.diferenca === 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {fmt(Math.abs(conferencia.diferenca))}
              </p>
              {conferencia.diferenca === 0
                ? <p className="text-xs text-emerald-600">Conferido</p>
                : <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Divergência</p>}
            </div>
          </div>
        )}
      </div>

      {/* Modal nova conta */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800">Nova Conta Bancária</h3>
              <button onClick={() => setModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Banco</label>
                <select value={form.codigoBanco} onChange={e => selectBanco(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1">
                  <option value="">Selecione o banco</option>
                  {BANCOS.map(b => <option key={b.codigo} value={b.codigo}>{b.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Agência</label>
                  <input value={form.agencia} onChange={e => setForm(f => ({ ...f, agencia: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1" placeholder="0000" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Conta</label>
                  <input value={form.conta} onChange={e => setForm(f => ({ ...f, conta: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1" placeholder="00000-0" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Tipo de conta</label>
                <select value={form.tipoConta} onChange={e => setForm(f => ({ ...f, tipoConta: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1">
                  <option value="CORRENTE">Corrente</option>
                  <option value="POUPANCA">Poupança</option>
                  <option value="PAGAMENTO">Pagamento</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Titular</label>
                <input value={form.titular} onChange={e => setForm(f => ({ ...f, titular: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1" placeholder="Nome do titular" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Estabelecimento</label>
                <select value={form.estabelecimentoId} onChange={e => setForm(f => ({ ...f, estabelecimentoId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1">
                  <option value="">Selecione...</option>
                  {estabs.map((e: any) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 py-2 border border-gray-200 text-sm text-gray-700 rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
