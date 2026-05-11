import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/SessionContext'
import { useAsync } from '@/hooks/useAsync'
import { friendlyMessage } from '@/lib/errors'
import {
  LANGUAGES,
  LANGUAGE_LABELS,
  levelsForLanguage,
  matchesSessionLanguages,
  toCEFRLevels,
  type CEFRLevel,
  type JLPTLevel,
  type Language,
} from '@/lib/languages'
import { createParticipant, fetchJoinContext } from '@/lib/sessions'

type InputLevel = CEFRLevel | JLPTLevel

export function ParticipantJoin() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { setMultiplayer } = useSession()

  const loadContext = useAsync(fetchJoinContext)
  const submit = useAsync(createParticipant)

  const [displayName, setDisplayName] = useState('')
  const [native, setNative] = useState<Language | null>(null)
  const [selected, setSelected] = useState<InputLevel[]>([])

  const loadRun = loadContext.run
  useEffect(() => {
    if (sessionId) loadRun(sessionId)
  }, [sessionId, loadRun])

  if (loadContext.loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  const context = loadContext.data
  if (!context || !sessionId) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-2xl font-semibold">Session not found</h1>
        <p className="text-sm text-muted-foreground">
          Double-check the link and try again.
        </p>
      </div>
    )
  }

  if (context.session.status === 'ended') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-2xl font-semibold">This session has already ended</h1>
        <p className="text-sm text-muted-foreground">
          Ask the host to start a new session.
        </p>
      </div>
    )
  }

  const { session, hostNativeLanguage } = context
  const nativeMatches =
    native !== null &&
    matchesSessionLanguages(native, hostNativeLanguage, session.target_language)
  const practiceLanguage: Language | null = native
    ? native === hostNativeLanguage
      ? session.target_language
      : hostNativeLanguage
    : null
  const levels = practiceLanguage ? levelsForLanguage(practiceLanguage) : []

  function handleSelectNative(language: Language) {
    setNative(language)
    setSelected([])
  }

  function toggleLevel(level: InputLevel) {
    setSelected((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    )
  }

  async function handleSubmit() {
    if (!sessionId || !native || selected.length === 0 || !nativeMatches || !practiceLanguage)
      return
    const trimmed = displayName.trim()
    if (!trimmed) return

    const participant = await submit.run({
      sessionId,
      displayName: trimmed,
      nativeLanguage: native,
      proficiencyLevels: toCEFRLevels(practiceLanguage, selected),
    })
    if (participant) {
      setMultiplayer(sessionId, session.title, participant.id)
      navigate(`/join/${sessionId}/waiting`)
    }
  }

  const canSubmit =
    !!displayName.trim() && nativeMatches && selected.length > 0 && !submit.loading

  return (
    <div className="min-h-dvh flex flex-col items-center gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">{session.title}</h1>

      <label className="flex flex-col gap-2 w-full max-w-xs">
        <span className="text-sm font-medium">Your name</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={submit.loading}
          className="border border-input bg-background rounded-md h-10 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <h2 className="text-lg font-medium">What is your native language?</h2>
        {LANGUAGES.map((language) => (
          <Button
            key={language.code}
            size="lg"
            variant={native === language.code ? 'default' : 'outline'}
            onClick={() => handleSelectNative(language.code)}
            disabled={submit.loading}
          >
            {language.label}
          </Button>
        ))}
      </div>

      {native && !nativeMatches && (
        <p className="text-sm text-destructive text-center max-w-xs">
          This language isn't supported in this session yet.
        </p>
      )}

      {nativeMatches && practiceLanguage && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <h2 className="text-lg font-medium">
            Your level(s) in {LANGUAGE_LABELS[practiceLanguage]}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {levels.map((l) => (
              <Button
                key={l}
                size="lg"
                variant={selected.includes(l) ? 'default' : 'outline'}
                onClick={() => toggleLevel(l)}
                disabled={submit.loading}
              >
                {l}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Button
        size="lg"
        className="w-full max-w-xs"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {submit.loading ? 'Joining…' : 'Join session'}
      </Button>

      {submit.error && (
        <p className="text-sm text-destructive">{friendlyMessage(submit.error)}</p>
      )}
    </div>
  )
}
