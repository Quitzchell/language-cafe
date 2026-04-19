import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { CardDisplay } from '@/components/CardDisplay'
import { DealerView } from '@/components/DealerView'
import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/SessionContext'
import { useSessionLive } from '@/contexts/SessionLive'
import { useAsync } from '@/hooks/useAsync'
import {
  computeAskedThisRound,
  drawCard,
  isHostOfSession,
  passTurn,
  skipCard,
} from '@/lib/sessions'

type AccessStatus =
  | 'loading'
  | 'not-found'
  | 'not-host'
  | 'ended'
  | 'waiting'
  | 'ok'

export function HostPlay() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { participantId } = useSession()
  const navigate = useNavigate()
  const {
    session,
    sessionLoaded,
    participants,
    card,
    currentDealerId,
    cardDrawnHistory,
    ended,
    applyEvent,
  } = useSessionLive()
  const [isHost, setIsHost] = useState<boolean | null>(null)
  const drawAction = useAsync(drawCard)
  const skipAction = useAsync(skipCard)
  const passAction = useAsync(passTurn)

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
            : session.status === 'waiting'
              ? 'waiting'
              : 'ok'

  if (access === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (access === 'not-found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-2xl font-semibold">Session not found</h1>
      </div>
    )
  }

  if (access === 'not-host') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-2xl font-semibold">You aren't the host of this session</h1>
      </div>
    )
  }

  if (access === 'ended') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <h1 className="text-2xl font-semibold">Sessie is beëindigd</h1>
        <Button size="sm" variant="outline" onClick={() => navigate('/')}>
          Terug naar start
        </Button>
      </div>
    )
  }

  if (access === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <h1 className="text-2xl font-semibold">Sessie nog niet gestart</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/session/${sessionId}`)}
        >
          Terug naar wachtkamer
        </Button>
      </div>
    )
  }

  async function handlePick(guestId: string) {
    if (!participantId || !sessionId) return
    const event = await drawAction.run(sessionId, participantId, guestId)
    if (event) applyEvent(event)
  }

  async function handleSkip() {
    if (!participantId || !sessionId) return
    const event = await skipAction.run(sessionId, participantId)
    if (event) applyEvent(event)
  }

  async function handlePass() {
    if (!participantId || !sessionId || !card) return
    const event = await passAction.run(
      sessionId,
      participantId,
      card.payload.target_participant_id,
    )
    if (event) applyEvent(event)
  }

  const isDealer = currentDealerId === participantId
  const askedThisRound = computeAskedThisRound(cardDrawnHistory, participants.length)
  const isTarget = !!card && card.payload.target_participant_id === participantId

  if (isDealer) {
    return (
      <DealerView
        participants={participants}
        actorParticipantId={participantId!}
        askedParticipantIds={askedThisRound}
        card={card}
        onPick={handlePick}
        onSkip={handleSkip}
        onPass={handlePass}
        loading={{
          pick: drawAction.loading,
          skip: skipAction.loading,
          pass: passAction.loading,
        }}
        errors={{
          pick: drawAction.error,
          skip: skipAction.error,
          pass: passAction.error,
        }}
      />
    )
  }

  if (isTarget) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 py-12">
        <p className="text-xl font-medium text-center">
          Iemand stelt jou een vraag — luister goed
        </p>
      </div>
    )
  }

  const dealerName =
    participants.find((p) => p.id === currentDealerId)?.display_name ?? 'de dealer'
  const targetName = card
    ? (participants.find((p) => p.id === card.payload.target_participant_id)?.display_name ??
      'onbekend')
    : null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12">
      {card && card.text && targetName ? (
        <CardDisplay
          practice={card.text.practice}
          native={card.text.native}
          targetName={targetName}
        />
      ) : null}
      <p className="text-muted-foreground">Wachten op {dealerName}…</p>
    </div>
  )
}
