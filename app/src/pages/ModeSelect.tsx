import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/SessionContext'
import { supabase } from '@/lib/supabase'

export function ModeSelect() {
  const { nativeLanguage, targetLanguage, proficiencyLevel, setSolo, setMultiplayer } = useSession()
  const navigate = useNavigate()
  const [showTitleForm, setShowTitleForm] = useState(false)
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSolo() {
    setSolo()
    navigate('/play')
  }

  async function handleMultiplayer() {
    if (!title.trim() || !targetLanguage || !nativeLanguage || !proficiencyLevel) return
    setSubmitting(true)
    setError(null)

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({ title: title.trim(), target_language: targetLanguage })
      .select('id, title')
      .single()

    if (sessionError || !session) {
      setError(sessionError?.message ?? 'Failed to create session')
      setSubmitting(false)
      return
    }

    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert({
        session_id: session.id,
        display_name: 'Host',
        native_language: nativeLanguage,
        proficiency_level: proficiencyLevel,
        is_host: true,
      })
      .select('id')
      .single()

    if (participantError || !participant) {
      setError(participantError?.message ?? 'Failed to create host participant')
      setSubmitting(false)
      return
    }

    setMultiplayer(session.id, session.title, participant.id)
    navigate('/session')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">How do you want to play?</h1>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button size="lg" onClick={handleSolo}>
          Solo
        </Button>
        <Button
          size="lg"
          variant={showTitleForm ? 'default' : 'outline'}
          onClick={() => setShowTitleForm(true)}
        >
          Met anderen
        </Button>
      </div>

      {showTitleForm && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Session title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              className="border border-input bg-background rounded-md h-10 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="e.g. Tuesday evening café"
            />
          </label>
          <Button
            size="lg"
            disabled={!title.trim() || submitting}
            onClick={handleMultiplayer}
          >
            {submitting ? 'Creating…' : 'Doorgaan'}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  )
}