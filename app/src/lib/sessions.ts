import { supabase } from '@/lib/supabase'
import type { CEFRLevel, Language } from '@/lib/languages'

export type HostedSession = {
  session: { id: string; title: string }
  participant: { id: string }
}

export type SessionStatus = 'waiting' | 'active' | 'ended'

export type Session = {
  id: string
  title: string
  target_language: Language
  host_native_language: Language
  status: SessionStatus
  ended_at: string | null
}

type BaseSessionEvent = {
  id: string
  session_id: string
  actor_participant_id: string | null
  turn_number: number | null
  created_at: string
}

export type CardDrawnPayload = {
  card_id: string
  target_participant_id: string
  practice_language: Language
  native_language: Language
}

export type CardDrawnEvent = BaseSessionEvent & {
  type: 'card_drawn'
  payload: CardDrawnPayload
}

export type SessionEvent =
  | (BaseSessionEvent & { type: 'session_started'; payload: Record<string, never> })
  | CardDrawnEvent
  | (BaseSessionEvent & {
      type: 'session_ended'
      payload: { reason: 'host' | 'inactivity' }
    })
  | (BaseSessionEvent & { type: 'card_skipped'; payload: { card_id: string } })
  | (BaseSessionEvent & {
      type: 'turn_passed'
      payload: { next_participant_id: string }
    })

export type Participant = {
  id: string
  session_id: string
  display_name: string
  native_language: Language
  proficiency_levels: CEFRLevel[]
  is_host: boolean
  joined_at: string
}

export type JoinContext = {
  session: Session
  hostNativeLanguage: Language
}

export class NameTakenError extends Error {
  constructor(name: string) {
    super(`Display name "${name}" is already taken in this session`)
    this.name = 'NameTakenError'
  }
}

type CreateHostedSessionParams = {
  title: string
  hostDisplayName: string
  targetLanguage: Language
  hostNativeLanguage: Language
  hostProficiencyLevels: CEFRLevel[]
}

export async function createHostedSession({
  title,
  hostDisplayName,
  targetLanguage,
  hostNativeLanguage,
  hostProficiencyLevels,
}: CreateHostedSessionParams): Promise<HostedSession> {
  const { data, error } = await supabase
    .rpc('create_hosted_session', {
      p_title: title,
      p_host_display_name: hostDisplayName,
      p_target_language: targetLanguage,
      p_host_native_language: hostNativeLanguage,
      p_host_proficiency_levels: hostProficiencyLevels,
    })
    .single<{ session_id: string; participant_id: string }>()

  if (error || !data) {
    if (error?.code === '23505') {
      throw new NameTakenError(hostDisplayName)
    }
    throw new Error(error?.message ?? 'Failed to create session')
  }

  return {
    session: { id: data.session_id, title },
    participant: { id: data.participant_id },
  }
}

export async function fetchSessionById(id: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, target_language, host_native_language, status, ended_at')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as Session | null
}

export async function endSession(
  sessionId: string,
  reason: 'host' | 'inactivity',
  actorParticipantId: string,
): Promise<void> {
  const { error } = await supabase.rpc('end_session', {
    p_session_id: sessionId,
    p_reason: reason,
    p_actor_participant_id: actorParticipantId,
  })
  if (error) throw new Error(error.message)
}

export async function startSession(
  sessionId: string,
  actorParticipantId: string,
): Promise<void> {
  const { error } = await supabase.rpc('start_session', {
    p_session_id: sessionId,
    p_actor_participant_id: actorParticipantId,
  })
  if (error) throw new Error(error.message)
}

export async function drawCard(
  sessionId: string,
  actorParticipantId: string,
  targetParticipantId: string,
): Promise<void> {
  const { error } = await supabase.rpc('draw_card', {
    p_session_id: sessionId,
    p_actor_participant_id: actorParticipantId,
    p_target_participant_id: targetParticipantId,
  })
  if (error) throw new Error(error.message)
}

export async function skipCard(
  sessionId: string,
  actorParticipantId: string,
): Promise<void> {
  const { error } = await supabase.rpc('skip_card', {
    p_session_id: sessionId,
    p_actor_participant_id: actorParticipantId,
  })
  if (error) throw new Error(error.message)
}

export async function passTurn(
  sessionId: string,
  actorParticipantId: string,
  nextParticipantId: string,
): Promise<void> {
  const { error } = await supabase.rpc('pass_turn', {
    p_session_id: sessionId,
    p_actor_participant_id: actorParticipantId,
    p_next_participant_id: nextParticipantId,
  })
  if (error) throw new Error(error.message)
}

export async function fetchCurrentDealer(sessionId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('session_events')
    .select('payload')
    .eq('session_id', sessionId)
    .eq('type', 'turn_passed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  const payload = data.payload as { next_participant_id?: string } | null
  return payload?.next_participant_id ?? null
}

export async function listCardDrawnEvents(sessionId: string): Promise<CardDrawnEvent[]> {
  const { data, error } = await supabase
    .from('session_events')
    .select('id, session_id, type, payload, actor_participant_id, turn_number, created_at')
    .eq('session_id', sessionId)
    .eq('type', 'card_drawn')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as CardDrawnEvent[]
}

// Returns the set of participant ids who have been target at least once in
// the current round. A round has exactly N target slots (N = participant
// count); consecutive same-target events (skips) collapse into one slot.
// When `distinctTargetCount % N === 0`, the round just closed and the next
// one starts fresh — returns an empty set.
export function computeAskedThisRound(
  events: CardDrawnEvent[],
  participantCount: number,
): Set<string> {
  if (participantCount <= 0) return new Set()

  const distinctTargets: string[] = []
  let prev: string | null = null
  for (const e of events) {
    const target = e.payload.target_participant_id
    if (target !== prev) {
      distinctTargets.push(target)
      prev = target
    }
  }

  const slotsThisRound = distinctTargets.length % participantCount
  if (slotsThisRound === 0) return new Set()
  return new Set(distinctTargets.slice(-slotsThisRound))
}

export async function fetchCardWithTranslations(
  cardId: string,
  practiceLanguage: Language,
  nativeLanguage: Language,
): Promise<{ practice: string; native: string }> {
  const { data, error } = await supabase
    .from('card_translations')
    .select('language, translation')
    .eq('card_id', cardId)
    .in('language', [practiceLanguage, nativeLanguage])

  if (error) throw new Error(error.message)

  const byLang = new Map<string, string>(
    (data ?? []).map((row) => [row.language as string, row.translation as string]),
  )
  const practice = byLang.get(practiceLanguage)
  const native = byLang.get(nativeLanguage)
  if (!practice || !native) {
    throw new Error('Missing translation for card')
  }
  return { practice, native }
}

export function subscribeToSessionEvents(
  sessionId: string,
  onInsert: (event: SessionEvent) => void,
): () => void {
  const channel = supabase
    .channel(`session:${sessionId}:events`)
    .on('broadcast', { event: 'insert' }, (msg) =>
      onInsert(msg.payload as SessionEvent),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function fetchJoinContext(sessionId: string): Promise<JoinContext | null> {
  const session = await fetchSessionById(sessionId)
  if (!session) return null
  return { session, hostNativeLanguage: session.host_native_language }
}

export async function isHostOfSession(
  sessionId: string,
  participantId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('participants')
    .select('id')
    .eq('session_id', sessionId)
    .eq('id', participantId)
    .eq('is_host', true)
    .maybeSingle()

  if (error) return false
  return !!data
}

type CreateParticipantParams = {
  sessionId: string
  displayName: string
  nativeLanguage: Language
  proficiencyLevels: CEFRLevel[]
}

export async function createParticipant({
  sessionId,
  displayName,
  nativeLanguage,
  proficiencyLevels,
}: CreateParticipantParams): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('participants')
    .insert({
      session_id: sessionId,
      display_name: displayName,
      native_language: nativeLanguage,
      proficiency_levels: proficiencyLevels,
      is_host: false,
    })
    .select('id')
    .single()

  if (error || !data) {
    if (error?.code === '23505') {
      throw new NameTakenError(displayName)
    }
    throw new Error(error?.message ?? 'Failed to join session')
  }

  return data
}

export async function listParticipants(sessionId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select('id, session_id, display_name, native_language, proficiency_levels, is_host, joined_at')
    .eq('session_id', sessionId)
    .order('joined_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as Participant[]
}

export function subscribeToParticipants(
  sessionId: string,
  onInsert: (participant: Participant) => void,
): () => void {
  const channel = supabase
    .channel(`session:${sessionId}:participants`)
    .on('broadcast', { event: 'insert' }, (msg) =>
      onInsert(msg.payload as Participant),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}