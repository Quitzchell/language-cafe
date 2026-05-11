import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { CardDisplay } from '@/components/CardDisplay'
import { DealerView } from '@/components/DealerView'
import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/SessionContext'
import { useSessionLive } from '@/contexts/SessionLive'
import { useAsync } from '@/hooks/useAsync'
import { friendlyMessage } from '@/lib/errors'
import {
  computeAskedThisRound,
  drawCard,
  endSession,
  isHostOfSession,
  passTurn,
  skipCard,
} from '@/lib/sessions'
import { targetPromptText } from '@/lib/targetPrompt'

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
  } = useSessionLive()
  const [isHost, setIsHost] = useState<boolean | null>(null)
  const drawAction = useAsync(drawCard)
  const skipAction = useAsync(skipCard)
  const passAction = useAsync(passTurn)
  const endAction = useAsync(endSession)

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
      <div className="min-h-dvh flex items-center justify-center px-4">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (access === 'not-found') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-2xl font-semibold">Session not found</h1>
      </div>
    )
  }

  if (access === 'not-host') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-2xl font-semibold">You aren't the host of this session</h1>
      </div>
    )
  }

  if (access === 'ended') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 px-4">
        <h1 className="text-2xl font-semibold">Session ended</h1>
        <Button size="sm" variant="outline" onClick={() => navigate('/')}>
          Back to start
        </Button>
      </div>
    )
  }

  if (access === 'waiting') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 px-4">
        <h1 className="text-2xl font-semibold">Session not started yet</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/session/${sessionId}`)}
        >
          Back to waiting room
        </Button>
      </div>
    )
  }

  async function handlePick(guestId: string) {
    if (!participantId || !sessionId) return
    await drawAction.run(sessionId, participantId, guestId)
  }

  async function handleSkip() {
    if (!participantId || !sessionId) return
    await skipAction.run(sessionId, participantId)
  }

  async function handlePass() {
    if (!participantId || !sessionId || !card) return
    await passAction.run(sessionId, participantId, card.payload.target_participant_id)
  }

  async function handleEnd() {
    if (!participantId || !sessionId) return
    if (!window.confirm('Are you sure you want to end the session?')) return
    const result = await endAction.run(sessionId, 'host', participantId)
    if (result !== null) navigate('/')
  }

  const endButton = (
    <div className="flex flex-col items-center gap-2">
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

  const isDealer = currentDealerId === participantId
  const askedThisRound = computeAskedThisRound(cardDrawnHistory, participants.length)
  const isTarget = !!card && card.payload.target_participant_id === participantId
  const myNativeLanguage = participants.find((p) => p.id === participantId)?.native_language

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
        footer={endButton}
      />
    )
  }

  if (isTarget) {
    return (
      <div className="min-h-dvh flex flex-col px-4 py-12">
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-xl font-medium text-center">
            {myNativeLanguage
              ? targetPromptText(myNativeLanguage)
              : 'Someone is asking you a question — listen carefully'}
          </p>
        </div>
        <div className="flex justify-center pt-8">{endButton}</div>
      </div>
    )
  }

  const dealerName =
    participants.find((p) => p.id === currentDealerId)?.display_name ?? 'the dealer'
  const targetName = card
    ? (participants.find((p) => p.id === card.payload.target_participant_id)?.display_name ??
      'unknown')
    : null

  return (
    <div className="min-h-dvh flex flex-col px-4 py-12">
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {card && card.text && targetName ? (
          <CardDisplay
            practice={card.text.practice}
            native={card.text.native}
            romanization={card.text.romanization}
            targetName={targetName}
          />
        ) : (
          <p className="text-muted-foreground">Waiting for {dealerName}…</p>
        )}
      </div>
      <div className="flex justify-center pt-8">{endButton}</div>
    </div>
  )
}
