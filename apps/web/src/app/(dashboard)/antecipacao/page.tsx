'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Calculator, TrendingDown, Clock, CheckCircle, DollarSign, ArrowRight, Info } from 'lucide-react'

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const ADQUIRENTES = ['CIELO', 'REDE', 'STONE', 'GETNET', 'PAGSEGURO', 'SAFRA', 'BIN', 'ALELO', 'PLUXEE']

const STATUS_COR: Record<string, string> = {
  SIMULACAO: 'bg-gray-100 text-gray-600',
  SOLICITADA: 'bg-blue-100 text-blue-700',
  APROVADA: 'bg-green-100 text-green-700',
  LIQUIDADA: 'bg-emerald-100 text-emerald-700',
  CANCELADA: 'bg-red-100 text-red-600',
}

export default function AntecipacaoPage() {
  const [futuros, setFuturos] = useState<any>(null)
  const [simulacao, setSimulacao] = useState<any>(null)
  const [historico, setHistorico] = useState<any[]>([])
  const [simulando, setSimulando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Formulário simulador
  const [taxa, setTaxa] = useState('0.12')   // % ao dia
  const [horizonte, setHorizonte] = useState('90')
  const [adqFiltro, setAdqFiltro] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/antecipacao/repasses-futuros?horizonte=90'),
      api.get('/antecipacao'),
    ]).then(([r1, r2]) => {
      setFuturos(r1.data)
      setHistorico(r2.data)
    })
  }, [])

  async function simular() {
    setSimulando(true)
    try {
      const r = await api.post('/antecipacao/simular', {
        taxaDiaria: Number(taxa) / 100,
        horizonte: Number(horizonte),
        adquirente: adqFiltro || undefined,
      })
      setSimulacao(r.data)
    } finally { setSimulando(false) }
  }

  async function salvarAntecipacao() {
    if (!simulacao) return
    setSalvando(true)
    try {
      await api.post('/antecipacao', {
        valorBruto: simulacao.valorBrutoTotal,
        taxaAntecipacao: Number(taxa) / 100,
        custoTotal: simulacao.custoTotal,
        valorLiquido: simulacao.valorLiquidoTotal,
        diasAntecipados: Number(horizonte),
        adquirente: adqFiltro || undefined,
        status: 'SOLICITADA',
      })
      const r = await api.get('/antecipacao')
      setHistorico(r.data)
      setSimulacao(null)
    } finally { setSalvando(false) }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Antecipação de Recebíveis</h1>
        <p className="text-sm text-gray-500 mt-0.5">Simule o custo de antecipar seus recebimentos e registre solicitações</p>
      </div>

      {/* KPIs futuros */}
      {futuros && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">A Receber (90 dias)</p>
            <p className="text-3xl font-extrabold text-blue-700">{fmt(futuros.totalGeral)}</p>
            <p className="text-xs text-gray-400 mt-1">{futuros.qtdeTotal} repasses futuros</p>
          </div>
          {Object.entries(futuros.porAdquirente ?? {}).slice(0, 2).map(([adq, d]: any) => (
            <div key={adq} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{adq}</p>
              <p className="text-2xl font-extrabold text-gray-800">{fmt(d.total)}</p>
              <p className="text-xs text-gray-400 mt-1">{d.qtde} parcelas</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Simulador */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-blue-600" /> Simulador
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">Taxa de antecipação (% ao dia)</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="number" step="0.01" value={taxa} onChange={e => setTaxa(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900" />
                <span className="text-sm text-gray-400">% a.d.</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Ex: 0.12% ao dia = ~3.6% ao mês</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Horizonte de antecipação</label>
              <select value={horizonte} onChange={e => setHorizonte(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 mt-1">
                <option value="30">30 dias</option>
                <option value="60">60 dias</option>
                <option value="90">90 dias</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Adquirente (opcional)</label>
              <select value={adqFiltro} onChange={e => setAdqFiltro(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 mt-1">
                <option value="">Todos</option>
                {ADQUIRENTES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <button onClick={simular} disabled={simulando}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
            {simulando ? 'Calculando...' : 'Simular antecipação'}
          </button>

          {/* Resultado da simulação */}
          {simulacao && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-blue-800">Resultado da Simulação</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor a antecipar</span>
                  <span className="font-semibold text-gray-800">{fmt(simulacao.valorBrutoTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Custo total</span>
                  <span className="font-semibold text-red-700">- {fmt(simulacao.custoTotal)}</span>
                </div>
                <div className="flex justify-between border-t border-blue-200 pt-2">
                  <span className="font-bold text-gray-800">Valor líquido</span>
                  <span className="font-bold text-green-700 text-base">{fmt(simulacao.valorLiquidoTotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Percentual do custo</span>
                  <span>{simulacao.percentualCusto.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Parcelas antecipadas</span>
                  <span>{simulacao.qtde}</span>
                </div>
              </div>
              <button onClick={salvarAntecipacao} disabled={salvando}
                className="w-full py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Solicitar antecipação'}
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Como funciona a antecipação?</p>
                <p>Cada adquirente cobra uma taxa sobre o valor a receber proporcional aos dias antecipados. Quanto mais cedo você recebe, maior o desconto.</p>
                <p>Fórmula: <code className="bg-amber-100 px-1 rounded">Custo = Valor × Taxa/dia × Dias</code></p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">Taxas de referência</h3>
            <div className="space-y-2 text-xs">
              {[['Cielo', '0.08% – 0.15%'], ['Rede', '0.10% – 0.18%'], ['Stone', '0.07% – 0.14%'], ['GetNet', '0.09% – 0.16%']].map(([a, t]) => (
                <div key={a} className="flex justify-between">
                  <span className="text-gray-600">{a}</span>
                  <span className="font-medium text-gray-800">{t} ao dia</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">*Taxas de referência de mercado. Consulte sua adquirente.</p>
          </div>
        </div>
      </div>

      {/* Histórico */}
      {historico.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Histórico de Antecipações</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-3 pl-5 text-left text-xs font-semibold text-gray-500 uppercase">Data</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Bruto</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Custo</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Líquido</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Taxa/dia</th>
                <th className="py-3 px-5 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historico.map((a: any) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="py-3 pl-5 text-gray-700">{new Date(a.criadoEm).toLocaleDateString('pt-BR')}</td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-800">{fmt(Number(a.valorBruto))}</td>
                  <td className="py-3 px-4 text-right text-red-600">- {fmt(Number(a.custoTotal))}</td>
                  <td className="py-3 px-4 text-right font-semibold text-green-700">{fmt(Number(a.valorLiquido))}</td>
                  <td className="py-3 px-4 text-right text-gray-500">{(Number(a.taxaAntecipacao) * 100).toFixed(3)}%</td>
                  <td className="py-3 px-5">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COR[a.status] ?? 'bg-gray-100'}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


