import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { useSession } from '@/contexts/SessionContext'
import {
  listParticipants,
  subscribeToParticipants,
  type Participant,
} from '@/lib/sessions'

export function ParticipantWaitingRoom() {
  const { sessionId: sessionIdParam } = useParams<{ sessionId: string }>()
  const { sessionId, sessionTitle, participantId } = useSession()
  const [participants, setParticipants] = useState<Participant[]>([])

  const active =
    sessionId && participantId && sessionId === sessionIdParam ? sessionId : null

  useEffect(() => {
    if (!active) return

    let cancelled = false
    listParticipants(active).then((rows) => {
      if (!cancelled) setParticipants(rows)
    })

    const unsubscribe = subscribeToParticipants(active, (p) => {
      setParticipants((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]))
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [active])

  if (!active || !sessionTitle) {
    return <Navigate to={`/join/${sessionIdParam ?? ''}`} replace />
  }

  const guests = participants.filter((p) => !p.is_host)

  return (
    <div className="min-h-screen flex flex-col items-center gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">{sessionTitle}</h1>
      <p className="text-muted-foreground">Waiting for the host to start…</p>

      <div className="flex flex-col gap-2 w-full max-w-md">
        <h2 className="text-lg font-medium">
          Participants ({guests.length})
        </h2>
        <ul className="flex flex-col gap-1">
          {guests.map((p) => (
            <li key={p.id} className="text-sm">
              {p.display_name}
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