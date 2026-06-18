'use client'

import { useState } from 'react'
import { Download, FileText, FileCode, FileJson } from 'lucide-react'

import { api } from '@/lib/api'
import { Toast, type ToastState } from '@/components/ui/Toast'

const FORMATOS = [
  {
    id: 'csv',
    label: 'CSV Padrão',
    desc: 'Compatível com Excel, Google Sheets e qualquer ERP',
    icon: FileText,
    ext: 'csv',
    cor: 'border-green-200 bg-green-50',
    corIcon: 'text-green-600',
  },
  {
    id: 'csv_totvs',
    label: 'CSV TOTVS Protheus',
    desc: 'Formato de lançamento financeiro para importação no Protheus',
    icon: FileText,
    ext: 'csv',
    cor: 'border-blue-200 bg-blue-50',
    corIcon: 'text-blue-600',
  },
  {
    id: 'xml_nfe',
    label: 'XML',
    desc: 'Arquivo XML estruturado para integração via API com qualquer sistema',
    icon: FileCode,
    ext: 'xml',
    cor: 'border-orange-200 bg-orange-50',
    corIcon: 'text-orange-600',
  },
  {
    id: 'json',
    label: 'JSON',
    desc: 'Para integrações via API e sistemas modernos',
    icon: FileJson,
    ext: 'json',
    cor: 'border-purple-200 bg-purple-50',
    corIcon: 'text-purple-600',
  },
]

const ADQUIRENTES = [
  'CIELO', 'REDE', 'STONE', 'GETNET', 'PAGSEGURO',
  'ALELO', 'PLUXEE', 'VR_BENEFICIOS', 'TICKET', 'VEROCARD', 'UP_BRASIL',
]

export default function ExportacaoPage() {
  const [formato, setFormato] = useState('csv')
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
  })
  const [adquirente, setAdquirente] = useState('')
  const [tipo, setTipo] = useState<'repasses' | 'divergencias'>('repasses')
  const [baixando, setBaixando] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  async function exportar() {
    setBaixando(true)
    try {
      const params = new URLSearchParams({ formato, dataInicio, dataFim })
      if (adquirente) params.set('adquirente', adquirente)

      const r = await api.get(`/exportacao/${tipo}?${params}`, { responseType: 'blob' })
      const fmtObj = FORMATOS.find(f => f.id === formato)
      const ext = fmtObj?.ext ?? 'csv'
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `conciliapro-${tipo}-${dataInicio}-${dataFim}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch { setToast({ tipo: 'erro', msg: 'Erro ao exportar. Tente novamente.' }) }
    finally { setBaixando(false) }
  }

  return (
    <div className="p-6 space-y-8">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div>
        <h1 className="text-xl font-bold text-gray-900">Exportação ERP</h1>
        <p className="text-sm text-gray-500 mt-0.5">Exporte transações para importação em sistemas de gestão</p>
      </div>

      {/* Tipo de dados */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">O que exportar</h2>
        <div className="flex gap-3">
          {([['repasses', 'Repasses (pagamentos)'], ['divergencias', 'Divergências']] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTipo(v)}
              className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors
                ${tipo === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Filtros</h2>
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="text-xs text-gray-500">Data início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="block border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-0.5 bg-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Data fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="block border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-0.5 bg-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Adquirente</label>
            <select value={adquirente} onChange={e => setAdquirente(e.target.value)}
              className="block border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-0.5 bg-white">
              <option value="">Todos</option>
              {ADQUIRENTES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Formato */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Formato de saída</h2>
        <div className="grid grid-cols-2 gap-3">
          {FORMATOS.map(f => {
            const Icon = f.icon
            return (
              <button
                key={f.id}
                onClick={() => setFormato(f.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all
                  ${formato === f.id ? f.cor + ' border-2' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${formato === f.id ? f.cor : 'bg-gray-100'}`}>
                    <Icon className={`h-5 w-5 ${formato === f.id ? f.corIcon : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{f.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Botão */}
      <button
        onClick={exportar}
        disabled={baixando}
        className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        <Download className="h-4 w-4" />
        {baixando ? 'Gerando arquivo...' : 'Exportar'}
      </button>

      {/* Guia de importação */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Guia de Importação</h3>
        <div className="space-y-2 text-xs text-gray-500">
          <p><strong>CSV Padrão:</strong> Abrir no Excel → Dados → De Texto/CSV → separador ponto-e-vírgula</p>
          <p><strong>TOTVS Protheus:</strong> SIGAFIN → Contas a Receber → Importar Lançamentos → selecionar o CSV gerado</p>
          <p><strong>XML:</strong> Usar o endpoint <code className="bg-gray-200 px-1 rounded">GET /exportacao/repasses?formato=xml_nfe</code> na integração</p>
          <p><strong>JSON:</strong> Consumir direto pela API com header <code className="bg-gray-200 px-1 rounded">Authorization: Bearer TOKEN</code></p>
        </div>
      </div>
    </div>
  )
}

