import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { CardDisplay } from '@/components/CardDisplay'
import { DealerView, type DealerCardView } from '@/components/DealerView'
import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/SessionContext'
import { useAsync } from '@/hooks/useAsync'
import {
  computeAskedThisRound,
  drawCard,
  fetchCardWithTranslations,
  fetchCurrentDealer,
  fetchSessionById,
  isHostOfSession,
  listCardDrawnEvents,
  listParticipants,
  passTurn,
  skipCard,
  subscribeToParticipants,
  subscribeToSessionEvents,
  type CardDrawnEvent,
  type Participant,
  type Session,
} from '@/lib/sessions'

type AccessState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'not-host' }
  | { status: 'ended' }
  | { status: 'waiting' }
  | { status: 'ok'; session: Session }

export function HostPlay() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { participantId } = useSession()
  const navigate = useNavigate()
  const [asyncAccess, setAsyncAccess] = useState<AccessState>({ status: 'loading' })
  const [participants, setParticipants] = useState<Participant[]>([])
  const [card, setCard] = useState<DealerCardView | null>(null)
  const [currentDealerId, setCurrentDealerId] = useState<string | null>(null)
  const [cardDrawnHistory, setCardDrawnHistory] = useState<CardDrawnEvent[]>([])
  const drawAction = useAsync(drawCard)
  const skipAction = useAsync(skipCard)
  const passAction = useAsync(passTurn)

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
      if (session.status === 'waiting') {
        setAsyncAccess({ status: 'waiting' })
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
    if (access.status !== 'ok' || !sessionId || !participantId) return

    let cancelled = false
    listParticipants(sessionId).then((rows) => {
      if (!cancelled) setParticipants(rows)
    })
    fetchCurrentDealer(sessionId).then((dealerId) => {
      if (!cancelled) setCurrentDealerId(dealerId ?? participantId)
    })
    listCardDrawnEvents(sessionId).then((events) => {
      if (!cancelled) setCardDrawnHistory(events)
    })

    const unsubParticipants = subscribeToParticipants(sessionId, (p) => {
      setParticipants((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]))
    })

    const unsubEvents = subscribeToSessionEvents(sessionId, (event) => {
      if (event.type === 'session_ended') {
        setAsyncAccess({ status: 'ended' })
        return
      }
      if (event.type === 'turn_passed') {
        setCurrentDealerId(event.payload.next_participant_id)
        setCard(null)
        return
      }
      if (event.type === 'card_drawn') {
        const payload = event.payload
        setCard({ payload, text: null })
        setCardDrawnHistory((prev) =>
          prev.some((e) => e.id === event.id) ? prev : [...prev, event],
        )
        fetchCardWithTranslations(
          payload.card_id,
          payload.practice_language,
          payload.native_language,
        )
          .then((text) => {
            if (cancelled) return
            setCard((prev) =>
              prev && prev.payload.card_id === payload.card_id ? { payload, text } : prev,
            )
          })
          .catch(() => {
            // Leave the card skeleton; surface silently.
          })
      }
    })

    return () => {
      cancelled = true
      unsubParticipants()
      unsubEvents()
    }
  }, [access.status, sessionId, participantId])

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
      </div>
    )
  }

  if (access.status === 'not-host') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-2xl font-semibold">You aren't the host of this session</h1>
      </div>
    )
  }

  if (access.status === 'ended') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <h1 className="text-2xl font-semibold">Sessie is beëindigd</h1>
        <Button size="sm" variant="outline" onClick={() => navigate('/')}>
          Terug naar start
        </Button>
      </div>
    )
  }

  if (access.status === 'waiting') {
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
