'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'

function RedefinirSenhaForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [tokenValido, setTokenValido] = useState<boolean | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!token) { setTokenValido(false); return }
    api.get(`/auth/validar-reset/${token}`)
      .then(r => { setTokenValido(true); setNome(r.data.nome); setEmail(r.data.email) })
      .catch(() => setTokenValido(false))
  }, [token])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
    if (senha.length < 8) { setErro('A senha deve ter no mínimo 8 caracteres.'); return }
    setErro('')
    setSalvando(true)
    try {
      await api.post('/auth/redefinir-senha', { token, senha })
      setSucesso(true)
    } catch {
      setErro('Não foi possível redefinir a senha. O link pode ter expirado.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-blue-600">Concilia<span className="text-gray-900">Pro</span></h1>
        </div>

        {tokenValido === null && (
          <p className="text-center text-sm text-gray-500">Validando link...</p>
        )}

        {tokenValido === false && (
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Link inválido ou expirado</h3>
            <p className="text-sm text-gray-500 mb-4">Solicite um novo link na página de login.</p>
            <button onClick={() => router.push('/login')}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
              Ir para o login
            </button>
          </div>
        )}

        {tokenValido === true && sucesso && (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Senha redefinida!</h3>
            <p className="text-sm text-gray-500 mb-4">Sua senha foi alterada com sucesso.</p>
            <button onClick={() => router.push('/login')}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
              Ir para o login
            </button>
          </div>
        )}

        {tokenValido === true && !sucesso && (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-700">Olá, <strong>{nome}</strong></p>
              <p className="text-xs text-gray-500">{email}</p>
            </div>
            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
                <input
                  type="password"
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  required
                  placeholder="Repita a nova senha"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {erro && <p className="text-sm text-red-600">{erro}</p>}

              <button type="submit" disabled={salvando}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense>
      <RedefinirSenhaForm />
    </Suspense>
  )
}
