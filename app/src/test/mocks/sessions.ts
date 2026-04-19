import type { CEFRLevel, Language } from '@/lib/languages'
import type {
  CardDrawnPayload,
  Participant,
  Session,
  SessionEvent,
} from '@/lib/sessions'

export function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    title: 'Test session',
    target_language: 'Japanese' as Language,
    host_native_language: 'Dutch' as Language,
    status: 'waiting',
    ended_at: null,
    ...overrides,
  }
}

export function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 'participant-1',
    session_id: 'session-1',
    display_name: 'Alice',
    native_language: 'Dutch' as Language,
    proficiency_levels: ['B1'] as CEFRLevel[],
    is_host: false,
    joined_at: '2026-04-18T10:00:00.000Z',
    ...overrides,
  }
}

export function makeSessionEndedEvent(
  overrides: Partial<
    Extract<SessionEvent, { type: 'session_ended' }>
  > = {},
): SessionEvent {
  return {
    id: 'event-1',
    session_id: 'session-1',
    type: 'session_ended',
    payload: { reason: 'host' },
    actor_participant_id: null,
    turn_number: null,
    created_at: '2026-04-18T10:05:00.000Z',
    ...overrides,
  }
}

export function makeSessionStartedEvent(
  overrides: Partial<
    Extract<SessionEvent, { type: 'session_started' }>
  > = {},
): SessionEvent {
  return {
    id: 'event-2',
    session_id: 'session-1',
    type: 'session_started',
    payload: {},
    actor_participant_id: null,
    turn_number: null,
    created_at: '2026-04-18T10:05:00.000Z',
    ...overrides,
  }
}

export function makeCardDrawnEvent(
  payloadOverrides: Partial<CardDrawnPayload> = {},
  overrides: Partial<Extract<SessionEvent, { type: 'card_drawn' }>> = {},
): SessionEvent {
  return {
    id: 'event-3',
    session_id: 'session-1',
    type: 'card_drawn',
    payload: {
      card_id: 'card-1',
      target_participant_id: 'participant-1',
      practice_language: 'Japanese' as Language,
      native_language: 'Dutch' as Language,
      ...payloadOverrides,
    },
    actor_participant_id: 'host-1',
    turn_number: 1,
    created_at: '2026-04-18T10:05:00.000Z',
    ...overrides,
  }
}

export function makeCardSkippedEvent(
  payloadOverrides: Partial<{ card_id: string }> = {},
  overrides: Partial<Extract<SessionEvent, { type: 'card_skipped' }>> = {},
): SessionEvent {
  return {
    id: 'event-4',
    session_id: 'session-1',
    type: 'card_skipped',
    payload: {
      card_id: 'card-1',
      ...payloadOverrides,
    },
    actor_participant_id: 'host-1',
    turn_number: 1,
    created_at: '2026-04-18T10:06:00.000Z',
    ...overrides,
  }
}

export function makeTurnPassedEvent(
  payloadOverrides: Partial<{ next_participant_id: string }> = {},
  overrides: Partial<Extract<SessionEvent, { type: 'turn_passed' }>> = {},
): SessionEvent {
  return {
    id: 'event-5',
    session_id: 'session-1',
    type: 'turn_passed',
    payload: {
      next_participant_id: 'participant-1',
      ...payloadOverrides,
    },
    actor_participant_id: 'host-1',
    turn_number: 1,
    created_at: '2026-04-18T10:07:00.000Z',
    ...overrides,
  }
}
