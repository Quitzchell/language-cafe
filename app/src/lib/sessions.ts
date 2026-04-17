import { supabase } from '@/lib/supabase'
import type { CEFRLevel, Language } from '@/contexts/SessionContext'

export type HostedSession = {
  session: { id: string; title: string }
  participant: { id: string }
}

export type Session = {
  id: string
  title: string
  target_language: string
}

export type Participant = {
  id: string
  session_id: string
  display_name: string
  is_host: boolean
  joined_at: string
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
  return data
}

export async function listParticipants(sessionId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select('id, session_id, display_name, is_host, joined_at')
    .eq('session_id', sessionId)
    .order('joined_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
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