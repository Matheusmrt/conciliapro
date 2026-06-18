'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react'

import { api } from '@/lib/api'

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtMes(ym: string) {
  const [y, m] = ym.split('-')
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${nomes[parseInt(m) - 1]} ${y}`
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const MODALIDADES: Record<string, string> = {
  CREDITO_A_VISTA: 'Créd. Vista',
  CREDITO_PARCELADO: 'Créd. Parc.',
  DEBITO: 'Débito',
  PIX: 'PIX',
  VOUCHER: 'Voucher',
}

type Modalidade = { modalidade: string; totalBruto: number; totalLiquido: number; qtde: number }
type Adquirente = { adquirente: string; totalBruto: number; totalLiquido: number; qtde: number; modalidades: Modalidade[] }
type Dia = { data: string; isPast: boolean; isToday: boolean; totalBruto: number; totalLiquido: number; qtde: number; adquirentes: Adquirente[] }
type Mes = { mes: string; totalBruto: number; totalLiquido: number; qtde: number }
type Resumo = { totalBruto: number; totalLiquido: number; qtde: number; meses: Mes[]; dias: Dia[] }

// Componente linha lateral (lista) de um dia com drill-down
function DiaDetalhe({ dia }: { dia: Dia }) {
  const [open, setOpen] = useState(false)

  const statusClass = dia.isToday
    ? 'border-blue-400 bg-blue-50'
    : dia.isPast
      ? 'border-gray-200 bg-gray-50 opacity-70'
      : 'border-gray-200 bg-white'

  const [dd, mm, yy] = [dia.data.slice(8, 10), dia.data.slice(5, 7), dia.data.slice(0, 4)]
  const ds = DIAS_SEMANA[new Date(dia.data + 'T12:00:00').getDay()]

  return (
    <div className={`border rounded-xl overflow-hidden ${statusClass}`}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRightIcon className="h-4 w-4 text-gray-400" />}
          <div>
            <span className="font-semibold text-sm text-gray-900">{dd}/{mm}/{yy}</span>
            <span className="ml-2 text-xs text-gray-400">{ds}</span>
            {dia.isToday && <span className="ml-2 text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">Hoje</span>}
          </div>
          <span className="text-xs text-gray-400">{dia.qtde} lanç.</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">{fmt(dia.totalLiquido)}</p>
          <p className="text-xs text-gray-400">bruto {fmt(dia.totalBruto)}</p>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-3 pt-2 space-y-3">
          {dia.adquirentes.map(adq => (
            <div key={adq.adquirente}>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-semibold text-gray-600">{adq.adquirente}</span>
                <div className="text-right">
                  <span className="text-xs font-semibold text-gray-800">{fmt(adq.totalLiquido)}</span>
                  <span className="text-xs text-gray-400 ml-2">({adq.qtde})</span>
                </div>
              </div>
              <div className="ml-3 space-y-0.5">
                {adq.modalidades.map(m => (
                  <div key={m.modalidade} className="flex items-center justify-between py-0.5">
                    <span className="text-xs text-gray-400">{MODALIDADES[m.modalidade] ?? m.modalidade}</span>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">{fmt(m.totalLiquido)}</span>
                      <span className="text-xs text-gray-300 ml-1">× {m.qtde}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Calendário visual do mês
function CalendarioMes({ ano, mes, diasMap }: { ano: number; mes: number; diasMap: Map<string, Dia> }) {
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const ultimoDia = new Date(ano, mes + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < primeiroDia; i++) cells.push(null)
  for (let d = 1; d <= ultimoDia; d++) cells.push(d)

  const hoje = new Date()
  const hojeStr = hoje.toISOString().slice(0, 10)

  return (
    <div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden text-xs">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="bg-gray-50 text-center py-2 font-semibold text-gray-400">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="bg-white min-h-[72px]" />
          const dataKey = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dia = diasMap.get(dataKey)
          const isToday = dataKey === hojeStr
          const isPast = dataKey < hojeStr

          return (
            <div
              key={i}
              className={`bg-white min-h-[72px] p-1.5 text-right
                ${isToday ? 'ring-2 ring-inset ring-blue-400' : ''}
                ${isPast && !isToday ? 'opacity-60' : ''}
              `}
            >
              <span className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>{day}</span>
              {dia && (
                <div className="mt-1 text-left space-y-0.5">
                  <div className="text-[10px] font-bold text-gray-700 leading-tight">{fmt(dia.totalLiquido)}</div>
                  {dia.adquirentes.slice(0, 2).map(a => (
                    <div key={a.adquirente} className="text-[9px] text-gray-400 leading-tight truncate">{a.adquirente}</div>
                  ))}
                  {dia.adquirentes.length > 2 && (
                    <div className="text-[9px] text-gray-300">+{dia.adquirentes.length - 2}</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function fmtK(centavos: number) {
  const v = centavos / 100
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}K`
  return fmt(centavos)
}

function Sparkline({ serie }: { serie: { acumulado: number }[] }) {
  if (serie.length < 2) return null
  const W = 200, H = 36
  const max = Math.max(...serie.map(s => s.acumulado), 1)
  const pts = serie.map((s, i) => ({
    x: (i / (serie.length - 1)) * W,
    y: H - (s.acumulado / max) * H,
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${W},${H} L0,${H}Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-9 shrink-0">
      <path d={area} fill="#dbeafe" opacity={0.5} />
      <path d={line} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
    </svg>
  )
}

function GraficoPrevisao({ serie, kpis }: {
  serie: { data: string; diario: number; acumulado: number }[]
  kpis: { horizonte: number; total: number }[]
}) {
  return (
    <div className="flex items-center gap-0 divide-x divide-gray-100">
      {kpis.map((k, i) => (
        <div key={k.horizonte} className={`flex-1 flex items-center gap-3 px-4 py-1 ${i === 0 ? '' : ''}`}>
          <div className="flex-1 min-w-0">
            <Sparkline serie={serie.slice(0, Math.round((i + 1) * serie.length / 3))} />
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-gray-400 leading-tight">{k.horizonte} dias</p>
            <p className="text-sm font-extrabold text-blue-700 leading-tight">{fmtK(k.total)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AgendaPage() {
  const [dados, setDados] = useState<Resumo | null>(null)
  const [previsao, setPrevisao] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [horizonte, setHorizonte] = useState(90)
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [filtroAdq, setFiltroAdq] = useState('')

  async function carregar() {
    setLoading(true)
    try {
      const [y, m] = mesSelecionado.split('-').map(Number)
      const inicio = `${y}-${String(m).padStart(2, '0')}-01`
      const fim = new Date(y, m, 0).toISOString().slice(0, 10)
      const params = new URLSearchParams({ dataInicio: inicio, dataFim: fim })
      if (filtroAdq) params.set('adquirente', filtroAdq)
      const [r1, r2] = await Promise.all([
        api.get(`/agenda?${params}`),
        api.get(`/agenda/previsao?horizonte=${horizonte}${filtroAdq ? `&adquirente=${filtroAdq}` : ''}`),
      ])
      setDados(r1.data)
      setPrevisao(r2.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [mesSelecionado, filtroAdq, horizonte])

  const [anoSel, mesSel] = mesSelecionado.split('-').map(Number)
  const diasNoMes = dados?.dias ?? []
  const diasMap = new Map(diasNoMes.map(d => [d.data, d]))

  // Adquirentes distintos dos dados
  const adquirentesDistintos = [...new Set(diasNoMes.flatMap(d => d.adquirentes.map(a => a.adquirente)))].sort()

  // Dias do mês selecionado para a lista lateral
  const diasDoMes = diasNoMes.filter(d => d.data.startsWith(mesSelecionado))

  // Totais do mês
  const totalMesBruto = diasDoMes.reduce((s, d) => s + d.totalBruto, 0)
  const totalMesLiq = diasDoMes.reduce((s, d) => s + d.totalLiquido, 0)

  function navMes(delta: number) {
    const [y, m] = mesSelecionado.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMesSelecionado(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar compacta */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-4">
        {/* Navegação mês */}
        <div className="flex items-center gap-2">
          <button onClick={() => navMes(-1)} className="p-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50">
            <ChevronLeft className="h-3.5 w-3.5 text-gray-500" />
          </button>
          <div className="text-center min-w-[90px]">
            <p className="text-sm font-bold text-gray-900">{fmtMes(mesSelecionado)}</p>
            {!loading && <p className="text-[10px] text-gray-400 leading-tight">{fmt(totalMesLiq)} líquido</p>}
          </div>
          <button onClick={() => navMes(1)} className="p-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50">
            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
          </button>
        </div>

        {/* KPIs inline */}
        {!loading && dados && (
          <div className="flex gap-3">
            {[
              { label: 'Bruto do mês', val: fmt(totalMesBruto) },
              { label: 'Líquido do mês', val: fmt(totalMesLiq) },
              { label: 'Dias c/ receb.', val: String(diasDoMes.length) },
            ].map(k => (
              <div key={k.label} className="border border-gray-100 rounded-lg px-3 py-1.5 bg-gray-50">
                <p className="text-[10px] text-gray-400 leading-tight">{k.label}</p>
                <p className="text-xs font-bold text-gray-800 leading-tight">{k.val}</p>
              </div>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {adquirentesDistintos.length > 0 && (
            <select value={filtroAdq} onChange={e => setFiltroAdq(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1.5 text-xs bg-white text-gray-900">
              <option value="">Todos adquirentes</option>
              {adquirentesDistintos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Previsão de caixa — faixa compacta */}
      {!loading && previsao && (previsao.kpis ?? []).length > 0 && (
        <div className="shrink-0 bg-white border-b border-gray-200">
          <div className="px-5 pt-2 pb-0 flex items-center gap-2">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Previsão de Caixa</p>
            <p className="text-[10px] text-gray-300">— recebimentos futuros acumulados</p>
          </div>
          <GraficoPrevisao serie={previsao.serie ?? []} kpis={previsao.kpis ?? []} />
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Carregando...</div>
      ) : (
        <div className="flex-1 overflow-hidden grid grid-cols-[1fr_300px]">
          {/* Calendário */}
          <div className="overflow-auto p-4 border-r border-gray-200 bg-white">
            <CalendarioMes ano={anoSel} mes={mesSel - 1} diasMap={diasMap} />
          </div>

          {/* Lista lateral com drill-down */}
          <div className="overflow-y-auto p-3 space-y-1.5 bg-gray-50">
            {diasDoMes.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 text-sm">Nenhum recebimento neste mês</p>
                <p className="text-gray-400 text-xs mt-1">Importe arquivos EDI para visualizar</p>
              </div>
            ) : (
              diasDoMes.map(d => <DiaDetalhe key={d.data} dia={d} />)
            )}
          </div>
        </div>
      )}
    </div>
  )
}

