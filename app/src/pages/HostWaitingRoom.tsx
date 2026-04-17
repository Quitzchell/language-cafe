import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/SessionContext'
import {
  listParticipants,
  subscribeToParticipants,
  type Participant,
} from '@/lib/sessions'

export function HostWaitingRoom() {
  const { sessionId, sessionTitle } = useSession()
  const navigate = useNavigate()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!sessionId) return

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
  }, [sessionId])

  if (!sessionId || !sessionTitle) {
    return null
  }

  const joinUrl = `${window.location.origin}/join/${sessionId}`
  const guests = participants.filter((p) => !p.is_host)
  const canStart = guests.length >= 1

  async function handleCopy() {
    await navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col items-center gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">{sessionTitle}</h1>

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
        disabled={!canStart}
        onClick={() => navigate('/session/play')}
      >
        Start sessie
      </Button>
    </div>
  )
}
