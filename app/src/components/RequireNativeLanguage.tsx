import { Navigate, Outlet } from 'react-router-dom'

import { useSession } from '@/contexts/SessionContext'

export function RequireNativeLanguage() {
  const { nativeLanguage } = useSession()

  if (!nativeLanguage) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}