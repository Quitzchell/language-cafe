import { Navigate, Outlet } from 'react-router-dom'

import { useSession } from '@/contexts/SessionContext'

export function RequireTargetLanguage() {
  const { targetLanguage, proficiencyLevel } = useSession()

  if (!targetLanguage || !proficiencyLevel) {
    return <Navigate to="/target" replace />
  }

  return <Outlet />
}
