'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  LayoutDashboard, FileSearch, Upload, Settings, LogOut,
  AlertTriangle, Receipt, ShieldAlert, TrendingUp, CalendarDays,
  XCircle, Landmark, Link2, Download, Cpu, Users, FileBarChart,
  Layers, Building2, FileText, CreditCard, BellRing, ChevronDown, Banknote, Bell, FolderOpen,
} from 'lucide-react'
import AuthGuard from '@/components/AuthGuard'
import { logout, getUsuario } from '@/lib/auth'
import { api } from '@/lib/api'

const groups = [
  {
    label: 'Principal',
    items: [
      { href: '/',                    label: 'Dashboard',         icon: LayoutDashboard },
      { href: '/conciliacao',         label: 'Conciliação',        icon: FileSearch },
      { href: '/divergencias',        label: 'Divergências',       icon: AlertTriangle },
      { href: '/cancelamentos',       label: 'Cancelamentos',      icon: XCircle },
      { href: '/conciliacao-manual',  label: 'Conc. Manual',       icon: Link2 },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { href: '/agenda',              label: 'Agenda / Previsão',  icon: CalendarDays },
      { href: '/antecipacao',         label: 'Antecipação',        icon: CreditCard },
      { href: '/parcelas',            label: 'Parcelas',           icon: Layers },
      { href: '/fluxo-caixa',         label: 'Fluxo de Caixa',     icon: TrendingUp },
      { href: '/auditoria-taxas',     label: 'Auditoria Taxas',    icon: ShieldAlert },
      { href: '/domicilio-bancario',    label: 'Dom. Bancário',      icon: Landmark },
      { href: '/boletos',               label: 'DDA / Boleto',       icon: FileText },
      { href: '/conferencia-bancaria',  label: 'Conf. Bancária',     icon: Banknote },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { href: '/alertas',             label: 'Alertas',            icon: BellRing },
      { href: '/grupo-empresarial',   label: 'Grupo Empresarial',  icon: Building2 },
      { href: '/relatorio',           label: 'Relatório',          icon: FileBarChart },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/importacao',                label: 'Importação',      icon: Upload },
      { href: '/exportacao',                label: 'Exportação ERP',  icon: Download },
      { href: '/cadastros/contratos-taxas', label: 'Contratos',       icon: Receipt },
      { href: '/documentos',                label: 'Documentos',      icon: FolderOpen },
      { href: '/meus-documentos',           label: 'Meus Documentos', icon: FileText },
      { href: '/admin/usuarios',             label: 'Gestão de Acessos', icon: Users },
      { href: '/usuarios',                  label: 'Usuários',          icon: Users },
      { href: '/jobs',                      label: 'Monitor Jobs',    icon: Cpu },
      { href: '/configuracoes',             label: 'Configurações',   icon: Settings },
    ],
  },
]

function NavDropdown({ group, pathname }: { group: typeof groups[0]; pathname: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const hasActive = group.items.some(item =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  )

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all duration-150 rounded-md
          ${hasActive
            ? 'text-white'
            : 'text-white/50 hover:text-white/90'
          }`}
      >
        {hasActive && (
          <span className="absolute inset-x-1 bottom-0 h-[2px] bg-blue-400 rounded-full" />
        )}
        {group.label}
        <ChevronDown className={`h-3 w-3 opacity-60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-52 bg-[#111827] border border-white/10 rounded-xl shadow-2xl shadow-black/40 py-1.5 z-50">
          {group.items.map(item => {
            const Icon = item.icon
            const ativo = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 mx-1 rounded-lg text-[13px] transition-all duration-100
                  ${ativo
                    ? 'bg-blue-600/20 text-blue-300 font-semibold'
                    : 'text-white/60 hover:text-white hover:bg-white/8 font-medium'
                  }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${ativo ? 'text-blue-400' : 'text-white/30'}`} />
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NotificacoesSino() {
  const [open, setOpen]           = useState(false)
  const [disparos, setDisparos]   = useState<any[]>([])
  const [naoLidas, setNaoLidas]   = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const carregar = useCallback(async () => {
    try {
      const r = await api.get('/alertas/disparos')
      const lista = r.data as any[]
      setDisparos(lista.slice(0, 20))
      setNaoLidas(lista.filter((d: any) => !d.lido).length)
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 60000) // atualiza a cada 1 min
    return () => clearInterval(t)
  }, [carregar])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function marcarLidas() {
    try {
      await api.patch('/alertas/disparos/marcar-lidas')
      setNaoLidas(0)
      setDisparos(d => d.map(x => ({ ...x, lido: true })))
    } catch { /* silencioso */ }
  }

  function tempoRelativo(data: string) {
    const diff = Date.now() - new Date(data).getTime()
    const min  = Math.floor(diff / 60000)
    const h    = Math.floor(diff / 3600000)
    const d    = Math.floor(diff / 86400000)
    if (min < 60)  return `${min}min atrás`
    if (h   < 24)  return `${h}h atrás`
    if (d   === 1) return 'Ontem'
    return `${d} dias atrás`
  }

  const TIPO_COR: Record<string, string> = {
    TAXA_MDR_ALTA:           'bg-red-100 text-red-700',
    DIVERGENCIA_NOVA:        'bg-orange-100 text-orange-700',
    SEM_REPASSE_DIAS:        'bg-yellow-100 text-yellow-700',
    TAXA_CONCILIACAO_BAIXA:  'bg-purple-100 text-purple-700',
    VALOR_REPASSE_DIVERGENTE:'bg-orange-100 text-orange-700',
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 transition-colors"
      >
        <Bell className="h-4 w-4 text-white/70" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#111827] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-bold text-white">Notificações</span>
            <div className="flex items-center gap-3">
              {naoLidas > 0 && (
                <button onClick={marcarLidas} className="text-[11px] text-blue-400 hover:text-blue-300 font-medium">
                  Marcar como lidas
                </button>
              )}
              <Link href="/alertas" onClick={() => setOpen(false)} className="text-[11px] text-white/40 hover:text-white/70 font-medium">
                Configurações
              </Link>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-[420px] overflow-y-auto">
            {disparos.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 text-white/20 mx-auto mb-2" />
                <p className="text-sm text-white/30">Nenhuma notificação</p>
              </div>
            ) : disparos.map((d: any) => (
              <div
                key={d.id}
                className={`px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${!d.lido ? 'bg-blue-500/5' : ''}`}
              >
                <div className="flex items-start gap-2.5">
                  {!d.lido && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />}
                  <div className={`flex-1 ${d.lido ? 'ml-4' : ''}`}>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${TIPO_COR[d.regra?.tipo] ?? 'bg-gray-700 text-gray-300'}`}>
                      {d.regra?.nome ?? 'Alerta'}
                    </span>
                    <p className="text-[12px] text-white/80 leading-snug font-medium">{d.mensagem}</p>
                    <p className="text-[10px] text-white/30 mt-1">{tempoRelativo(d.criadoEm)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Rodapé */}
          <Link
            href="/alertas"
            onClick={() => setOpen(false)}
            className="block text-center text-[12px] font-semibold text-white/50 hover:text-white py-3 border-t border-white/10 hover:bg-white/5 transition-colors"
          >
            Ver todas as notificações
          </Link>
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [usuario, setUsuario] = useState<{ nome: string; email: string } | null>(null)
  const [userOpen, setUserOpen] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setUsuario(getUsuario()) }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = usuario?.nome
    ? usuario.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen bg-gray-50">

        {/* Topnav */}
        <header className="h-11 bg-[#0d1117] border-b border-white/[0.06] flex items-center px-5 gap-1 shrink-0 z-40">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 mr-5 shrink-0 group">
            <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center shadow-sm shadow-blue-500/50">
              <span className="text-white font-black text-[10px] tracking-tight">CP</span>
            </div>
            <span className="text-white/90 font-semibold text-sm tracking-tight group-hover:text-white transition-colors">
              ConciliaPro
            </span>
          </Link>

          {/* Divisor */}
          <div className="w-px h-4 bg-white/10 mr-1" />

          {/* Nav groups */}
          <nav className="flex items-center gap-0 flex-1">
            {groups.map(g => (
              <NavDropdown key={g.label} group={g} pathname={pathname} />
            ))}
          </nav>

          {/* Sino de notificações */}
          <NotificacoesSino />

          {/* Usuário */}
          <div ref={userRef} className="relative ml-1 shrink-0">
            <button
              onClick={() => setUserOpen(v => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/8 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-white/80 text-xs font-medium leading-tight">{usuario?.nome?.split(' ')[0] ?? ''}</p>
              </div>
              <ChevronDown className="h-3 w-3 text-white/30 ml-0.5" />
            </button>

            {userOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#111827] border border-white/10 rounded-xl shadow-2xl shadow-black/40 py-1.5 z-50">
                <div className="px-3 py-2.5 border-b border-white/8 mb-1">
                  <p className="text-white/80 text-xs font-semibold">{usuario?.nome ?? ''}</p>
                  <p className="text-white/30 text-[11px] truncate mt-0.5">{usuario?.email ?? ''}</p>
                </div>
                <Link href="/configuracoes" onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 mx-1 rounded-lg text-[13px] text-white/60 hover:text-white hover:bg-white/8 font-medium transition-colors">
                  <Settings className="h-3.5 w-3.5 text-white/30" /> Configurações
                </Link>
                <button onClick={logout}
                  className="w-[calc(100%-8px)] ml-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-red-400/80 hover:text-red-400 hover:bg-red-500/10 font-medium transition-colors">
                  <LogOut className="h-3.5 w-3.5" /> Sair
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="h-8 bg-white border-b border-gray-200 flex items-center px-5 gap-2 shrink-0">
          <BreadCrumb pathname={pathname} />
        </div>

        {/* Conteúdo */}
        <main className="flex-1 overflow-auto">{children}</main>

      </div>
    </AuthGuard>
  )
}

function BreadCrumb({ pathname }: { pathname: string }) {
  const MAP: Record<string, string> = {
    '/': 'Dashboard',
    '/conciliacao': 'Conciliação',
    '/conciliacao-manual': 'Conciliação Manual',
    '/divergencias': 'Divergências',
    '/cancelamentos': 'Cancelamentos',
    '/agenda': 'Agenda / Previsão de Caixa',
    '/antecipacao': 'Antecipação de Recebíveis',
    '/parcelas': 'Repasse por Parcela',
    '/fluxo-caixa': 'Fluxo de Caixa',
    '/auditoria-taxas': 'Auditoria de Taxas',
    '/domicilio-bancario': 'Domicílio Bancário',
    '/boletos': 'DDA / Boleto',
    '/conferencia-bancaria': 'Conferência Bancária',
    '/documentos':          'Documentos',
    '/meus-documentos':     'Meus Documentos',
    '/alertas': 'Alertas Automáticos',
    '/grupo-empresarial': 'Grupo Empresarial',
    '/relatorio': 'Relatório Gerencial',
    '/importacao': 'Importação de Arquivos',
    '/exportacao': 'Exportação ERP',
    '/cadastros/contratos-taxas': 'Contratos de Taxas',
    '/admin/usuarios': 'Gestão de Acessos',
    '/usuarios': 'Usuários',
    '/jobs': 'Monitor de Jobs',
    '/configuracoes': 'Configurações',
  }

  const label = MAP[pathname] ?? MAP[Object.keys(MAP).find(k => k !== '/' && pathname.startsWith(k)) ?? ''] ?? 'ConciliaPro'

  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="text-gray-400">ConciliaPro</span>
      <span className="text-gray-300">/</span>
      <span className="text-gray-700 font-semibold">{label}</span>
    </div>
  )
}
