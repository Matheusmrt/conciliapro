'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const aceito = localStorage.getItem('cookie_consent')
    if (!aceito) setVisivel(true)
  }, [])

  function aceitar() {
    localStorage.setItem('cookie_consent', 'accepted')
    setVisivel(false)
  }

  if (!visivel) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-4xl mx-auto bg-gray-900 text-white rounded-xl shadow-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-gray-300 flex-1">
          Utilizamos cookies essenciais para manter sua sessão autenticada. Ao continuar, você concorda com nossos{' '}
          <Link href="/termos-de-uso" className="text-blue-400 hover:underline" target="_blank">Termos de Uso</Link>
          {' '}e{' '}
          <Link href="/politica-de-privacidade" className="text-blue-400 hover:underline" target="_blank">Política de Privacidade</Link>
          , em conformidade com a LGPD (Lei 13.709/2018).
        </p>
        <button
          onClick={aceitar}
          className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
          Entendi e aceito
        </button>
      </div>
    </div>
  )
}
