import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useSession } from '@/contexts/SessionContext'

export function RequireTargetLanguage({ children }: { children: ReactNode }) {
  const { targetLanguage, proficiencyLevel } = useSession()

  if (!targetLanguage || !proficiencyLevel) {
    return <Navigate to="/target" replace />
  }

  return <>{children}</>
}
