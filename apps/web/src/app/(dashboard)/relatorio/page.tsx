'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { Printer, Download, Mail, CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react'

function fmt(centavos: number) {
  return (Number(centavos) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function RelatorioPage() {
  const [resumo, setResumo] = useState<any>(null)
  const [evolucao, setEvolucao] = useState<any[]>([])
  const [divergencias, setDivergencias] = useState<any[]>([])
  const [empresa, setEmpresa] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const [emailPara, setEmailPara] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/resumo'),
      api.get('/dashboard/evolucao'),
      api.get('/conciliacao?status=DIVERGENCIA_VALOR&limit=20'),
      api.get('/empresa/me'),
    ]).then(([r1, r2, r3, r4]) => {
      setResumo(r1.data)
      setEvolucao(r2.data)
      setDivergencias(r3.data?.dados ?? [])
      setEmpresa(r4.data)
    }).finally(() => setCarregando(false))
  }, [])

  function imprimir() {
    window.print()
  }

  async function enviarEmail() {
    if (!emailPara) return
    setEnviandoEmail(true)
    setEmailStatus(null)
    try {
      const r = await api.post('/notificacoes/relatorio-diario', { para: emailPara })
      if (r.data.enviado) {
        setEmailStatus(`✅ Enviado para ${r.data.destino}`)
      } else {
        setEmailStatus(`⚠ ${r.data.motivo ?? 'Configure o SMTP nas variáveis de ambiente da API'}`)
      }
    } catch {
      setEmailStatus('Erro ao enviar. Verifique as configurações SMTP.')
    } finally {
      setEnviandoEmail(false)
    }
  }

  const taxa = Number(resumo?.taxaConciliacao ?? 0)
  const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <>
      {/* Barra de ações — não aparece no print */}
      <div className="print:hidden flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Relatório Gerencial</h1>
          <p className="text-sm text-gray-500">{dataHoje}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            <Mail className="h-4 w-4" /> Enviar por e-mail
          </button>
          <button
            onClick={imprimir}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700"
          >
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Conteúdo do relatório */}
      <div ref={printRef} className="p-6 space-y-6 max-w-4xl print:p-0 print:max-w-none">

        {/* Cabeçalho do relatório */}
        <div className="bg-blue-700 text-white rounded-2xl p-6 print:rounded-none print:bg-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold">ConciliaPro</h2>
              <p className="text-blue-200 text-sm mt-0.5">{empresa?.nome}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-xs">Relatório Gerencial</p>
              <p className="text-white font-semibold">{dataHoje}</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-center">
            <div className={`text-4xl font-extrabold ${taxa >= 95 ? 'text-green-600' : taxa >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
              {taxa}%
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">Taxa de Conciliação</div>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${taxa >= 95 ? 'bg-green-500' : taxa >= 80 ? 'bg-yellow-400' : 'bg-red-500'}`}
                style={{ width: `${taxa}%` }} />
            </div>
            <div className="text-xs text-gray-500 mt-1">{resumo?.conciliadas} de {resumo?.totalVendas} vendas</div>
          </div>

          <div className={`border rounded-2xl p-5 shadow-sm text-center ${(resumo?.divergenciasAbertas ?? 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <div className={`text-4xl font-extrabold ${(resumo?.divergenciasAbertas ?? 0) > 0 ? 'text-red-600' : 'text-gray-300'}`}>
              {resumo?.divergenciasAbertas ?? 0}
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">Divergências em Aberto</div>
            <div className="text-sm font-bold text-red-700 mt-1">{fmt(Number(resumo?.valorEmDivergencia ?? 0))}</div>
          </div>

          <div className={`border rounded-2xl p-5 shadow-sm text-center ${(resumo?.semRepasse ?? 0) > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
            <div className={`text-4xl font-extrabold ${(resumo?.semRepasse ?? 0) > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
              {resumo?.semRepasse ?? 0}
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">Sem Repasse</div>
            <div className="text-xs text-gray-500 mt-1">vendas sem repasse</div>
          </div>
        </div>

        {/* Evolução mensal */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Evolução Mensal
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-3 pl-5 text-left text-xs font-semibold text-gray-500 uppercase">Mês</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Bruto</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Líquido</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Comissão</th>
                <th className="py-3 px-5 text-right text-xs font-semibold text-gray-500 uppercase">Diverg.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {evolucao.map((d, i) => (
                <tr key={d.mes} className={i === evolucao.length - 1 ? 'bg-blue-50/40' : ''}>
                  <td className="py-2.5 pl-5 font-semibold text-gray-800">{d.mes}</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-gray-800">{fmt(d.bruto)}</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-green-700">{fmt(d.liquido)}</td>
                  <td className="py-2.5 px-4 text-right text-gray-600">{fmt(d.bruto - d.liquido)}</td>
                  <td className="py-2.5 px-5 text-right">
                    {d.divergencias > 0
                      ? <span className="text-red-600 font-bold">{d.divergencias}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
              {/* Total */}
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                <td className="py-3 pl-5 text-gray-900">Total</td>
                <td className="py-3 px-4 text-right text-gray-900">{fmt(evolucao.reduce((s, d) => s + d.bruto, 0))}</td>
                <td className="py-3 px-4 text-right text-green-800">{fmt(evolucao.reduce((s, d) => s + d.liquido, 0))}</td>
                <td className="py-3 px-4 text-right text-gray-700">{fmt(evolucao.reduce((s, d) => s + (d.bruto - d.liquido), 0))}</td>
                <td className="py-3 px-5 text-right text-red-600">{evolucao.reduce((s, d) => s + d.divergencias, 0) || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Divergências abertas */}
        {divergencias.length > 0 && (
          <div className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-red-100 bg-red-50">
              <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Divergências em Aberto ({divergencias.length})
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-3 pl-5 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Adquirente</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Criada em</th>
                  <th className="py-3 px-5 text-right text-xs font-semibold text-gray-500 uppercase">Impacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {divergencias.map((d: any) => (
                  <tr key={d.id}>
                    <td className="py-2.5 pl-5 text-gray-800 font-medium text-xs">{d.tipo}</td>
                    <td className="py-2.5 px-4 text-gray-600">{d.adquirente ?? '—'}</td>
                    <td className="py-2.5 px-4 text-gray-600">
                      {d.criadoEm ? new Date(d.criadoEm).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="py-2.5 px-5 text-right font-semibold text-red-600">
                      {fmt(Number(d.valorImpacto ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé */}
        <div className="text-center text-xs text-gray-400 pt-2 print:mt-8">
          Gerado em {new Date().toLocaleString('pt-BR')} · ConciliaPro
        </div>
      </div>

      {/* Modal de e-mail */}
      {showEmailModal && (
        <div className="print:hidden fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Enviar relatório por e-mail</h2>
            <div>
              <label className="text-xs text-gray-500">Endereço de e-mail</label>
              <input
                type="email"
                value={emailPara}
                onChange={e => setEmailPara(e.target.value)}
                placeholder="destino@empresa.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1"
              />
            </div>
            {emailStatus && (
              <p className={`text-sm ${emailStatus.startsWith('✅') ? 'text-green-700' : 'text-orange-600'}`}>
                {emailStatus}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl">
                Fechar
              </button>
              <button
                onClick={enviarEmail}
                disabled={enviandoEmail || !emailPara}
                className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                <Mail className="h-3.5 w-3.5" />
                {enviandoEmail ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS print */}
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          nav, aside, .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  )
}
