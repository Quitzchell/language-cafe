import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/SessionContext'
import { useSessionLive } from '@/contexts/SessionLive'

export function ParticipantWaitingRoom() {
  const { sessionId: sessionIdParam } = useParams<{ sessionId: string }>()
  const { sessionId, sessionTitle, participantId } = useSession()
  const navigate = useNavigate()
  const { session, participants, ended } = useSessionLive()

  const active =
    sessionId && participantId && sessionId === sessionIdParam ? sessionId : null

  useEffect(() => {
    if (active && session?.status === 'active') {
      navigate(`/join/${active}/play`)
    }
  }, [active, navigate, session?.status])

  if (!active || !sessionTitle) {
    return <Navigate to={`/join/${sessionIdParam ?? ''}`} replace />
  }

  if (ended) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <h1 className="text-2xl font-semibold">Session ended</h1>
        <p className="text-sm text-muted-foreground">Thanks for joining!</p>
        <Button size="sm" variant="outline" onClick={() => navigate('/')}>
          Back to start
        </Button>
      </div>
    )
  }

  const guestCount = participants.filter((p) => !p.is_host).length

  return (
    <div className="min-h-screen flex flex-col items-center gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">{sessionTitle}</h1>
      <p className="text-muted-foreground">Waiting for the host to start…</p>

      <div className="flex flex-col gap-2 w-full max-w-md">
        <h2 className="text-lg font-medium">
          Participants ({guestCount})
        </h2>
        <ul className="flex flex-col gap-1">
          {participants.map((p) => (
            <li key={p.id} className="text-sm">
              {p.display_name}
              {p.is_host && <span className="text-muted-foreground"> (host)</span>}
              {p.id === participantId && (
                <span className="text-muted-foreground"> (you)</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
