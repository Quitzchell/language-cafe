import type { CEFRLevel, Language } from '@/lib/languages'
import type { Participant, Session, SessionEvent } from '@/lib/sessions'

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
    proficiency_level: 'B1' as CEFRLevel,
    is_host: false,
    joined_at: '2026-04-18T10:00:00.000Z',
    ...overrides,
  }
}

export function makeEvent(overrides: Partial<SessionEvent> = {}): SessionEvent {
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
