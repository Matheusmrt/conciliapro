'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '@/lib/auth'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
    } else {
      setOk(true)
    }
  }, [])

  if (!ok) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  return <>{children}</>
}
