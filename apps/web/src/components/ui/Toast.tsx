'use client'

import { useEffect } from 'react'
import { CheckCircle, AlertTriangle, X } from 'lucide-react'

export interface ToastState {
  tipo: 'ok' | 'erro' | 'info'
  msg: string
}

export function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [toast])

  if (!toast) return null

  const styles = {
    ok:   'bg-emerald-50 border-emerald-200 text-emerald-800',
    erro: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  const Icon = toast.tipo === 'ok' ? CheckCircle : AlertTriangle
  const iconColor = toast.tipo === 'ok' ? 'text-emerald-600' : toast.tipo === 'erro' ? 'text-red-500' : 'text-blue-500'

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${styles[toast.tipo]}`}>
      <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
      <span className="flex-1">{toast.msg}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
