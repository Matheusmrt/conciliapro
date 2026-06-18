'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  // Esqueci a senha
  const [modalEsqueci, setModalEsqueci] = useState(false)
  const [emailReset, setEmailReset] = useState('')
  const [resetEnviado, setResetEnviado] = useState(false)
  const [enviandoReset, setEnviandoReset] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const r = await api.post('/auth/login', { email, senha })
      localStorage.setItem('token', r.data.token)
      router.push('/')
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.erro === 'TRIAL_EXPIRADO') {
        setErro('Seu período de teste encerrou. Entre em contato pelo e-mail contato@conciliapro.com.br para contratar um plano.')
      } else {
        setErro('E-mail ou senha incorretos.')
      }
    } finally {
      setCarregando(false)
    }
  }

  async function enviarReset(e: React.FormEvent) {
    e.preventDefault()
    setEnviandoReset(true)
    try {
      await api.post('/auth/esqueci-senha', { email: emailReset })
      setResetEnviado(true)
    } catch {
      setResetEnviado(true) // mesmo em erro, não revelar se email existe
    } finally {
      setEnviandoReset(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 gap-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-blue-600">Concilia<span className="text-gray-900">Pro</span></h1>
          <p className="text-gray-500 text-sm mt-1">Conciliação de Cartões</p>
        </div>

        <form onSubmit={entrar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-right mt-1">
              <button type="button" onClick={() => { setModalEsqueci(true); setResetEnviado(false); setEmailReset(email) }}
                className="text-xs text-blue-600 hover:underline">
                Esqueci a senha
              </button>
            </div>
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      {/* Criar conta */}
      <p className="text-center text-sm text-gray-500">
        Não tem conta?{' '}
        <Link href="/cadastro" className="text-blue-600 font-semibold hover:underline">
          Criar conta grátis
        </Link>
      </p>

      {/* Rodapé legal */}
      <p className="text-center text-xs text-gray-400">
        Ao entrar, você concorda com os{' '}
        <a href="/termos-de-uso" target="_blank" className="text-blue-500 hover:underline">Termos de Uso</a>
        {' '}e a{' '}
        <a href="/politica-de-privacidade" target="_blank" className="text-blue-500 hover:underline">Política de Privacidade</a>
      </p>

      {/* Modal Esqueci a Senha */}
      {modalEsqueci && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            {resetEnviado ? (
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">E-mail enviado!</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
                </p>
                <button onClick={() => setModalEsqueci(false)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-gray-900 mb-1">Redefinir senha</h3>
                <p className="text-sm text-gray-500 mb-4">Informe seu e-mail e enviaremos um link para redefinir sua senha.</p>
                <form onSubmit={enviarReset} className="space-y-3">
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={emailReset}
                    onChange={e => setEmailReset(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setModalEsqueci(false)}
                      className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button type="submit" disabled={enviandoReset}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                      {enviandoReset ? 'Enviando...' : 'Enviar link'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
