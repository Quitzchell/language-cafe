import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { DealerCardView } from '@/components/DealerView'
import {
  fetchCardWithTranslations,
  fetchCurrentDealer,
  fetchSessionById,
  listCardDrawnEvents,
  listParticipants,
  subscribeToParticipants,
  subscribeToSessionEvents,
  type CardDrawnEvent,
  type Participant,
  type Session,
  type SessionEvent,
} from '@/lib/sessions'

type SessionLiveValue = {
  session: Session | null
  sessionLoaded: boolean
  participants: Participant[]
  card: DealerCardView | null
  currentDealerId: string | null
  cardDrawnHistory: CardDrawnEvent[]
  ended: boolean
}

const SessionLiveContext = createContext<SessionLiveValue | null>(null)

export function SessionLiveProvider({
  sessionId,
  children,
}: {
  sessionId: string
  children: ReactNode
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [card, setCard] = useState<DealerCardView | null>(null)
  const [currentDealerId, setCurrentDealerId] = useState<string | null>(null)
  const [cardDrawnHistory, setCardDrawnHistory] = useState<CardDrawnEvent[]>([])
  const [ended, setEnded] = useState(false)
  const cancelledRef = useRef(false)

  const applyEvent = useCallback((event: SessionEvent) => {
    if (event.type === 'session_ended') {
      setEnded(true)
      setSession((prev) => (prev ? { ...prev, status: 'ended' } : prev))
      return
    }
    if (event.type === 'session_started') {
      setSession((prev) => (prev ? { ...prev, status: 'active' } : prev))
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
          if (cancelledRef.current) return
          setCard((prev) =>
            prev && prev.payload.card_id === payload.card_id
              ? { payload, text }
              : prev,
          )
        })
        .catch(() => {
          // Leave skeleton; surface silently.
        })
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false

    const unsubParticipants = subscribeToParticipants(sessionId, (p) => {
      setParticipants((prev) =>
        prev.some((x) => x.id === p.id) ? prev : [...prev, p],
      )
    })
    const unsubEvents = subscribeToSessionEvents(sessionId, applyEvent)

    fetchSessionById(sessionId).then((s) => {
      if (cancelledRef.current) return
      setSession(s)
      setSessionLoaded(true)
      if (s?.status === 'ended') setEnded(true)
    })

    listParticipants(sessionId).then((rows) => {
      if (cancelledRef.current) return
      setParticipants(rows)
      // Default dealer to the host when no turn_passed has landed yet.
      fetchCurrentDealer(sessionId).then((dealerId) => {
        if (cancelledRef.current) return
        setCurrentDealerId(
          dealerId ?? rows.find((p) => p.is_host)?.id ?? null,
        )
      })
    })

    listCardDrawnEvents(sessionId).then((events) => {
      if (cancelledRef.current) return
      setCardDrawnHistory(events)
    })

    return () => {
      cancelledRef.current = true
      unsubParticipants()
      unsubEvents()
    }
  }, [sessionId, applyEvent])

  return (
    <SessionLiveContext.Provider
      value={{
        session,
        sessionLoaded,
        participants,
        card,
        currentDealerId,
        cardDrawnHistory,
        ended,
      }}
    >
      {children}
    </SessionLiveContext.Provider>
  )
}

export function useSessionLive() {
  const ctx = useContext(SessionLiveContext)
  if (!ctx) {
    throw new Error('useSessionLive must be used within a SessionLiveProvider')
  }
  return ctx
}
