'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { Upload, Trash2, Download, FileText, Receipt, File } from 'lucide-react'
import { Spinner } from '@/components/ui/TablePage'

const TIPOS = [
  { value: 'BOLETO',       label: 'Boleto',       icon: Receipt  },
  { value: 'NOTA_FISCAL',  label: 'Nota Fiscal',  icon: FileText },
  { value: 'OUTRO',        label: 'Outro',        icon: File     },
]

const TIPO_MAP: Record<string, { label: string; cls: string }> = {
  BOLETO:      { label: 'Boleto',      cls: 'bg-blue-100 text-blue-700' },
  NOTA_FISCAL: { label: 'Nota Fiscal', cls: 'bg-green-100 text-green-700' },
  OUTRO:       { label: 'Outro',       cls: 'bg-gray-100 text-gray-600' },
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function fmtCompetencia(c: string) {
  const [y, m] = c.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[parseInt(m) - 1]}/${y}`
}

export default function DocumentosPage() {
  const [docs, setDocs]           = useState<any[]>([])
  const [empresas, setEmpresas]   = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [drag, setDrag]           = useState(false)
  const fileRef                   = useRef<HTMLInputElement>(null)

  const hoje = new Date()
  const compAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  const [empresaId,   setEmpresaId]   = useState('')
  const [tipo,        setTipo]        = useState('BOLETO')
  const [competencia, setCompetencia] = useState(compAtual)
  const [descricao,   setDescricao]   = useState('')
  const [arquivo,     setArquivo]     = useState<File | null>(null)
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroTipo,    setFiltroTipo]    = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? 'conciliapro-admin-2024-mude-em-producao'
      const [d, e] = await Promise.all([
        api.get('/documentos/admin'),
        api.get('/admin/empresas', { headers: { 'x-admin-secret': ADMIN_SECRET } }),
      ])
      setDocs(d.data)
      setEmpresas(e.data)
      if (!empresaId && e.data.length > 0) setEmpresaId(e.data[0].id)
    } finally { setLoading(false) }
  }

  async function fazer_upload() {
    if (!arquivo || !empresaId || !competencia) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', arquivo)
      form.append('empresaId', empresaId)
      form.append('tipo', tipo)
      form.append('competencia', competencia)
      form.append('descricao', descricao)
      await api.post('/documentos/admin/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setArquivo(null)
      setDescricao('')
      if (fileRef.current) fileRef.current.value = ''
      carregar()
    } finally { setUploading(false) }
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este documento?')) return
    await api.delete(`/documentos/admin/${id}`)
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) setArquivo(f)
  }

  const lista = docs.filter(d =>
    (!filtroEmpresa || d.empresaId === filtroEmpresa) &&
    (!filtroTipo    || d.tipo === filtroTipo)
  )

  return (
    <div className="flex flex-col h-full overflow-auto p-4 gap-4">

      {/* Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Enviar Documento</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Empresa</label>
            <select value={empresaId} onChange={e => setEmpresaId(e.target.value)}
              className="w-full border border-gray-300 rounded-md text-xs px-2 py-1.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400">
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)}
              className="w-full border border-gray-300 rounded-md text-xs px-2 py-1.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400">
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Competência</label>
            <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)}
              className="w-full border border-gray-300 rounded-md text-xs px-2 py-1.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Descrição (opcional)</label>
            <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Fatura maio/2026"
              className="w-full border border-gray-300 rounded-md text-xs px-2 py-1.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400" />
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            drag ? 'border-blue-400 bg-blue-50' : arquivo ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <input ref={fileRef} type="file" accept=".pdf,.xml,.png,.jpg" className="hidden"
            onChange={e => e.target.files?.[0] && setArquivo(e.target.files[0])} />
          {arquivo ? (
            <div className="text-xs text-green-700 font-medium">
              <FileText className="w-6 h-6 mx-auto mb-1 text-green-500" />
              {arquivo.name} ({fmtBytes(arquivo.size)})
            </div>
          ) : (
            <div className="text-xs text-gray-400">
              <Upload className="w-6 h-6 mx-auto mb-1 text-gray-300" />
              Arraste o arquivo aqui ou clique para selecionar<br />
              <span className="text-[10px]">PDF, XML, PNG, JPG — até 50MB</span>
            </div>
          )}
        </div>

        <button onClick={fazer_upload} disabled={!arquivo || !empresaId || uploading}
          className="mt-3 w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
          {uploading ? 'Enviando...' : 'Enviar Documento'}
        </button>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Documentos Enviados</h2>
          <div className="flex items-center gap-2">
            <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}
              className="border border-gray-200 rounded-md text-[11px] px-2 py-1 focus:outline-none">
              <option value="">Todas as empresas</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              className="border border-gray-200 rounded-md text-[11px] px-2 py-1 focus:outline-none">
              <option value="">Todos os tipos</option>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? <div className="p-8"><Spinner /></div> : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-[11px] border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['Tipo','Nome','Empresa','Competência','Descrição','Tamanho','Ações'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">Nenhum documento encontrado</td></tr>
                ) : lista.map((d, i) => {
                  const t = TIPO_MAP[d.tipo] ?? { label: d.tipo, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={d.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.cls}`}>{t.label}</span>
                      </td>
                      <td className="py-2 px-3 text-gray-700 max-w-[200px] truncate">{d.nome}</td>
                      <td className="py-2 px-3 text-gray-600">{d.empresa?.nome ?? '—'}</td>
                      <td className="py-2 px-3 text-gray-600">{fmtCompetencia(d.competencia)}</td>
                      <td className="py-2 px-3 text-gray-400 max-w-[160px] truncate">{d.descricao ?? '—'}</td>
                      <td className="py-2 px-3 text-gray-400">{fmtBytes(d.tamanhoBytes)}</td>
                      <td className="py-2 px-3">
                        <button onClick={() => excluir(d.id)}
                          className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

