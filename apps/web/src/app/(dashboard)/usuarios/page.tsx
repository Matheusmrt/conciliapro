'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Check, Pencil, Trash2, ShieldCheck, User, Eye } from 'lucide-react'
import { api } from '@/lib/api'
import { Toast, type ToastState } from '@/components/ui/Toast'

type Usuario = {
  id: string
  nome: string
  email: string
  perfil: 'ADMIN' | 'GERENTE' | 'OPERADOR'
  ativo: boolean
  criadoEm: string
}

const PERFIS = {
  ADMIN: { label: 'Admin', color: 'bg-purple-100 text-purple-700', icon: ShieldCheck },
  GERENTE: { label: 'Gerente', color: 'bg-blue-100 text-blue-700', icon: Eye },
  OPERADOR: { label: 'Operador', color: 'bg-gray-100 text-gray-600', icon: User },
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'OPERADOR' as 'ADMIN' | 'GERENTE' | 'OPERADOR' })
  const [toast, setToast] = useState<ToastState | null>(null)

  async function carregar() {
    setLoading(true)
    api.get('/empresa/usuarios').then(r => setUsuarios(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', email: '', senha: '', perfil: 'OPERADOR' })
    setShowModal(true)
  }

  function abrirEdicao(u: Usuario) {
    setEditando(u)
    setForm({ nome: u.nome, email: u.email, senha: '', perfil: u.perfil })
    setShowModal(true)
  }

  async function salvar() {
    setSalvando(true)
    try {
      if (editando) {
        const body: any = { nome: form.nome, perfil: form.perfil }
        if (form.senha) body.senha = form.senha
        await api.patch(`/empresa/usuarios/${editando.id}`, body)
      } else {
        await api.post('/empresa/usuarios', form)
      }
      setShowModal(false)
      carregar()
    } catch (e: any) {
      setToast({ tipo: 'erro', msg: e.response?.data?.erro ?? 'Erro ao salvar' })
    } finally {
      setSalvando(false)
    }
  }

  async function toggleAtivo(u: Usuario) {
    await api.patch(`/empresa/usuarios/${u.id}`, { ativo: !u.ativo })
    carregar()
  }

  async function excluir(u: Usuario) {
    if (!confirm(`Excluir o usuário "${u.nome}"?`)) return
    try {
      await api.delete(`/empresa/usuarios/${u.id}`)
      carregar()
    } catch (e: any) {
      setToast({ tipo: 'erro', msg: e.response?.data?.erro ?? 'Erro ao excluir' })
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie o acesso ao sistema</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Novo usuário
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              <th className="py-3 pl-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuário</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Perfil</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Desde</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-16 text-center text-gray-400 text-sm">Carregando...</td></tr>
            ) : usuarios.map(u => {
              const P = PERFIS[u.perfil]
              const Icon = P.icon
              return (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 pl-4 pr-4">
                    <p className="text-sm font-medium text-gray-900">{u.nome}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${P.color}`}>
                      <Icon className="h-3 w-3" /> {P.label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleAtivo(u)}
                      className={`text-xs font-medium px-2 py-1 rounded-full transition-colors
                        ${u.ativo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400">
                    {new Date(u.criadoEm).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => abrirEdicao(u)} className="p-1.5 text-gray-400 hover:text-blue-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => excluir(u)} className="p-1.5 text-gray-400 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Info perfis */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-600 mb-2">Níveis de acesso</h3>
        <div className="grid grid-cols-3 gap-3 text-xs text-gray-500">
          <div><span className="font-semibold text-purple-700">Admin</span> — acesso total, incluindo usuários e configurações</div>
          <div><span className="font-semibold text-blue-700">Gerente</span> — acesso a todos os módulos exceto usuários</div>
          <div><span className="font-semibold text-gray-700">Operador</span> — apenas importação e visualização</div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editando ? 'Editar usuário' : 'Novo usuário'}</h2>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Nome completo</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-0.5" />
              </div>
              {!editando && (
                <div>
                  <label className="text-xs text-gray-500">E-mail</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-0.5" />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500">{editando ? 'Nova senha (deixe em branco para manter)' : 'Senha'}</label>
                <input type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                  placeholder={editando ? '••••••' : 'mínimo 6 caracteres'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-0.5" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Perfil de acesso</label>
                <select value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-0.5">
                  <option value="OPERADOR">Operador</option>
                  <option value="GERENTE">Gerente</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Cancelar</button>
              <button
                onClick={salvar}
                disabled={salvando || !form.nome || (!editando && !form.email) || (!editando && !form.senha)}
                className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" /> {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

