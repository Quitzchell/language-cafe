import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/SessionContext'
import { useAsync } from '@/hooks/useAsync'
import { friendlyMessage } from '@/lib/errors'
import {
  endSession,
  fetchSessionById,
  isHostOfSession,
  listParticipants,
  startSession,
  subscribeToParticipants,
  type Participant,
  type Session,
} from '@/lib/sessions'

type AccessState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'not-host' }
  | { status: 'ended' }
  | { status: 'ok'; session: Session }

export function HostWaitingRoom() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { participantId } = useSession()
  const navigate = useNavigate()
  const [asyncAccess, setAsyncAccess] = useState<AccessState>({ status: 'loading' })
  const [participants, setParticipants] = useState<Participant[]>([])
  const [copied, setCopied] = useState(false)
  const endAction = useAsync(endSession)
  const startAction = useAsync(startSession)

  useEffect(() => {
    if (!sessionId || !participantId) return

    let cancelled = false
    ;(async () => {
      const [session, hosts] = await Promise.all([
        fetchSessionById(sessionId),
        isHostOfSession(sessionId, participantId),
      ])
      if (cancelled) return
      if (!session) {
        setAsyncAccess({ status: 'not-found' })
        return
      }
      if (!hosts) {
        setAsyncAccess({ status: 'not-host' })
        return
      }
      if (session.status === 'ended') {
        setAsyncAccess({ status: 'ended' })
        return
      }
      setAsyncAccess({ status: 'ok', session })
    })()

    return () => {
      cancelled = true
    }
  }, [sessionId, participantId])

  const access: AccessState = !sessionId
    ? { status: 'not-found' }
    : !participantId
      ? { status: 'not-host' }
      : asyncAccess

  useEffect(() => {
    if (access.status !== 'ok' || !sessionId) return

    let cancelled = false
    listParticipants(sessionId).then((rows) => {
      if (!cancelled) setParticipants(rows)
    })

    const unsubscribe = subscribeToParticipants(sessionId, (p) => {
      setParticipants((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]))
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [access.status, sessionId])

  if (access.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (access.status === 'not-found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-2xl font-semibold">Session not found</h1>
        <p className="text-sm text-muted-foreground">
          Double-check the link and try again.
        </p>
      </div>
    )
  }

  if (access.status === 'not-host') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-2xl font-semibold">You aren't the host of this session</h1>
        <p className="text-sm text-muted-foreground">
          Only the person who created the session can open this page.
        </p>
      </div>
    )
  }

  if (access.status === 'ended') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-2xl font-semibold">Sessie is beëindigd</h1>
        <Button size="sm" variant="outline" onClick={() => navigate('/')}>
          Terug naar start
        </Button>
      </div>
    )
  }

  const { session } = access
  const joinUrl = `${window.location.origin}/join/${session.id}`
  const guests = participants.filter((p) => !p.is_host)
  const canStart = guests.length >= 1

  async function handleCopy() {
    await navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleEnd() {
    if (!participantId) return
    if (!window.confirm('Weet je zeker dat je de sessie wilt beëindigen?')) return
    const result = await endAction.run(session.id, 'host', participantId)
    if (result !== null) navigate('/')
  }

  async function handleStart() {
    if (!participantId) return
    const result = await startAction.run(session.id, participantId)
    if (result !== null) navigate(`/session/${session.id}/play`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">{session.title}</h1>

      <div className="bg-white p-4 rounded-md border border-input">
        <QRCodeSVG value={joinUrl} size={220} />
      </div>

      <div className="flex flex-col gap-2 w-full max-w-md items-center">
        <p className="text-sm text-muted-foreground">Share this link:</p>
        <code className="text-sm break-all text-center">{joinUrl}</code>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-md">
        <h2 className="text-lg font-medium">
          Participants ({guests.length})
        </h2>
        {guests.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Waiting for someone to join…
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {guests.map((p) => (
              <li key={p.id} className="text-sm">
                {p.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button
        size="lg"
        disabled={!canStart || startAction.loading}
        onClick={handleStart}
      >
        {startAction.loading ? 'Starten…' : 'Start sessie'}
      </Button>

      {startAction.error && (
        <p className="text-sm text-destructive">{friendlyMessage(startAction.error)}</p>
      )}

      <Button
        size="sm"
        variant="outline"
        disabled={endAction.loading}
        onClick={handleEnd}
      >
        {endAction.loading ? 'Beëindigen…' : 'Beëindig sessie'}
      </Button>

      {endAction.error && (
        <p className="text-sm text-destructive">{friendlyMessage(endAction.error)}</p>
      )}
    </div>
  )
}
