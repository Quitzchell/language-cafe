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
  hasTurnPassedAfter,
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

    let unsubParticipants: (() => void) | null = null
    let unsubEvents: (() => void) | null = null

    const subscribe = () => {
      unsubParticipants = subscribeToParticipants(sessionId, (p) => {
        setParticipants((prev) =>
          prev.some((x) => x.id === p.id) ? prev : [...prev, p],
        )
      })
      unsubEvents = subscribeToSessionEvents(sessionId, applyEvent)
    }

    const refetch = () => {
      fetchSessionById(sessionId).then((s) => {
        if (cancelledRef.current) return
        setSession(s)
        setSessionLoaded(true)
        if (s?.status === 'ended') setEnded(true)
      })

      listParticipants(sessionId).then((rows) => {
        if (cancelledRef.current) return
        setParticipants(rows)
        fetchCurrentDealer(sessionId).then((dealerId) => {
          if (cancelledRef.current) return
          setCurrentDealerId(
            dealerId ?? rows.find((p) => p.is_host)?.id ?? null,
          )
        })
      })

      listCardDrawnEvents(sessionId).then(async (events) => {
        if (cancelledRef.current) return
        setCardDrawnHistory(events)
        const last = events[events.length - 1]
        if (!last) return
        if (await hasTurnPassedAfter(sessionId, last.created_at)) return
        if (cancelledRef.current) return
        const payload = last.payload
        setCard((prev) => prev ?? { payload, text: null })
        fetchCardWithTranslations(
          payload.card_id,
          payload.practice_language,
          payload.native_language,
        )
          .then((text) => {
            if (cancelledRef.current) return
            setCard((prev) =>
              prev && prev.payload.card_id === payload.card_id && !prev.text
                ? { payload, text }
                : prev,
            )
          })
          .catch(() => {
            // Leave skeleton; surface silently — matches applyEvent.
          })
      })
    }

    subscribe()
    refetch()

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      // Tear down stale channels and reopen — mobile OSes often kill the
      // websocket while the tab is backgrounded, and broadcasts that fired
      // during the gap are gone, so we also refetch from the DB to catch up.
      unsubParticipants?.()
      unsubEvents?.()
      subscribe()
      refetch()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelledRef.current = true
      unsubParticipants?.()
      unsubEvents?.()
      document.removeEventListener('visibilitychange', onVisibility)
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
