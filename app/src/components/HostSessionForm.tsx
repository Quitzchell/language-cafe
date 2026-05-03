import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { friendlyMessage } from '@/lib/errors'
import type { CEFRLevel, Language } from '@/lib/languages'
import { createHostedSession, type HostedSession } from '@/lib/sessions'

type Props = {
  targetLanguage: Language
  hostNativeLanguage: Language
  hostProficiencyLevels: CEFRLevel[]
  onCreated: (result: HostedSession) => void
}

export function HostSessionForm({
  targetLanguage,
  hostNativeLanguage,
  hostProficiencyLevels,
  onCreated,
}: Props) {
  const [title, setTitle] = useState('')
  const [hostDisplayName, setHostDisplayName] = useState('')
  const { loading, error, run } = useAsync(createHostedSession)

  const canSubmit = !!title.trim() && !!hostDisplayName.trim() && !loading

  async function handleSubmit() {
    if (!canSubmit) return
    const result = await run({
      title: title.trim(),
      hostDisplayName: hostDisplayName.trim(),
      targetLanguage,
      hostNativeLanguage,
      hostProficiencyLevels,
    })
    if (result) onCreated(result)
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-xs">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Session title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
          className="border border-input bg-background rounded-md h-10 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="e.g. Tuesday evening café"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Your name</span>
        <input
          type="text"
          value={hostDisplayName}
          onChange={(e) => setHostDisplayName(e.target.value)}
          disabled={loading}
          className="border border-input bg-background rounded-md h-10 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="e.g. Mitchell"
        />
      </label>
      <Button size="lg" disabled={!canSubmit} onClick={handleSubmit}>
        {loading ? 'Creating…' : 'Continue'}
      </Button>
      {error && <p className="text-sm text-destructive">{friendlyMessage(error)}</p>}
    </div>
  )
}
