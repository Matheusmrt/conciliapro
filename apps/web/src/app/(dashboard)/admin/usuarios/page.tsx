'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Plus, Pencil, Trash2, RefreshCw, UserCheck, UserX, X } from 'lucide-react'

const PERFIS = ['ADMIN', 'OPERADOR', 'VISUALIZADOR'] as const
type Perfil = typeof PERFIS[number]

interface Empresa { id: string; nome: string }
interface Usuario {
  id: string
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
  criadoEm: string
  empresa: { id: string; nome: string }
}

const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? 'conciliapro-admin-2024-mude-em-producao'
const adminHeaders = { 'x-admin-secret': ADMIN_SECRET }

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('')

  const [modal, setModal] = useState<'criar' | 'editar' | 'senha' | null>(null)
  const [selecionado, setSelecionado] = useState<Usuario | null>(null)
  const [form, setForm] = useState({ empresaId: '', nome: '', email: '', senha: '', perfil: 'OPERADOR' as Perfil })
  const [novaSenha, setNovaSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setCarregando(true)
    try {
      const [u, e] = await Promise.all([
        api.get('/admin/usuarios', { headers: adminHeaders }),
        api.get('/admin/empresas', { headers: adminHeaders }),
      ])
      setUsuarios(u.data)
      setEmpresas(e.data)
    } catch { /* silencioso */ }
    finally { setCarregando(false) }
  }

  function abrirCriar() {
    setForm({ empresaId: '', nome: '', email: '', senha: '', perfil: 'OPERADOR' })
    setErro('')
    setModal('criar')
  }

  function abrirEditar(u: Usuario) {
    setSelecionado(u)
    setForm({ empresaId: u.empresa.id, nome: u.nome, email: u.email, senha: '', perfil: u.perfil })
    setErro('')
    setModal('editar')
  }

  function abrirSenha(u: Usuario) {
    setSelecionado(u)
    setNovaSenha('')
    setErro('')
    setModal('senha')
  }

  async function salvarCriar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true); setErro('')
    try {
      await api.post('/admin/usuarios', form, { headers: adminHeaders })
      setFeedback('Usuário criado e e-mail de boas-vindas enviado.')
      setModal(null)
      carregar()
    } catch (err: any) {
      setErro(err.response?.data?.erro ?? 'Erro ao criar usuário.')
    } finally { setSalvando(false) }
  }

  async function salvarEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!selecionado) return
    setSalvando(true); setErro('')
    try {
      await api.patch(`/admin/usuarios/${selecionado.id}`, { nome: form.nome, email: form.email, perfil: form.perfil }, { headers: adminHeaders })
      setFeedback('Usuário atualizado.')
      setModal(null)
      carregar()
    } catch (err: any) {
      setErro(err.response?.data?.erro ?? 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  async function salvarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (!selecionado) return
    if (novaSenha.length < 8) { setErro('Mínimo 8 caracteres.'); return }
    setSalvando(true); setErro('')
    try {
      await api.post(`/admin/usuarios/${selecionado.id}/resetar-senha`, { novaSenha }, { headers: adminHeaders })
      setFeedback('Senha redefinida e e-mail enviado ao usuário.')
      setModal(null)
    } catch { setErro('Erro ao redefinir senha.') }
    finally { setSalvando(false) }
  }

  async function toggleAtivo(u: Usuario) {
    try {
      await api.patch(`/admin/usuarios/${u.id}`, { ativo: !u.ativo }, { headers: adminHeaders })
      setFeedback(u.ativo ? 'Usuário desativado.' : 'Usuário ativado.')
      carregar()
    } catch { /* silencioso */ }
  }

  async function excluir(u: Usuario) {
    if (!confirm(`Excluir o usuário "${u.nome}"? Esta ação não pode ser desfeita.`)) return
    try {
      await api.delete(`/admin/usuarios/${u.id}`, { headers: adminHeaders })
      setFeedback('Usuário excluído.')
      carregar()
    } catch { /* silencioso */ }
  }

  const filtrados = usuarios.filter(u => {
    if (filtroEmpresa && u.empresa.id !== filtroEmpresa) return false
    if (filtroAtivo === 'ativo' && !u.ativo) return false
    if (filtroAtivo === 'inativo' && u.ativo) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Gestão de Acessos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Crie e gerencie logins para seus clientes</p>
        </div>
        <button onClick={abrirCriar}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Novo acesso
        </button>
      </div>

      {feedback && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          {feedback}
          <button onClick={() => setFeedback('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3">
        <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
          <option value="">Todas as empresas</option>
          {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select value={filtroAtivo} onChange={e => setFiltroAtivo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
          <option value="">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
        <span className="ml-auto text-sm text-gray-400 self-center">{filtrados.length} usuário(s)</span>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {carregando ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Nenhum usuário encontrado.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Nome</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">E-mail</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Empresa</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Perfil</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.nome}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.empresa.nome}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                      u.perfil === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                      u.perfil === 'OPERADOR' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{u.perfil}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                      u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>{u.ativo ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => abrirEditar(u)} title="Editar"
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => abrirSenha(u)} title="Redefinir senha"
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleAtivo(u)} title={u.ativo ? 'Desativar' : 'Ativar'}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                        {u.ativo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => excluir(u)} title="Excluir"
                        className="p-1.5 rounded hover:bg-red-50 text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Criar */}
      {modal === 'criar' && (
        <Modal titulo="Novo acesso" onClose={() => setModal(null)}>
          <form onSubmit={salvarCriar} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700">Empresa</label>
              <select value={form.empresaId} onChange={e => setForm(f => ({ ...f, empresaId: e.target.value }))} required
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                <option value="">Selecionar empresa...</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Nome</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required minLength={2}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Senha inicial</label>
              <input type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} required minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Perfil</label>
              <select value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value as Perfil }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <p className="text-xs text-gray-500">Um e-mail com as credenciais será enviado automaticamente.</p>
            <ModalFooter onClose={() => setModal(null)} salvando={salvando} label="Criar acesso" />
          </form>
        </Modal>
      )}

      {/* Modal Editar */}
      {modal === 'editar' && selecionado && (
        <Modal titulo="Editar acesso" onClose={() => setModal(null)}>
          <form onSubmit={salvarEditar} className="space-y-3">
            <p className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">
              Empresa: <strong>{selecionado.empresa.nome}</strong>
            </p>
            <div>
              <label className="text-xs font-medium text-gray-700">Nome</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required minLength={2}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Perfil</label>
              <select value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value as Perfil }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <ModalFooter onClose={() => setModal(null)} salvando={salvando} label="Salvar" />
          </form>
        </Modal>
      )}

      {/* Modal Redefinir Senha */}
      {modal === 'senha' && selecionado && (
        <Modal titulo={`Redefinir senha`} onClose={() => setModal(null)}>
          <form onSubmit={salvarSenha} className="space-y-3">
            <p className="text-sm text-gray-600">
              Nova senha para <strong>{selecionado.nome}</strong> ({selecionado.email}).
              O usuário receberá um e-mail com as novas credenciais.
            </p>
            <div>
              <label className="text-xs font-medium text-gray-700">Nova senha</label>
              <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <ModalFooter onClose={() => setModal(null)} salvando={salvando} label="Redefinir e enviar" />
          </form>
        </Modal>
      )}
    </div>
  )
}

function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{titulo}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalFooter({ onClose, salvando, label }: { onClose: () => void; salvando: boolean; label: string }) {
  return (
    <div className="flex gap-2 pt-2">
      <button type="button" onClick={onClose}
        className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
        Cancelar
      </button>
      <button type="submit" disabled={salvando}
        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
        {salvando ? 'Salvando...' : label}
      </button>
    </div>
  )
}

