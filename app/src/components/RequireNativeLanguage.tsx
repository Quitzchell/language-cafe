import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useSession } from '@/contexts/SessionContext'

export function RequireNativeLanguage({ children }: { children: ReactNode }) {
  const { nativeLanguage } = useSession()

  if (!nativeLanguage) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}