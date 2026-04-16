import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { createHostedSession, type HostedSession } from '@/lib/sessions'
import type { CEFRLevel, Language } from '@/contexts/SessionContext'

type Props = {
  targetLanguage: Language
  hostNativeLanguage: Language
  hostProficiencyLevel: CEFRLevel
  onCreated: (result: HostedSession) => void
}

export function HostSessionForm({
  targetLanguage,
  hostNativeLanguage,
  hostProficiencyLevel,
  onCreated,
}: Props) {
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!title.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const result = await createHostedSession({
        title: title.trim(),
        targetLanguage,
        hostNativeLanguage,
        hostProficiencyLevel,
      })
      onCreated(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
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
      <Button size="lg" disabled={!title.trim() || submitting} onClick={handleSubmit}>
        {submitting ? 'Creating…' : 'Doorgaan'}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}