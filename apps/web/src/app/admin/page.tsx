'use client'

import { useEffect, useState } from 'react'
import { Building2, Users, TrendingUp, AlertTriangle, CheckCircle, Clock, XCircle, Search, Mail, KeyRound, ChevronDown } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function adminHeaders() {
  const secret = sessionStorage.getItem('admin_secret') ?? ''
  return { 'x-admin-secret': secret, 'Content-Type': 'application/json' }
}

async function adminFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${API}/admin${path}`, { ...opts, headers: { ...adminHeaders(), ...(opts?.headers ?? {}) } })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

const STATUS_INFO: Record<string, { label: string; color: string; icon: any }> = {
  TRIAL:       { label: 'Trial',       color: 'bg-blue-900/50 text-blue-300 border-blue-800',    icon: Clock },
  ATIVO:       { label: 'Ativo',       color: 'bg-emerald-900/50 text-emerald-300 border-emerald-800', icon: CheckCircle },
  INADIMPLENTE:{ label: 'Inadimplente',color: 'bg-yellow-900/50 text-yellow-300 border-yellow-800', icon: AlertTriangle },
  CANCELADO:   { label: 'Cancelado',   color: 'bg-red-900/50 text-red-300 border-red-800',       icon: XCircle },
}

const PLANO_COLOR: Record<string, string> = {
  BASICO:        'text-gray-400',
  PROFISSIONAL:  'text-blue-400',
  ENTERPRISE:    'text-purple-400',
}

type Empresa = {
  id: string; nome: string; cnpj: string; email: string; telefone?: string
  plano: string; statusSaas: string; trialEndsAt?: string; ativo: boolean
  criadoEm: string; usuarios: number; estabelecimentos: number
}

type Stats = {
  totalEmpresas: number
  porStatus: { ativas: number; trial: number; inadimplentes: number; canceladas: number }
  totalUsuarios: number
  totalTransacoes: number
}

export default function AdminPage() {
  const [stats, setStats]       = useState<Stats | null>(null)
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [busca, setBusca]       = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [loading, setLoading]   = useState(true)
  const [erro, setErro]         = useState('')

  // Modal ações
  const [modal, setModal]     = useState<'email' | 'senha' | 'status' | null>(null)
  const [empresaSel, setEmpresaSel] = useState<Empresa | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [emailAssunto, setEmailAssunto] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [novoStatus, setNovoStatus] = useState('')
  const [actionMsg, setActionMsg] = useState('')

  async function carregar() {
    setLoading(true); setErro('')
    try {
      const params = new URLSearchParams()
      if (busca) params.set('busca', busca)
      if (filtroStatus) params.set('status', filtroStatus)
      const [s, e] = await Promise.all([
        adminFetch('/stats'),
        adminFetch(`/empresas?${params}`),
      ])
      setStats(s); setEmpresas(e)
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao carregar')
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [busca, filtroStatus])

  async function enviarEmail() {
    if (!empresaSel) return
    setActionLoading(true)
    try {
      await adminFetch(`/empresas/${empresaSel.id}/email`, {
        method: 'POST',
        body: JSON.stringify({ assunto: emailAssunto, mensagem: emailMsg }),
      })
      setActionMsg('E-mail enviado com sucesso!')
    } catch { setActionMsg('Erro ao enviar e-mail') }
    finally { setActionLoading(false) }
  }

  async function resetarSenha() {
    if (!empresaSel) return
    setActionLoading(true)
    try {
      const r = await adminFetch(`/empresas/${empresaSel.id}/resetar-senha`, {
        method: 'POST',
        body: JSON.stringify({ novaSenha }),
      }) as any
      setActionMsg(`Senha do admin (${r.email}) redefinida!`)
    } catch { setActionMsg('Erro ao redefinir senha') }
    finally { setActionLoading(false) }
  }

  async function alterarStatus() {
    if (!empresaSel || !novoStatus) return
    setActionLoading(true)
    try {
      await adminFetch(`/empresas/${empresaSel.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ statusSaas: novoStatus }),
      })
      setActionMsg('Status atualizado!')
      carregar()
    } catch { setActionMsg('Erro ao alterar status') }
    finally { setActionLoading(false) }
  }

  function abrirModal(tipo: typeof modal, empresa: Empresa) {
    setModal(tipo); setEmpresaSel(empresa)
    setActionMsg(''); setEmailAssunto(''); setEmailMsg('')
    setNovaSenha(''); setNovoStatus(empresa.statusSaas)
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total de Clientes', value: stats.totalEmpresas, icon: Building2, color: 'text-blue-400' },
            { label: 'Ativos', value: stats.porStatus.ativas, icon: CheckCircle, color: 'text-emerald-400' },
            { label: 'Em Trial', value: stats.porStatus.trial, icon: Clock, color: 'text-blue-400' },
            { label: 'Inadimplentes', value: stats.porStatus.inadimplentes, icon: AlertTriangle, color: 'text-yellow-400' },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-3xl font-black text-white">{s.value}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar empresa, e-mail ou CNPJ..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600" />
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-600">
          <option value="">Todos os status</option>
          <option value="TRIAL">Trial</option>
          <option value="ATIVO">Ativo</option>
          <option value="INADIMPLENTE">Inadimplente</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      {erro && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-400">{erro}</div>
      )}

      {/* Tabela */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 text-[10px] text-gray-500 uppercase tracking-wider font-bold">
              <th className="text-left px-5 py-3">Empresa</th>
              <th className="text-left px-4 py-3">Plano</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-center px-4 py-3">Usuários</th>
              <th className="text-center px-4 py-3">CNPJs</th>
              <th className="text-left px-4 py-3">Cadastro</th>
              <th className="text-left px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {loading ? (
              <tr><td colSpan={7} className="py-16 text-center text-gray-500 text-sm">Carregando...</td></tr>
            ) : empresas.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-gray-500 text-sm">Nenhuma empresa encontrada</td></tr>
            ) : empresas.map(e => {
              const st = STATUS_INFO[e.statusSaas]
              const StatusIcon = st?.icon ?? Clock
              return (
                <tr key={e.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-bold text-white">{e.nome}</p>
                    <p className="text-xs text-gray-500">{e.email}</p>
                    <p className="text-xs text-gray-600">{e.cnpj}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-bold ${PLANO_COLOR[e.plano]}`}>{e.plano}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${st?.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {st?.label}
                    </span>
                    {e.statusSaas === 'TRIAL' && e.trialEndsAt && (
                      <p className="text-[10px] text-gray-600 mt-1">
                        até {new Date(e.trialEndsAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-400">{e.usuarios}</td>
                  <td className="px-4 py-4 text-center text-sm text-gray-400">{e.estabelecimentos}</td>
                  <td className="px-4 py-4 text-xs text-gray-500">
                    {new Date(e.criadoEm).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      <button onClick={() => abrirModal('email', e)} title="Enviar e-mail"
                        className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors">
                        <Mail className="h-4 w-4" />
                      </button>
                      <button onClick={() => abrirModal('senha', e)} title="Resetar senha"
                        className="p-1.5 text-gray-500 hover:text-yellow-400 transition-colors">
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button onClick={() => abrirModal('status', e)} title="Alterar status"
                        className="p-1.5 text-gray-500 hover:text-emerald-400 transition-colors">
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && empresaSel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white">
                  {modal === 'email' ? 'Enviar E-mail' : modal === 'senha' ? 'Resetar Senha' : 'Alterar Status'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{empresaSel.nome}</p>
              </div>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
            </div>

            {modal === 'email' && (
              <div className="space-y-3">
                <input value={emailAssunto} onChange={e => setEmailAssunto(e.target.value)}
                  placeholder="Assunto do e-mail"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
                <textarea value={emailMsg} onChange={e => setEmailMsg(e.target.value)}
                  placeholder="Mensagem..."
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none" />
                <button onClick={enviarEmail} disabled={actionLoading || !emailAssunto || !emailMsg}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">
                  {actionLoading ? 'Enviando...' : 'Enviar E-mail'}
                </button>
              </div>
            )}

            {modal === 'senha' && (
              <div className="space-y-3">
                <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Nova senha (mín. 6 caracteres)"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
                <button onClick={resetarSenha} disabled={actionLoading || novaSenha.length < 6}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">
                  {actionLoading ? 'Redefinindo...' : 'Redefinir Senha'}
                </button>
              </div>
            )}

            {modal === 'status' && (
              <div className="space-y-3">
                <select value={novoStatus} onChange={e => setNovoStatus(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="TRIAL">Trial</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="INADIMPLENTE">Inadimplente</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
                <button onClick={alterarStatus} disabled={actionLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">
                  {actionLoading ? 'Salvando...' : 'Alterar Status'}
                </button>
              </div>
            )}

            {actionMsg && (
              <p className={`text-sm text-center ${actionMsg.includes('Erro') ? 'text-red-400' : 'text-emerald-400'}`}>
                {actionMsg}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
