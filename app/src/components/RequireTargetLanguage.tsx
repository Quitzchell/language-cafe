import { Navigate, Outlet } from 'react-router-dom'

import { useSession } from '@/contexts/SessionContext'

export function RequireTargetLanguage() {
  const { targetLanguage, proficiencyLevels } = useSession()

  if (!targetLanguage || proficiencyLevels.length === 0) {
    return <Navigate to="/target" replace />
  }

  return <Outlet />
}
