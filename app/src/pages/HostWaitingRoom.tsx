import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/SessionContext'
import { useSessionLive } from '@/contexts/SessionLive'
import { useAsync } from '@/hooks/useAsync'
import { friendlyMessage } from '@/lib/errors'
import { endSession, isHostOfSession, startSession } from '@/lib/sessions'

type AccessStatus = 'loading' | 'not-found' | 'not-host' | 'ended' | 'ok'

export function HostWaitingRoom() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { participantId } = useSession()
  const navigate = useNavigate()
  const { session, sessionLoaded, participants, ended } = useSessionLive()
  const [isHost, setIsHost] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)
  const endAction = useAsync(endSession)
  const startAction = useAsync(startSession)

  useEffect(() => {
    if (!sessionId || !participantId) return
    let cancelled = false
    isHostOfSession(sessionId, participantId).then((result) => {
      if (!cancelled) setIsHost(result)
    })
    return () => {
      cancelled = true
    }
  }, [sessionId, participantId])

  const access: AccessStatus = !sessionId || !participantId
    ? 'not-host'
    : !sessionLoaded || isHost === null
      ? 'loading'
      : !session
        ? 'not-found'
        : !isHost
          ? 'not-host'
          : ended || session.status === 'ended'
            ? 'ended'
            : 'ok'

  if (access === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (access === 'not-found') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-2xl font-semibold">Session not found</h1>
        <p className="text-sm text-muted-foreground">
          Double-check the link and try again.
        </p>
      </div>
    )
  }

  if (access === 'not-host') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-2xl font-semibold">You aren't the host of this session</h1>
        <p className="text-sm text-muted-foreground">
          Only the person who created the session can open this page.
        </p>
      </div>
    )
  }

  if (access === 'ended') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-2xl font-semibold">Session ended</h1>
        <Button size="sm" variant="outline" onClick={() => navigate('/')}>
          Back to start
        </Button>
      </div>
    )
  }

  const activeSession = session!
  const joinUrl = `${window.location.origin}/join/${activeSession.id}`
  const guestCount = participants.filter((p) => !p.is_host).length
  const canStart = guestCount >= 1

  async function handleCopy() {
    await navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleEnd() {
    if (!participantId) return
    if (!window.confirm('Are you sure you want to end the session?')) return
    const result = await endAction.run(activeSession.id, 'host', participantId)
    if (result !== null) navigate('/')
  }

  async function handleStart() {
    if (!participantId) return
    const result = await startAction.run(activeSession.id, participantId)
    if (result !== null) navigate(`/session/${activeSession.id}/play`)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">{activeSession.title}</h1>

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
          Participants ({guestCount})
        </h2>
        <ul className="flex flex-col gap-1">
          {participants.map((p) => (
            <li key={p.id} className="text-sm">
              {p.display_name}
              {p.is_host && <span className="text-muted-foreground"> (host)</span>}
            </li>
          ))}
        </ul>
        {guestCount === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Waiting for someone to join…
          </p>
        )}
      </div>

      <Button
        size="lg"
        disabled={!canStart || startAction.loading}
        onClick={handleStart}
      >
        {startAction.loading ? 'Starting…' : 'Start session'}
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
        {endAction.loading ? 'Ending…' : 'End session'}
      </Button>

      {endAction.error && (
        <p className="text-sm text-destructive">{friendlyMessage(endAction.error)}</p>
      )}
    </div>
  )
}
