import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/SessionContext'
import {
  fetchSessionById,
  listParticipants,
  subscribeToParticipants,
  subscribeToSessionEvents,
  type Participant,
} from '@/lib/sessions'

export function ParticipantWaitingRoom() {
  const { sessionId: sessionIdParam } = useParams<{ sessionId: string }>()
  const { sessionId, sessionTitle, participantId } = useSession()
  const navigate = useNavigate()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [ended, setEnded] = useState(false)

  const active =
    sessionId && participantId && sessionId === sessionIdParam ? sessionId : null

  useEffect(() => {
    if (!active) return

    let cancelled = false
    listParticipants(active).then((rows) => {
      if (!cancelled) setParticipants(rows)
    })
    fetchSessionById(active).then((session) => {
      if (!cancelled && session?.status === 'ended') setEnded(true)
    })

    const unsubParticipants = subscribeToParticipants(active, (p) => {
      setParticipants((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]))
    })

    const unsubEvents = subscribeToSessionEvents(active, (event) => {
      if (event.type === 'session_ended') setEnded(true)
      if (event.type === 'session_started') navigate(`/join/${active}/play`)
    })

    return () => {
      cancelled = true
      unsubParticipants()
      unsubEvents()
    }
  }, [active, navigate])

  if (!active || !sessionTitle) {
    return <Navigate to={`/join/${sessionIdParam ?? ''}`} replace />
  }

  if (ended) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <h1 className="text-2xl font-semibold">Sessie is beëindigd</h1>
        <p className="text-sm text-muted-foreground">Bedankt voor het meedoen!</p>
        <Button size="sm" variant="outline" onClick={() => navigate('/')}>
          Terug naar start
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
