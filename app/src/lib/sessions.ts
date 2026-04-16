import { supabase } from '@/lib/supabase'
import type { CEFRLevel, Language } from '@/contexts/SessionContext'

export type HostedSession = {
  session: { id: string; title: string }
  participant: { id: string }
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