import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { fetchSessionById, type Session } from '@/lib/sessions'

export function JoinStub() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!!sessionId)

  useEffect(() => {
    if (!sessionId) return
    fetchSessionById(sessionId)
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-2xl font-semibold">Session not found</h1>
        <p className="text-sm text-muted-foreground">
          Double-check the link and try again.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">{session.title}</h1>
      <p className="text-muted-foreground">
        Target language: <strong>{session.target_language}</strong>
      </p>
      <p className="text-muted-foreground text-sm italic">
        Join flow coming in LC-6.
      </p>
    </div>
  )
}
