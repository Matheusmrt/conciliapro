'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Building2, Plus, X, Link, Unlink, Settings } from 'lucide-react'

const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? 'conciliapro-admin-2024-mude-em-producao'
const adminHeaders = { 'x-admin-secret': ADMIN_SECRET }

function fmt(valor: number | null | undefined) {
  return (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function GrupoEmpresarialPage() {
  const [consolidado, setConsolidado] = useState<any>(null)
  const [grupos, setGrupos] = useState<any[]>([])
  const [todasEmpresas, setTodasEmpresas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'visao' | 'gerenciar'>('visao')

  // Modal novo grupo
  const [modalGrupo, setModalGrupo] = useState(false)
  const [nomeGrupo, setNomeGrupo] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setLoading(true)
    const [r1, r2, r3] = await Promise.all([
      api.get('/grupo-empresarial/consolidado').catch(() => null),
      api.get('/admin/grupos', { headers: adminHeaders }).catch(() => null),
      api.get('/admin/empresas', { headers: adminHeaders }).catch(() => null),
    ])
    if (r1) setConsolidado(r1.data)
    if (r2) setGrupos(r2.data)
    if (r3) setTodasEmpresas(r3.data)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function criarGrupo() {
    setSalvando(true)
    try {
      await api.post('/admin/grupos', { nome: nomeGrupo }, { headers: adminHeaders })
      setModalGrupo(false)
      setNomeGrupo('')
      carregar()
    } finally { setSalvando(false) }
  }

  async function vincular(empresaId: string, grupoId: string | null) {
    await api.patch(`/admin/empresas/${empresaId}/grupo`, { grupoId }, { headers: adminHeaders })
    carregar()
  }

  if (loading) return <div className="p-6 text-gray-500 text-sm">Carregando...</div>

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Grupo Empresarial</h1>
          <p className="text-sm text-gray-500 mt-0.5">Consolidado de todas as empresas do grupo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAbaAtiva('visao')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${abaAtiva === 'visao' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            Visão consolidada
          </button>
          <button onClick={() => setAbaAtiva('gerenciar')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg ${abaAtiva === 'gerenciar' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            <Settings className="w-4 h-4" /> Gerenciar grupos
          </button>
        </div>
      </div>

      {/* ── ABA: Visão consolidada ── */}
      {abaAtiva === 'visao' && (
        <>
          {consolidado && consolidado.empresas?.length > 0 ? (
            <>
              <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-6 text-white shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-200 mb-1">
                  {consolidado.grupo ?? 'Consolidado do Grupo'}
                </p>
                <p className="text-4xl font-extrabold">{fmt(consolidado.totalGrupo?.brutMes)}</p>
                <p className="text-blue-200 text-sm mt-1">Volume bruto · {consolidado.empresas?.length ?? 0} empresa(s)</p>
                <div className="grid grid-cols-3 gap-4 mt-5">
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-xs text-blue-200">Líquido total</p>
                    <p className="text-xl font-bold">{fmt(consolidado.totalGrupo?.liquidoMes)}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-xs text-blue-200">Total de vendas</p>
                    <p className="text-xl font-bold">{(consolidado.totalGrupo?.totalVendas ?? 0).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-xs text-blue-200">Divergências</p>
                    <p className="text-xl font-bold text-red-300">{consolidado.totalGrupo?.divergencias ?? 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Detalhamento por empresa</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-3 pl-5 text-left text-xs font-semibold text-gray-500 uppercase">Empresa</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Bruto (mês)</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Líquido (mês)</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Vendas</th>
                      <th className="py-3 pr-5 text-right text-xs font-semibold text-gray-500 uppercase">Divergências</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {consolidado.empresas.map((e: any, i: number) => (
                      <tr key={e.empresa?.id ?? i} className="hover:bg-gray-50">
                        <td className="py-3 pl-5">
                          <p className="font-semibold text-gray-900">{e.empresa?.nome}</p>
                          <p className="text-xs text-gray-400">{e.empresa?.cnpj}</p>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">{fmt(e.recebimentosMes?.bruto)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-green-700">{fmt(e.recebimentosMes?.liquido)}</td>
                        <td className="py-3 px-4 text-right text-gray-700">{(e.totalVendas ?? 0).toLocaleString('pt-BR')}</td>
                        <td className="py-3 pr-5 text-right">
                          <span className={`font-semibold ${e.divergencias > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {e.divergencias ?? 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
              <Building2 className="h-10 w-10 text-amber-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-amber-800">Nenhuma empresa vinculada ao grupo ainda</p>
              <p className="text-xs text-amber-600 mt-1 mb-4">Vá em "Gerenciar grupos" para criar um grupo e vincular as empresas.</p>
              <button onClick={() => setAbaAtiva('gerenciar')}
                className="text-sm bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700">
                Gerenciar grupos →
              </button>
            </div>
          )}
        </>
      )}

      {/* ── ABA: Gerenciar grupos ── */}
      {abaAtiva === 'gerenciar' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setModalGrupo(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Novo grupo
            </button>
          </div>

          {grupos.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">
              Nenhum grupo cadastrado. Crie um grupo e vincule as empresas.
            </div>
          ) : (
            grupos.map((g: any) => (
              <div key={g.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-gray-900 text-sm">{g.nome}</span>
                    <span className="text-xs text-gray-400">({g.empresas?.length ?? 0} empresa(s) vinculada(s))</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {todasEmpresas.map((emp: any) => {
                    const vinculada = emp.grupoId === g.id || g.empresas?.some((e: any) => e.id === emp.id)
                    return (
                      <div key={emp.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{emp.nome}</p>
                          <p className="text-xs text-gray-400">{emp.cnpj}</p>
                        </div>
                        <button
                          onClick={() => vincular(emp.id, vinculada ? null : g.id)}
                          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                            vinculada
                              ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                          }`}>
                          {vinculada
                            ? <><Unlink className="w-3 h-3" /> Desvincular</>
                            : <><Link className="w-3 h-3" /> Vincular</>}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal novo grupo */}
      {modalGrupo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800">Novo Grupo Empresarial</h3>
              <button onClick={() => setModalGrupo(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div>
              <label className="text-xs text-gray-500">Nome do grupo</label>
              <input value={nomeGrupo} onChange={e => setNomeGrupo(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1"
                placeholder="Ex: JD Fernandes" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalGrupo(false)} className="flex-1 py-2 border border-gray-200 text-sm text-gray-700 rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={criarGrupo} disabled={!nomeGrupo || salvando}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {salvando ? 'Criando...' : 'Criar grupo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
