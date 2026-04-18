import { supabase } from '@/lib/supabase'
import type { CEFRLevel, Language } from '@/lib/languages'

export type HostedSession = {
  session: { id: string; title: string }
  participant: { id: string }
}

export type Session = {
  id: string
  title: string
  target_language: Language
}

export type Participant = {
  id: string
  session_id: string
  display_name: string
  native_language: Language
  proficiency_level: CEFRLevel
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
  targetLanguage: Language
  hostNativeLanguage: Language
  hostProficiencyLevel: CEFRLevel
}

export async function createHostedSession({
  title,
  targetLanguage,
  hostNativeLanguage,
  hostProficiencyLevel,
}: CreateHostedSessionParams): Promise<HostedSession> {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({ title, target_language: targetLanguage })
    .select('id, title')
    .single()

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? 'Failed to create session')
  }

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .insert({
      session_id: session.id,
      display_name: 'Host',
      native_language: hostNativeLanguage,
      proficiency_level: hostProficiencyLevel,
      is_host: true,
    })
    .select('id')
    .single()

  if (participantError || !participant) {
    throw new Error(participantError?.message ?? 'Failed to create host participant')
  }

  return { session, participant }
}

export async function fetchSessionById(id: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, target_language')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as Session | null
}

export async function fetchJoinContext(sessionId: string): Promise<JoinContext | null> {
  const session = await fetchSessionById(sessionId)
  if (!session) return null

  const { data: host, error } = await supabase
    .from('participants')
    .select('native_language')
    .eq('session_id', sessionId)
    .eq('is_host', true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!host) return null

  return { session, hostNativeLanguage: host.native_language as Language }
}

type CreateParticipantParams = {
  sessionId: string
  displayName: string
  nativeLanguage: Language
  proficiencyLevel: CEFRLevel
}

export async function createParticipant({
  sessionId,
  displayName,
  nativeLanguage,
  proficiencyLevel,
}: CreateParticipantParams): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('participants')
    .insert({
      session_id: sessionId,
      display_name: displayName,
      native_language: nativeLanguage,
      proficiency_level: proficiencyLevel,
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
    .select('id, session_id, display_name, native_language, proficiency_level, is_host, joined_at')
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
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'participants',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => onInsert(payload.new as Participant),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}