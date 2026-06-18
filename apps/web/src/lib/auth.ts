'use client'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function logout() {
  localStorage.removeItem('token')
  window.location.href = '/login'
}

export function getUsuario(): { nome: string; email: string; perfil: string; empresaId: string } | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload
  } catch {
    return null
  }
}
