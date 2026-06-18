'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { AlertTriangle, CheckCircle2, XCircle, TrendingUp, TrendingDown, ArrowUpRight, Upload, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Resumo {
  totalVendas: number; conciliadas: number; divergentes: number
  semRepasse: number; divergenciasAbertas: number
  valorEmDivergencia: number; taxaConciliacao: string
}
interface MesEvolucao { mes: string; bruto: number; liquido: number; divergencias: number }

const fmt = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtK = (c: number) => {
  const v = c / 100
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}K`
  return `R$${v.toFixed(0)}`
}

function BarChart({ dados }: { dados: MesEvolucao[] }) {
  const [hov, setHov] = useState<number | null>(null)
  const max = Math.max(...dados.map(d => d.bruto), 1)
  return (
    <div className="flex items-end gap-1.5 h-16">
      {dados.map((d, i) => {
        const h = Math.max((d.bruto / max) * 100, 3)
        const lh = d.liquido > 0 ? (d.liquido / max) * 100 : 0
        const cur = i === dados.length - 1
        return (
          <div key={d.mes} className="flex-1 flex flex-col items-center gap-1 relative cursor-default group"
            onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
            {hov === i && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px]
                px-2.5 py-1.5 rounded-lg whitespace-nowrap z-20 pointer-events-none shadow-lg">
                <p className="font-bold">{d.mes}</p>
                <p className="text-gray-400">{fmtK(d.bruto)}</p>
              </div>
            )}
            <div className="w-full flex items-end gap-px h-12">
              <div className="flex-1 rounded-t-sm transition-all duration-300"
                style={{ height: `${h}%`, background: cur ? '#2563eb' : hov === i ? '#94a3b8' : '#e2e8f0' }} />
              {lh > 0 && (
                <div className="flex-1 rounded-t-sm transition-all duration-300"
                  style={{ height: `${lh}%`, background: cur ? '#1d4ed8' : '#cbd5e1' }} />
              )}
            </div>
            <span className={`text-[9px] font-medium ${cur ? 'text-blue-600' : 'text-gray-400'}`}>
              {d.mes.slice(0, 3)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 36, circ = 2 * Math.PI * r
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#f1f5f9" strokeWidth="7" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${(pct / 100) * circ} ${circ}`}
        strokeLinecap="round" transform="rotate(-90 44 44)" />
    </svg>
  )
}

export default function DashboardPage() {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [evolucao, setEvolucao] = useState<MesEvolucao[]>([])
  const [bandeiras, setBandeiras] = useState<any[]>([])
  const [modalidades, setModalidades] = useState<any[]>([])
  const [metricas, setMetricas] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/resumo'),
      api.get('/dashboard/evolucao'),
      api.get('/dashboard/bandeiras').catch(() => ({ data: [] })),
      api.get('/dashboard/modalidades').catch(() => ({ data: [] })),
      api.get('/dashboard/metricas').catch(() => ({ data: null })),
    ]).then(([r1, r2, r3, r4, r5]) => {
      setResumo(r1.data); setEvolucao(r2.data)
      setBandeiras(r3.data); setModalidades(r4.data); setMetricas(r5.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
    </div>
  )

  const taxa = Number(resumo?.taxaConciliacao ?? 0)
  const taxaColor = taxa >= 95 ? '#059669' : taxa >= 80 ? '#d97706' : '#dc2626'
  const mesAtual = evolucao[evolucao.length - 1]
  const mesAnterior = evolucao[evolucao.length - 2]
  const variacao = mesAnterior?.bruto > 0 ? ((mesAtual?.bruto - mesAnterior.bruto) / mesAnterior.bruto) * 100 : null
  const brutoMes = metricas?.totalMes ?? mesAtual?.bruto ?? 0
  const liqMes = metricas?.liquidoMes ?? mesAtual?.liquido ?? 0
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const BAND_COR: Record<string, string> = {
    VISA: '#2563eb', MASTERCARD: '#d97706', ELO: '#059669',
    AMEX: '#7c3aed', HIPERCARD: '#dc2626', CABAL: '#0891b2',
  }
  const MOD_COR: Record<string, string> = {
    DEBITO: '#059669', CREDITO_AVISTA: '#2563eb', CREDITO_PARCELADO: '#d97706',
  }
  const MOD_LABEL: Record<string, string> = {
    DEBITO: 'Débito', CREDITO_AVISTA: 'À Vista', CREDITO_PARCELADO: 'Parcelado',
  }

  return (
    <div className="min-h-full bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1440px] mx-auto">
          <div>
            <p className="text-xs text-gray-400 capitalize">{hoje}</p>
            <h1 className="text-lg font-black text-gray-900 tracking-tight">Visão Geral</h1>
          </div>
          <Link href="/importacao"
            className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors shadow-sm">
            <Upload className="h-4 w-4" /> Importar dados
          </Link>
        </div>
      </div>

      <div className="p-6 max-w-[1440px] mx-auto space-y-4">

        {/* ── Linha 1: KPIs ─────────────────────────────────── */}
        <div className="grid grid-cols-[240px_1fr_1fr_1fr] gap-4">

          {/* Taxa — destaque com anel */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Taxa de Conciliação</p>
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <Ring pct={taxa} color={taxaColor} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-black" style={{ color: taxaColor }}>{taxa}%</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block"
                  style={{ background: `${taxaColor}15`, color: taxaColor }}>
                  {taxa >= 95 ? '✓ Excelente' : taxa >= 80 ? '⚠ Regular' : '✗ Crítico'}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  <span className="font-bold text-gray-700">{resumo?.conciliadas?.toLocaleString('pt-BR')}</span>
                  <span className="text-gray-300"> / </span>
                  <span>{resumo?.totalVendas?.toLocaleString('pt-BR')} vendas</span>
                </p>
              </div>
            </div>
          </div>

          {/* Faturamento */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Faturamento Bruto</p>
              {variacao !== null && (
                <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full
                  ${variacao >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {variacao >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {Math.abs(variacao).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-black text-gray-900 tabular-nums tracking-tight">{fmt(brutoMes)}</p>
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-400">Líquido</p>
                <p className="font-bold text-emerald-600 mt-0.5">{fmt(liqMes)}</p>
              </div>
              {metricas && (
                <div>
                  <p className="text-gray-400">Comissão</p>
                  <p className="font-semibold text-gray-600 mt-0.5">{fmt(metricas.comissaoMes)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Divergências */}
          <Link href="/divergencias">
            <div className={`rounded-xl border shadow-sm p-5 h-full transition-shadow hover:shadow-md cursor-pointer
              ${(resumo?.divergenciasAbertas ?? 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Em Divergência</p>
                <AlertTriangle className={`h-4 w-4 ${(resumo?.divergenciasAbertas ?? 0) > 0 ? 'text-red-400' : 'text-gray-200'}`} />
              </div>
              <p className={`text-2xl font-black tabular-nums tracking-tight
                ${(resumo?.divergenciasAbertas ?? 0) > 0 ? 'text-red-600' : 'text-gray-200'}`}>
                {fmt(Number(resumo?.valorEmDivergencia ?? 0))}
              </p>
              <div className="mt-3 pt-3 border-t border-red-100 flex items-center justify-between text-xs">
                <span className={`font-bold ${(resumo?.divergenciasAbertas ?? 0) > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                  {resumo?.divergenciasAbertas ?? 0} abertas
                </span>
                {(resumo?.divergenciasAbertas ?? 0) > 0 && (
                  <span className="flex items-center gap-0.5 text-red-500 font-semibold">
                    Resolver <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            </div>
          </Link>

          {/* Sem repasse + Total */}
          <div className="flex flex-col gap-3">
            <div className={`rounded-xl border shadow-sm px-4 py-3 flex-1
              ${(resumo?.semRepasse ?? 0) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sem Repasse</p>
                <XCircle className={`h-3.5 w-3.5 ${(resumo?.semRepasse ?? 0) > 0 ? 'text-amber-400' : 'text-gray-200'}`} />
              </div>
              <p className={`text-2xl font-black mt-1 ${(resumo?.semRepasse ?? 0) > 0 ? 'text-amber-600' : 'text-gray-200'}`}>
                {resumo?.semRepasse ?? 0}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Vendas</p>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {resumo?.totalVendas?.toLocaleString('pt-BR') ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* ── Linha 2: Gráfico + Breakdowns ─────────────────── */}
        <div className="grid grid-cols-[1fr_180px_180px] gap-4">

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-gray-800">Evolução de Recebimentos</p>
                <p className="text-xs text-gray-400 mt-0.5">Bruto vs líquido · últimos meses</p>
              </div>
              <Link href="/fluxo-caixa"
                className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline">
                Ver fluxo <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <BarChart dados={evolucao} />
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 rounded-sm bg-gray-200" />
                <span className="text-[10px] text-gray-400">Meses anteriores</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 rounded-sm bg-blue-600" />
                <span className="text-[10px] text-gray-400">Mês atual</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-700 mb-3">Por Bandeira</p>
            {bandeiras.length > 0 ? (
              <div className="space-y-2.5">
                {bandeiras.slice(0, 5).map(b => (
                  <div key={b.bandeira}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: BAND_COR[b.bandeira] ?? '#94a3b8' }} />
                        <span className="text-[11px] text-gray-600 font-medium">{b.bandeira}</span>
                      </div>
                      <span className="text-[11px] font-bold tabular-nums text-gray-500">{b.percentual}%</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${b.percentual}%`, background: BAND_COR[b.bandeira] ?? '#94a3b8' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-300 text-center py-6">Sem dados</p>}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-700 mb-3">Por Modalidade</p>
            {modalidades.length > 0 ? (
              <div className="space-y-2.5">
                {modalidades.slice(0, 5).map(m => (
                  <div key={m.modalidade}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: MOD_COR[m.modalidade] ?? '#94a3b8' }} />
                        <span className="text-[11px] text-gray-600 font-medium">{MOD_LABEL[m.modalidade] ?? m.modalidade}</span>
                      </div>
                      <span className="text-[11px] font-bold tabular-nums text-gray-500">{m.percentual}%</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${m.percentual}%`, background: MOD_COR[m.modalidade] ?? '#94a3b8' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-300 text-center py-6">Sem dados</p>}
          </div>
        </div>

        {/* ── Tabela mensal ──────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-800">Histórico Mensal</p>
            <Link href="/relatorio" className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline">
              Relatório completo <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Mês', 'Bruto', 'Líquido', 'Comissão', 'Divergências'].map((h, i) => (
                  <th key={h} className={`py-2.5 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest
                    ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {evolucao.map((d, i) => {
                const comissao = d.bruto - d.liquido
                const isAtual = i === evolucao.length - 1
                return (
                  <tr key={d.mes} className={`text-xs transition-colors hover:bg-gray-50 ${isAtual ? 'bg-blue-50/50' : ''}`}>
                    <td className="py-3 pl-5 pr-2">
                      <span className={`font-bold ${isAtual ? 'text-blue-700' : 'text-gray-700'}`}>{d.mes}</span>
                      {isAtual && <span className="ml-2 text-[9px] font-bold text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded-full">atual</span>}
                    </td>
                    <td className="py-3 px-5 text-right font-semibold tabular-nums text-gray-800">
                      {d.bruto > 0 ? fmt(d.bruto) : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="py-3 px-5 text-right font-semibold tabular-nums text-emerald-600">
                      {d.liquido > 0 ? fmt(d.liquido) : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="py-3 px-5 text-right tabular-nums text-gray-500">
                      {comissao > 0 ? fmt(comissao) : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="py-3 pr-5 text-right">
                      {d.divergencias > 0
                        ? <span className="inline-flex items-center gap-1 text-red-500 font-bold"><AlertTriangle className="h-3 w-3" />{d.divergencias}</span>
                        : <span className="text-gray-200">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
