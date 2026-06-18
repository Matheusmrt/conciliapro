'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle, XCircle, Clock, Trash2, Play } from 'lucide-react'

import { api } from '@/lib/api'

type Job = {
  id: string
  arquivo?: string
  adquirente?: string
  estabelecimentoId?: string
  status: 'completed' | 'failed' | 'active'
  finishedOn?: number
  resultado?: { importadas: number; erros: number } | { conciliadas: number; divergentes: number }
  erro?: string
}

type Status = {
  coleta: { waiting: number; active: number; completed: number; failed: number; ultimos: Job[] }
  conciliacao: { waiting: number; active: number; completed: number; failed: number; ultimos: Job[] }
}

function JobRow({ job }: { job: Job }) {
  const icons = {
    completed: <CheckCircle className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
    active: <Clock className="h-4 w-4 text-blue-500 animate-spin" />,
  }

  return (
    <tr className="border-b border-gray-100">
      <td className="py-2.5 pl-4 pr-2 text-xs text-gray-400 font-mono">{job.id?.slice(-8)}</td>
      <td className="py-2.5 px-2">{icons[job.status]}</td>
      <td className="py-2.5 px-2">
        <p className="text-sm text-gray-800">{job.arquivo ?? job.estabelecimentoId ?? '—'}</p>
        {job.adquirente && <p className="text-xs text-gray-400">{job.adquirente}</p>}
      </td>
      <td className="py-2.5 px-2 text-xs text-gray-500">
        {job.finishedOn ? new Date(job.finishedOn).toLocaleString('pt-BR') : 'Em andamento'}
      </td>
      <td className="py-2.5 px-2 text-xs">
        {job.status === 'completed' && job.resultado && (
          <span className="text-green-600">
            {'importadas' in job.resultado
              ? `${job.resultado.importadas} importadas`
              : `${job.resultado.conciliadas} conciliadas`}
          </span>
        )}
        {job.status === 'failed' && (
          <span className="text-red-500 max-w-[200px] truncate block" title={job.erro}>{job.erro}</span>
        )}
      </td>
    </tr>
  )
}

function ContadorBadge({ n, cor }: { n: number; cor: string }) {
  if (n === 0) return null
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cor}`}>{n}</span>
}

export default function JobsPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [limpando, setLimpando] = useState(false)

  async function carregar() {
    setLoading(true)
    try {
      const r = await api.get('/jobs/status')
      setStatus(r.data)
    } finally { setLoading(false) }
  }

  async function limpar() {
    setLimpando(true)
    await api.delete('/jobs/limpar')
    await carregar()
    setLimpando(false)
  }

  useEffect(() => { carregar() }, [])

  // Auto-refresh a cada 10s se tiver jobs ativos
  useEffect(() => {
    const temAtivos = (status?.coleta.active ?? 0) + (status?.conciliacao.active ?? 0) > 0
    if (!temAtivos) return
    const t = setInterval(carregar, 10000)
    return () => clearInterval(t)
  }, [status])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Monitor de Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Status das filas de processamento em background</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={limpar}
            disabled={limpando}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Trash2 className="h-4 w-4" /> {limpando ? 'Limpando...' : 'Limpar histórico'}
          </button>
          <button
            onClick={carregar}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </div>

      {/* Painel de status das filas */}
      {status && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { nome: 'Coleta de Arquivos', dados: status.coleta, cor: 'blue' },
            { nome: 'Conciliação', dados: status.conciliacao, cor: 'green' },
          ].map(({ nome, dados, cor }) => (
            <div key={nome} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-800">{nome}</h2>
                <div className="flex gap-2">
                  <ContadorBadge n={dados.active} cor="bg-blue-100 text-blue-700" />
                  <ContadorBadge n={dados.waiting} cor="bg-yellow-100 text-yellow-700" />
                  <ContadorBadge n={dados.failed} cor="bg-red-100 text-red-700" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: 'Aguardando', n: dados.waiting, c: 'text-yellow-600' },
                  { label: 'Executando', n: dados.active, c: 'text-blue-600' },
                  { label: 'Concluídos', n: dados.completed, c: 'text-green-600' },
                  { label: 'Com Erro', n: dados.failed, c: 'text-red-600' },
                ].map(({ label, n, c }) => (
                  <div key={label} className="text-center">
                    <p className={`text-xl font-bold ${c}`}>{n}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>

              {/* Últimos jobs */}
              {dados.ultimos.length > 0 && (
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="py-2 pl-4 text-xs font-medium text-gray-400">ID</th>
                        <th className="py-2 px-2 text-xs font-medium text-gray-400">St</th>
                        <th className="py-2 px-2 text-xs font-medium text-gray-400">Arquivo / Estab.</th>
                        <th className="py-2 px-2 text-xs font-medium text-gray-400">Concluído</th>
                        <th className="py-2 px-2 text-xs font-medium text-gray-400">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.ultimos.map(j => <JobRow key={j.id} job={j} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Informações sobre o coletador automático */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Coletador Automático (SFTP)</h3>
        <p className="text-sm text-blue-700 mb-3">
          Os workers estão preparados para coletar arquivos EDI via SFTP automaticamente quando configurados.
          O servidor de workers roda em paralelo com a API.
        </p>
        <div className="grid grid-cols-2 gap-4 text-xs text-blue-600">
          <div>
            <p className="font-semibold mb-1">Para iniciar os workers:</p>
            <code className="bg-blue-100 px-2 py-1 rounded block">pnpm --filter @conciliacao/api workers</code>
          </div>
          <div>
            <p className="font-semibold mb-1">Arquivos importados são enfileirados automaticamente após upload:</p>
            <code className="bg-blue-100 px-2 py-1 rounded block">POST /importacao/upload → Queue: coleta-edi</code>
          </div>
        </div>
      </div>
    </div>
  )
}
