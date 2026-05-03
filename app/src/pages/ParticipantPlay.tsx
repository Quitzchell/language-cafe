import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { CardDisplay } from '@/components/CardDisplay'
import { DealerView } from '@/components/DealerView'
import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/SessionContext'
import { useSessionLive } from '@/contexts/SessionLive'
import { useAsync } from '@/hooks/useAsync'
import { computeAskedThisRound, drawCard, passTurn, skipCard } from '@/lib/sessions'
import { targetPromptText } from '@/lib/targetPrompt'

export function ParticipantPlay() {
  const { sessionId: sessionIdParam } = useParams<{ sessionId: string }>()
  const { sessionId, sessionTitle, participantId } = useSession()
  const navigate = useNavigate()
  const {
    participants,
    card,
    currentDealerId,
    cardDrawnHistory,
    ended,
  } = useSessionLive()
  const drawAction = useAsync(drawCard)
  const skipAction = useAsync(skipCard)
  const passAction = useAsync(passTurn)

  const active =
    sessionId && participantId && sessionId === sessionIdParam ? sessionId : null

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

  async function handlePick(guestId: string) {
    if (!active || !participantId) return
    await drawAction.run(active, participantId, guestId)
  }

  async function handleSkip() {
    if (!active || !participantId) return
    await skipAction.run(active, participantId)
  }

  async function handlePass() {
    if (!active || !participantId || !card) return
    await passAction.run(active, participantId, card.payload.target_participant_id)
  }

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
      />
    )
  }

  if (isTarget) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 py-12">
        <p className="text-xl font-medium text-center">
          {myNativeLanguage
            ? targetPromptText(myNativeLanguage)
            : 'Someone is asking you a question — listen carefully'}
        </p>
      </div>
    )
  }

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
          romanization={card.text.romanization}
          targetName={targetName}
        />
      ) : (
        <p className="text-muted-foreground">Waiting for the dealer…</p>
      )}
    </div>
  )
}
