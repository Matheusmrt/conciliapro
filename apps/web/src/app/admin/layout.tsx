'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [autenticado, setAutenticado] = useState(false)
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(false)

  useEffect(() => {
    const ok = sessionStorage.getItem('admin_auth')
    if (ok === '1') setAutenticado(true)
  }, [])

  function entrar(e: React.FormEvent) {
    e.preventDefault()
    // A senha aqui é apenas para esconder a tela — a autenticação real
    // é feita pelo ADMIN_SECRET no header de cada requisição à API
    if (senha.length >= 6) {
      sessionStorage.setItem('admin_auth', '1')
      sessionStorage.setItem('admin_secret', senha)
      setAutenticado(true)
    } else {
      setErro(true)
    }
  }

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm border border-gray-700">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">C</span>
            </div>
            <div>
              <p className="font-black text-white">ConciliaPro</p>
              <p className="text-xs text-gray-400">Painel Administrativo</p>
            </div>
          </div>
          <form onSubmit={entrar} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400">Senha de administrador</label>
              <input type="password" value={senha} onChange={e => { setSenha(e.target.value); setErro(false) }}
                placeholder="••••••••"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm mt-1
                  focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
            </div>
            {erro && <p className="text-xs text-red-400">Senha incorreta</p>}
            <button type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors text-sm">
              Entrar
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">C</span>
          </div>
          <div>
            <span className="font-black text-white text-sm">ConciliaPro</span>
            <span className="text-gray-500 text-xs ml-2">Admin</span>
          </div>
        </div>
        <button onClick={() => { sessionStorage.clear(); setAutenticado(false) }}
          className="text-xs text-gray-500 hover:text-gray-300">
          Sair
        </button>
      </header>
      <main>{children}</main>
    </div>
  )
}
