'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Bell, Plus, Trash2, Play, CheckCircle, X, AlertTriangle, Activity } from 'lucide-react'

const TIPOS_ALERTA = [
  { value: 'TAXA_MDR_ALTA', label: 'Taxa MDR alta' },
  { value: 'DIVERGENCIA_NOVA', label: 'Nova divergência' },
  { value: 'SEM_REPASSE_DIAS', label: 'Sem repasse por N dias' },
  { value: 'TAXA_CONCILIACAO_BAIXA', label: 'Taxa de conciliação baixa' },
  { value: 'VALOR_REPASSE_DIVERGENTE', label: 'Valor de repasse divergente' },
]

const TIPO_DESC: Record<string, string> = {
  TAXA_MDR_ALTA: 'Dispara quando a taxa MDR superar o limite configurado',
  DIVERGENCIA_NOVA: 'Dispara quando uma nova divergência for detectada',
  SEM_REPASSE_DIAS: 'Dispara quando não houver repasse por N dias consecutivos',
  TAXA_CONCILIACAO_BAIXA: 'Dispara quando a taxa de conciliação cair abaixo do limite',
  VALOR_REPASSE_DIVERGENTE: 'Dispara quando o valor do repasse diferir mais que X% do esperado',
}

export default function AlertasPage() {
  const [regras, setRegras] = useState<any[]>([])
  const [disparos, setDisparos] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'TAXA_MDR_ALTA', emailNotif: '', condicaoValor: '' })

  useEffect(() => {
    Promise.all([
      api.get('/alertas'),
      api.get('/alertas/disparos'),
    ]).then(([r1, r2]) => {
      setRegras(r1.data)
      setDisparos(r2.data)
    })
  }, [])

  async function salvar() {
    setSalvando(true)
    try {
      await api.post('/alertas', {
        nome: form.nome,
        tipo: form.tipo,
        emailNotif: form.emailNotif || undefined,
        condicao: form.condicaoValor ? { valor: Number(form.condicaoValor) } : {},
      })
      const r = await api.get('/alertas')
      setRegras(r.data)
      setModal(false)
      setForm({ nome: '', tipo: 'TAXA_MDR_ALTA', emailNotif: '', condicaoValor: '' })
    } finally { setSalvando(false) }
  }

  async function excluir(id: string) {
    await api.delete(`/alertas/${id}`)
    setRegras(r => r.filter(x => x.id !== id))
  }

  async function verificar() {
    setVerificando(true)
    try {
      await api.post('/alertas/verificar')
      const [r1, r2] = await Promise.all([api.get('/alertas'), api.get('/alertas/disparos')])
      setRegras(r1.data)
      setDisparos(r2.data)
    } finally { setVerificando(false) }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Alertas Automáticos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure regras para receber alertas quando anomalias forem detectadas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={verificar} disabled={verificando}
            className="flex items-center gap-1.5 border border-gray-200 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50">
            <Play className="h-4 w-4" /> {verificando ? 'Verificando...' : 'Verificar agora'}
          </button>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Nova regra
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Regras ativas</p>
          <p className="text-3xl font-extrabold text-blue-700">{regras.filter(r => r.ativo).length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Disparos hoje</p>
          <p className="text-3xl font-extrabold text-orange-600">
            {disparos.filter(d => new Date(d.criadoEm).toDateString() === new Date().toDateString()).length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total de disparos</p>
          <p className="text-3xl font-extrabold text-gray-800">{disparos.length}</p>
        </div>
      </div>

      {/* Regras */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Regras configuradas</h3>
        </div>
        {regras.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhuma regra configurada</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {regras.map((r: any) => (
              <div key={r.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${r.ativo ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{r.nome}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{TIPO_DESC[r.tipo]}</p>
                    {r.emailNotif && <p className="text-xs text-blue-600 mt-0.5">Notificar: {r.emailNotif}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{r._count?.disparos ?? 0} disparos históricos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                    {TIPOS_ALERTA.find(t => t.value === r.tipo)?.label}
                  </span>
                  <button onClick={() => excluir(r.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disparos */}
      {disparos.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Histórico de Disparos</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {disparos.slice(0, 20).map((d: any) => (
              <div key={d.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{d.mensagem}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{d.regra?.nome} · {new Date(d.criadoEm).toLocaleString('pt-BR')}</p>
                </div>
                {d.emailEnviado && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal nova regra */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800">Nova Regra de Alerta</h3>
              <button onClick={() => setModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Nome da regra</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 mt-1" placeholder="Ex: Taxa MDR alta Cielo" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Tipo de alerta</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 mt-1">
                  {TIPOS_ALERTA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">{TIPO_DESC[form.tipo]}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Valor de referência (opcional)</label>
                <input type="number" value={form.condicaoValor} onChange={e => setForm(f => ({ ...f, condicaoValor: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 mt-1" placeholder="Ex: 3.5 (para taxa), 5 (para dias)" />
              </div>
              <div>
                <label className="text-xs text-gray-500">E-mail para notificação (opcional)</label>
                <input type="email" value={form.emailNotif} onChange={e => setForm(f => ({ ...f, emailNotif: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 mt-1" placeholder="alerta@empresa.com" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 py-2 border border-gray-200 text-sm text-gray-700 rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={salvar} disabled={!form.nome || salvando}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Criar regra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

