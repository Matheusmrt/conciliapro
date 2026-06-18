'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, Building2, Store, Plug, Bell, Mail, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'

type Empresa = { id: string; nome: string; cnpj: string; email: string; plano: string }
type Estab = { id: string; nome: string; cnpj: string }
type AdqConfig = { id: string; adquirente: string; tipoAcesso: string; ativo: boolean; credenciais: Record<string, string>; ultimaSincEm?: string }

const ADQUIRENTES_GRUPOS = [
  { grupo: 'Cartões', itens: ['CIELO', 'REDE', 'STONE', 'GETNET', 'PAGSEGURO', 'SAFRA', 'BIN'] },
  { grupo: 'Benefícios', itens: ['ALELO', 'PLUXEE', 'VR_BENEFICIOS', 'TICKET', 'VEROCARD', 'UP_BRASIL', 'BEN_VISA_VALE'] },
]

const LABELS: Record<string, string> = {
  CIELO: 'Cielo', REDE: 'Rede', STONE: 'Stone', GETNET: 'GetNet', PAGSEGURO: 'PagSeguro', SAFRA: 'Safra', BIN: 'Bin',
  ALELO: 'Alelo', PLUXEE: 'Pluxee (Sodexo)', VR_BENEFICIOS: 'VR Benefícios', TICKET: 'Ticket',
  VEROCARD: 'Verocard', UP_BRASIL: 'Up Brasil', BEN_VISA_VALE: 'Ben Visa Vale',
}

const TIPO_ACESSO = ['UPLOAD_MANUAL', 'EDI_SFTP', 'API_REST', 'WEBHOOK']

const CAMPOS_SFTP = ['sftpHost', 'sftpPort', 'sftpUser', 'sftpPass', 'sftpPath']
const CAMPOS_API = ['apiUrl', 'clientId', 'clientSecret', 'merchantId']

// Formata CNPJ
function fmtCNPJ(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 14)
  if (n.length <= 2) return n
  if (n.length <= 5) return `${n.slice(0,2)}.${n.slice(2)}`
  if (n.length <= 8) return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5)}`
  if (n.length <= 12) return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5,8)}/${n.slice(8)}`
  return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5,8)}/${n.slice(8,12)}-${n.slice(12)}`
}

// ─── Seção Empresa ────────────────────────────────────────────────────────────
function SecaoEmpresa() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', cnpj: '' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    api.get('/empresa/me').then(r => { setEmpresa(r.data); setForm({ nome: r.data.nome, email: r.data.email, cnpj: r.data.cnpj ?? '' }) })
  }, [])

  async function salvar() {
    setSalvando(true)
    try {
      const r = await api.put('/empresa/me', form)
      setEmpresa(r.data); setEditando(false)
    } catch {} finally { setSalvando(false) }
  }

  if (!empresa) return <div className="text-sm text-gray-400">Carregando...</div>

  return (
    <div className="space-y-3">
      {editando ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">Nome da empresa</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500">CNPJ</label>
            <input value={fmtCNPJ(form.cnpj)} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value.replace(/\D/g, '') }))}
              placeholder="00.000.000/0000-00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500">E-mail</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-2 flex gap-2">
            <button onClick={salvar} disabled={salvando}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              <Check className="h-3.5 w-3.5" /> Salvar
            </button>
            <button onClick={() => setEditando(false)} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-base font-semibold text-gray-900">{empresa.nome}</p>
            <p className="text-sm text-gray-500">CNPJ: {fmtCNPJ(empresa.cnpj)}</p>
            <p className="text-sm text-gray-500">{empresa.email}</p>
            <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{empresa.plano}</span>
          </div>
          <button onClick={() => setEditando(true)} className="p-2 text-gray-400 hover:text-gray-600">
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Seção Estabelecimentos ───────────────────────────────────────────────────
function SecaoEstabelecimentos() {
  const [estabs, setEstabs] = useState<Estab[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', cnpj: '' })
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    api.get('/empresa/estabelecimentos').then(r => setEstabs(r.data)).catch(() => {})
  }

  useEffect(() => { carregar() }, [])

  async function salvar() {
    setSalvando(true)
    try {
      if (editId) await api.put(`/empresa/estabelecimentos/${editId}`, form)
      else        await api.post('/empresa/estabelecimentos', form)
      carregar(); setShowForm(false); setEditId(null); setForm({ nome: '', cnpj: '' })
    } catch {} finally { setSalvando(false) }
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este estabelecimento? Todos os dados vinculados serão mantidos.')) return
    await api.delete(`/empresa/estabelecimentos/${id}`)
    carregar()
  }

  function iniciarEdicao(e: Estab) {
    setEditId(e.id); setForm({ nome: e.nome, cnpj: fmtCNPJ(e.cnpj) }); setShowForm(true)
  }

  return (
    <div className="space-y-3">
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden bg-white">
        {estabs.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Nenhum estabelecimento cadastrado</p>
        )}
        {estabs.map(e => (
          <div key={e.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{e.nome}</p>
              <p className="text-xs text-gray-400">CNPJ {fmtCNPJ(e.cnpj)}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => iniciarEdicao(e)} className="p-1.5 text-gray-400 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => excluir(e.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      {showForm ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Nome</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Loja Centro" />
            </div>
            <div>
              <label className="text-xs text-gray-500">CNPJ</label>
              <input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: fmtCNPJ(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="00.000.000/0001-00" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={salvar} disabled={salvando || !form.nome || !form.cnpj}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Check className="h-3.5 w-3.5" /> {editId ? 'Atualizar' : 'Adicionar'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm({ nome: '', cnpj: '' }) }}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg">Cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
          <Plus className="h-4 w-4" /> Adicionar estabelecimento
        </button>
      )}
    </div>
  )
}

// ─── Seção Adquirentes ────────────────────────────────────────────────────────
function SecaoAdquirentes() {
  const [configs, setConfigs] = useState<AdqConfig[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    adquirente: 'CIELO', tipoAcesso: 'UPLOAD_MANUAL',
    credenciais: {} as Record<string, string>,
  })
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    api.get('/empresa/adquirentes').then(r => setConfigs(r.data)).catch(() => {})
  }

  useEffect(() => { carregar() }, [])

  async function salvar() {
    setSalvando(true)
    try {
      await api.post('/empresa/adquirentes', form)
      carregar(); setShowForm(false)
    } catch {} finally { setSalvando(false) }
  }

  async function excluir(id: string) {
    if (!confirm('Remover configuração desta adquirente?')) return
    await api.delete(`/empresa/adquirentes/${id}`)
    carregar()
  }

  const camposExtra = form.tipoAcesso === 'EDI_SFTP' ? CAMPOS_SFTP : form.tipoAcesso === 'API_REST' ? CAMPOS_API : []

  return (
    <div className="space-y-3">
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden bg-white">
        {configs.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Nenhuma adquirente configurada</p>
        )}
        {configs.map(c => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900">{LABELS[c.adquirente] ?? c.adquirente}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${c.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-xs text-gray-400">{c.tipoAcesso.replace('_', ' ')}</p>
            </div>
            <button onClick={() => excluir(c.id)} className="p-1.5 text-gray-400 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {showForm ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Adquirente</label>
              <select value={form.adquirente} onChange={e => setForm(f => ({ ...f, adquirente: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {ADQUIRENTES_GRUPOS.map(g => (
                  <optgroup key={g.grupo} label={g.grupo}>
                    {g.itens.map(a => <option key={a} value={a}>{LABELS[a] ?? a}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Tipo de acesso</label>
              <select value={form.tipoAcesso} onChange={e => setForm(f => ({ ...f, tipoAcesso: e.target.value, credenciais: {} }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {TIPO_ACESSO.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          {camposExtra.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Credenciais</p>
              <div className="grid grid-cols-2 gap-2">
                {camposExtra.map(campo => (
                  <div key={campo}>
                    <label className="text-xs text-gray-400">{campo}</label>
                    <input
                      type={campo.toLowerCase().includes('pass') || campo.toLowerCase().includes('secret') ? 'password' : 'text'}
                      value={form.credenciais[campo] ?? ''}
                      onChange={e => setForm(f => ({ ...f, credenciais: { ...f.credenciais, [campo]: e.target.value } }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={salvar} disabled={salvando}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              <Check className="h-3.5 w-3.5" /> Salvar
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg">Cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
          <Plus className="h-4 w-4" /> Configurar adquirente
        </button>
      )}
    </div>
  )
}

// ─── Seção Notificações ───────────────────────────────────────────────────────
function SecaoNotificacoes() {
  const [smtpConfig, setSmtpConfig] = useState<any>(null)
  const [emailTeste, setEmailTeste] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    api.get('/notificacoes/config').then(r => setSmtpConfig(r.data)).catch(() => {})
  }, [])

  async function testar() {
    if (!emailTeste) return
    setEnviando(true); setStatus(null)
    try {
      const r = await api.post('/notificacoes/testar-smtp', { para: emailTeste })
      const d = r.data
      setStatus(d.ok ? '✅ E-mail enviado com sucesso!' : `⚠ ${d.motivo ?? 'Verifique as configurações SMTP no arquivo .env da API'}`)
    } catch { setStatus('Erro ao conectar') }
    finally { setEnviando(false) }
  }

  async function enviarAlerta() {
    setEnviando(true); setStatus(null)
    try {
      const r = await api.post('/notificacoes/alertar-divergencias', {})
      const d = r.data
      setStatus(d.enviado ? `✅ Alerta enviado para ${d.destino} (${d.qtde} divergências)` : `ℹ ${d.motivo}`)
    } catch { setStatus('Erro ao enviar') }
    finally { setEnviando(false) }
  }

  async function enviarRelatorio() {
    setEnviando(true); setStatus(null)
    try {
      const r = await api.post('/notificacoes/relatorio-diario', {})
      const d = r.data
      setStatus(d.enviado ? `✅ Relatório enviado para ${d.destino}` : `ℹ ${d.motivo}`)
    } catch { setStatus('Erro ao enviar') }
    finally { setEnviando(false) }
  }

  const configurado = smtpConfig?.smtpConfigured

  return (
    <div className="space-y-5">
      {/* Status SMTP */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${configurado ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        {configurado
          ? <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          : <Bell className="h-5 w-5 text-yellow-600 shrink-0" />}
        <div>
          <p className={`text-sm font-semibold ${configurado ? 'text-green-800' : 'text-yellow-800'}`}>
            {configurado ? 'SMTP configurado' : 'SMTP não configurado'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {configurado
              ? `Servidor: ${smtpConfig?.smtpHost} · Usuário: ${smtpConfig?.smtpUser}`
              : 'Edite o arquivo apps/api/.env e adicione SMTP_HOST, SMTP_USER, SMTP_PASS'}
          </p>
        </div>
      </div>

      {/* Configuração no .env */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 mb-2">Variáveis de ambiente (apps/api/.env)</h3>
        <pre className="bg-gray-900 text-green-400 text-xs rounded-xl p-4 overflow-x-auto">{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu@email.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM="ConciliaPro <seu@email.com>"`}</pre>
        <p className="text-xs text-gray-400 mt-2">Para Gmail, use uma <strong>senha de app</strong> em Conta Google → Segurança → Senhas de app.</p>
      </div>

      {/* Teste de e-mail */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 mb-2">Testar envio</h3>
        <div className="flex gap-2">
          <input
            type="email"
            value={emailTeste}
            onChange={e => setEmailTeste(e.target.value)}
            placeholder="email@destino.com"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={testar}
            disabled={enviando || !emailTeste}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Testar SMTP
          </button>
        </div>
      </div>

      {/* Ações rápidas */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 mb-2">Envio manual</h3>
        <div className="flex gap-2">
          <button
            onClick={enviarAlerta}
            disabled={enviando}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 disabled:opacity-50"
          >
            <Bell className="h-3.5 w-3.5" /> Alertar divergências
          </button>
          <button
            onClick={enviarRelatorio}
            disabled={enviando}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
          >
            <Mail className="h-3.5 w-3.5" /> Enviar resumo diário
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Enviado para o e-mail cadastrado na empresa.</p>
      </div>

      {status && (
        <p className={`text-sm font-medium ${status.startsWith('✅') ? 'text-green-700' : 'text-yellow-700'}`}>{status}</p>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<'empresa' | 'estabelecimentos' | 'adquirentes' | 'notificacoes'>('empresa')

  const abas = [
    { id: 'empresa' as const, label: 'Empresa', icon: Building2 },
    { id: 'estabelecimentos' as const, label: 'Estabelecimentos', icon: Store },
    { id: 'adquirentes' as const, label: 'Adquirentes & SFTP', icon: Plug },
    { id: 'notificacoes' as const, label: 'Notificações', icon: Bell },
  ]

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Dados da empresa, estabelecimentos e integrações com adquirentes</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {abas.map(a => {
          const Icon = a.icon
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${aba === a.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Icon className="h-4 w-4" /> {a.label}
            </button>
          )
        })}
      </div>

      {/* Conteúdo */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {aba === 'empresa' && (
          <>
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Dados da Empresa</h2>
            <SecaoEmpresa />
          </>
        )}
        {aba === 'estabelecimentos' && (
          <>
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Estabelecimentos</h2>
            <p className="text-xs text-gray-400 mb-4">Cada estabelecimento tem seu próprio CNPJ e conjunto de transações independentes.</p>
            <SecaoEstabelecimentos />
          </>
        )}
        {aba === 'adquirentes' && (
          <>
            <h2 className="text-sm font-semibold text-gray-700 mb-1">Configuração de Adquirentes</h2>
            <p className="text-xs text-gray-400 mb-4">Configure o método de coleta de cada adquirente. SFTP e API permitem coleta automática via workers.</p>
            <SecaoAdquirentes />
          </>
        )}
        {aba === 'notificacoes' && (
          <>
            <h2 className="text-sm font-semibold text-gray-700 mb-1">Notificações por E-mail</h2>
            <p className="text-xs text-gray-400 mb-4">Configure o servidor SMTP para receber alertas de divergências e resumos diários.</p>
            <SecaoNotificacoes />
          </>
        )}
      </div>
    </div>
  )
}
