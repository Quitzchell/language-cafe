import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

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
  listCardDrawnEvents,
  listParticipants,
  passTurn,
  skipCard,
  subscribeToParticipants,
  subscribeToSessionEvents,
  type CardDrawnEvent,
  type Participant,
  type SessionEvent,
} from '@/lib/sessions'

export function ParticipantPlay() {
  const { sessionId: sessionIdParam } = useParams<{ sessionId: string }>()
  const { sessionId, sessionTitle, participantId } = useSession()
  const navigate = useNavigate()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [card, setCard] = useState<DealerCardView | null>(null)
  const [currentDealerId, setCurrentDealerId] = useState<string | null>(null)
  const [cardDrawnHistory, setCardDrawnHistory] = useState<CardDrawnEvent[]>([])
  const [ended, setEnded] = useState(false)
  const drawAction = useAsync(drawCard)
  const skipAction = useAsync(skipCard)
  const passAction = useAsync(passTurn)
  const applyEventRef = useRef<(event: SessionEvent) => void>(() => {})

  const active =
    sessionId && participantId && sessionId === sessionIdParam ? sessionId : null

  useEffect(() => {
    if (!active) return

    let cancelled = false
    listParticipants(active).then((rows) => {
      if (cancelled) return
      setParticipants(rows)
      fetchCurrentDealer(active).then((dealerId) => {
        if (cancelled) return
        if (dealerId) {
          setCurrentDealerId(dealerId)
        } else {
          const host = rows.find((p) => p.is_host)
          setCurrentDealerId(host?.id ?? null)
        }
      })
    })
    fetchSessionById(active).then((session) => {
      if (!cancelled && session?.status === 'ended') setEnded(true)
    })
    listCardDrawnEvents(active).then((events) => {
      if (!cancelled) setCardDrawnHistory(events)
    })

    const applyEvent = (event: SessionEvent) => {
      if (event.type === 'session_ended') {
        setEnded(true)
        return
      }
      if (event.type === 'turn_passed') {
        setCurrentDealerId(event.payload.next_participant_id)
        setCard(null)
        return
      }
      if (event.type === 'card_drawn') {
        const payload = event.payload
        let shouldFetchText = true
        setCard((prev) => {
          if (prev && prev.payload.card_id === payload.card_id) {
            if (prev.text) shouldFetchText = false
            return prev
          }
          return { payload, text: null }
        })
        setCardDrawnHistory((prev) =>
          prev.some((e) => e.id === event.id) ? prev : [...prev, event],
        )
        if (!shouldFetchText) return
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
            // Leave skeleton; silent failure.
          })
      }
    }
    applyEventRef.current = applyEvent

    const unsubParticipants = subscribeToParticipants(active, (p) => {
      setParticipants((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]))
    })

    const unsubEvents = subscribeToSessionEvents(active, applyEvent)

    return () => {
      cancelled = true
      unsubParticipants()
      unsubEvents()
    }
  }, [active])

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

  async function handlePick(guestId: string) {
    if (!active || !participantId) return
    const event = await drawAction.run(active, participantId, guestId)
    if (event) applyEventRef.current(event)
  }

  async function handleSkip() {
    if (!active || !participantId) return
    const event = await skipAction.run(active, participantId)
    if (event) applyEventRef.current(event)
  }

  async function handlePass() {
    if (!active || !participantId || !card) return
    const event = await passAction.run(
      active,
      participantId,
      card.payload.target_participant_id,
    )
    if (event) applyEventRef.current(event)
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
      ) : (
        <p className="text-muted-foreground">Wachten op de dealer…</p>
      )}
    </div>
  )
}
