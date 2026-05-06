import { Navigate, Outlet, useParams } from 'react-router-dom'

import { SessionLiveProvider } from '@/contexts/SessionLive'

export function SessionRoute() {
  const { sessionId } = useParams<{ sessionId: string }>()
  if (!sessionId) return <Navigate to="/" replace />
  return (
    <SessionLiveProvider sessionId={sessionId}>
      <Outlet />
    </SessionLiveProvider>
  )
}
