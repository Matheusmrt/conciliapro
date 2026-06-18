'use client'

import { Search, FileSpreadsheet, ChevronDown, ChevronRight } from 'lucide-react'
import { ReactNode, useState } from 'react'

// ── Cabeçalho de tabela ─────────────────────────────────────────────────────
export function THead({ cols }: { cols: { label: string; right?: boolean; className?: string }[] }) {
  return (
    <thead className="sticky top-0 z-10">
      <tr className="bg-gray-50 border-b border-gray-200 text-[11px]">
        {cols.map((c, i) => (
          <th key={i} className={`py-2.5 px-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap
            ${c.right ? 'text-right' : 'text-left'} ${c.className ?? ''}`}>
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
  )
}

// ── Linha de totais ─────────────────────────────────────────────────────────
export function TotalRow({ cells }: { cells: (string | ReactNode)[] }) {
  return (
    <tfoot>
      <tr className="bg-gray-50 border-t-2 border-gray-200 text-[11px]">
        {cells.map((c, i) => (
          <td key={i} className={`py-2.5 px-3 font-bold text-gray-700 ${i > 0 ? 'text-right' : ''}`}>{c}</td>
        ))}
      </tr>
    </tfoot>
  )
}

// ── Painel de filtros ───────────────────────────────────────────────────────
export function FilterPanel({ children, onSearch, loading, count }: {
  children: ReactNode
  onSearch: () => void
  loading: boolean
  count?: number | null
}) {
  return (
    <div className="bg-white border-b border-gray-200 px-5 py-3.5 space-y-3 shrink-0 shadow-sm">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parâmetros da consulta</p>
      <div className="space-y-2">{children}</div>
      <div className="flex items-center gap-3 pt-0.5">
        <button onClick={onSearch} disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors shadow-sm">
          <Search className="h-3.5 w-3.5" />
          {loading ? 'Pesquisando...' : 'Pesquisar'}
        </button>
        {count != null && (
          <span className="text-xs text-gray-400">
            <span className="font-semibold text-gray-700">{count.toLocaleString('pt-BR')}</span> registros
          </span>
        )}
      </div>
    </div>
  )
}

// ── Abas ────────────────────────────────────────────────────────────────────
export function TabBar({ tabs, active, onChange, onExport }: {
  tabs: { label: string; count?: number }[]
  active: string
  onChange: (v: string) => void
  onExport?: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 bg-white border-b border-gray-200 shrink-0">
      <div className="flex gap-0 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.label} onClick={() => onChange(t.label)}
            className={`text-[11px] font-semibold px-4 py-2.5 border-b-2 whitespace-nowrap transition-all ${
              active === t.label
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
            {t.count != null && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                active === t.label ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>
      {onExport && (
        <button onClick={onExport}
          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Exportar CSV
        </button>
      )}
    </div>
  )
}

// ── Estado vazio ────────────────────────────────────────────────────────────
export function EmptySearch({ message }: { message?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-center py-16">
      <div>
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Search className="h-5 w-5 text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-400">{message ?? 'Configure os parâmetros e clique em Pesquisar'}</p>
        <p className="text-xs text-gray-300 mt-1">Os resultados aparecerão aqui</p>
      </div>
    </div>
  )
}

// ── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex-1 flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
    </div>
  )
}

// ── Linha expansível ────────────────────────────────────────────────────────
export function ExpandRow({ label, level = 0, bold = false, children, cells }: {
  label: ReactNode
  level?: number
  bold?: boolean
  children?: ReactNode
  cells: ReactNode[]
}) {
  const [open, setOpen] = useState(false)
  const padLeft = [12, 28, 44, 60][level] ?? 12
  const rowBg = level === 0
    ? 'bg-gray-50/80 hover:bg-gray-100/80'
    : level === 1
    ? 'bg-blue-50/20 hover:bg-blue-50/40'
    : 'bg-white hover:bg-gray-50'
  return (
    <>
      <tr onClick={() => setOpen(v => !v)}
        className={`border-b border-gray-100 cursor-pointer select-none text-[11px] transition-colors ${rowBg}`}>
        <td className="py-2 pr-2" style={{ paddingLeft: padLeft }}>
          <span className={`inline-flex items-center gap-1.5 ${bold ? 'font-bold text-gray-800' : 'text-gray-700'}`}>
            {children
              ? (open
                  ? <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
                  : <ChevronRight className="h-3 w-3 text-gray-400 shrink-0" />)
              : <span className="w-3 shrink-0" />}
            {label}
          </span>
        </td>
        {cells.map((c, i) => (
          <td key={i} className="py-2 px-3 text-right tabular-nums">{c}</td>
        ))}
      </tr>
      {open && children}
    </>
  )
}

// ── Formatação ──────────────────────────────────────────────────────────────
export function fmtBRL(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function StatusBadge({ status, map }: {
  status: string
  map: Record<string, { label: string; cls: string }>
}) {
  const cfg = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' }
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
}

// ── Form helpers ─────────────────────────────────────────────────────────────
export function FRow({ children }: { children: ReactNode }) {
  return <div className="flex items-end gap-4 flex-wrap">{children}</div>
}

export function FField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
  )
}

export function FInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className={`border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-white
        focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors
        ${props.className ?? ''}`} />
  )
}

export function FSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props}
      className={`border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-white
        focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors
        ${props.className ?? ''}`}>
      {children}
    </select>
  )
}

export function FToggle({ values, selected, onChange }: {
  values: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
  }
  return (
    <div className="flex gap-1 flex-wrap">
      {values.map(v => (
        <button key={v} onClick={() => toggle(v)}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
            selected.includes(v)
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300 hover:text-gray-700'
          }`}>
          {v}
        </button>
      ))}
      {selected.length > 0 && (
        <button onClick={() => onChange([])}
          className="text-[11px] px-2 py-1 text-red-400 hover:text-red-600 border border-transparent hover:border-red-200 rounded-lg transition-colors">
          Limpar
        </button>
      )}
    </div>
  )
}
