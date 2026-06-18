'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Download, FileText, Receipt, File } from 'lucide-react'
import { Spinner } from '@/components/ui/TablePage'

const TIPO_MAP: Record<string, { label: string; cls: string; icon: any }> = {
  BOLETO:      { label: 'Boleto',      cls: 'bg-blue-100 text-blue-700',   icon: Receipt  },
  NOTA_FISCAL: { label: 'Nota Fiscal', cls: 'bg-green-100 text-green-700', icon: FileText },
  OUTRO:       { label: 'Outro',       cls: 'bg-gray-100 text-gray-600',   icon: File     },
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function fmtCompetencia(c: string) {
  const [y, m] = c.split('-')
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${meses[parseInt(m) - 1]} / ${y}`
}

export default function MeusDocumentosPage() {
  const [docs, setDocs]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [baixando, setBaixando]     = useState<string | null>(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      const r = await api.get('/documentos')
      setDocs(r.data)
    } finally { setLoading(false) }
  }

  async function baixar(doc: any) {
    setBaixando(doc.id)
    try {
      const r = await api.get(`/documentos/download/${doc.id}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = doc.nome
      a.click()
      URL.revokeObjectURL(url)
    } finally { setBaixando(null) }
  }

  const lista = docs.filter(d => !filtroTipo || d.tipo === filtroTipo)

  // Agrupar por competência
  const grupos: Record<string, any[]> = {}
  for (const d of lista) {
    if (!grupos[d.competencia]) grupos[d.competencia] = []
    grupos[d.competencia].push(d)
  }
  const competencias = Object.keys(grupos).sort((a, b) => b.localeCompare(a))

  return (
    <div className="flex flex-col h-full overflow-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-gray-800">Meus Documentos</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Boletos e notas fiscais disponíveis para download</p>
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-gray-200 rounded-lg text-xs px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400">
          <option value="">Todos os tipos</option>
          <option value="BOLETO">Boletos</option>
          <option value="NOTA_FISCAL">Notas Fiscais</option>
          <option value="OUTRO">Outros</option>
        </select>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Spinner /></div>
      ) : competencias.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <FileText className="w-12 h-12 mb-3 text-gray-200" />
          <p className="text-sm">Nenhum documento disponível</p>
          <p className="text-[11px] mt-1">Documentos enviados pelo administrador aparecerão aqui</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {competencias.map(comp => (
            <div key={comp}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="h-px flex-1 bg-gray-100" />
                {fmtCompetencia(comp)}
                <span className="h-px flex-1 bg-gray-100" />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {grupos[comp].map(doc => {
                  const t = TIPO_MAP[doc.tipo] ?? TIPO_MAP.OUTRO
                  const Icon = t.icon
                  return (
                    <div key={doc.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        doc.tipo === 'BOLETO' ? 'bg-blue-50' : doc.tipo === 'NOTA_FISCAL' ? 'bg-green-50' : 'bg-gray-50'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          doc.tipo === 'BOLETO' ? 'text-blue-500' : doc.tipo === 'NOTA_FISCAL' ? 'text-green-500' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${t.cls}`}>{t.label}</span>
                        <p className="text-xs font-medium text-gray-800 mt-0.5 truncate">
                          {doc.descricao || doc.nome}
                        </p>
                        <p className="text-[10px] text-gray-400">{fmtBytes(doc.tamanhoBytes)}</p>
                      </div>
                      <button
                        onClick={() => baixar(doc)}
                        disabled={baixando === doc.id}
                        className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-50 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
