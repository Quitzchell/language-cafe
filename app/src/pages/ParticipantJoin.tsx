import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/SessionContext'
import {
  LANGUAGES,
  LANGUAGE_LABELS,
  levelsForLanguage,
  matchesSessionLanguages,
  toCEFR,
  type CEFRLevel,
  type JLPTLevel,
  type Language,
} from '@/lib/languages'
import {
  createParticipant,
  fetchJoinContext,
  NameTakenError,
  type JoinContext,
} from '@/lib/sessions'

export function ParticipantJoin() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { setMultiplayer } = useSession()

  const [context, setContext] = useState<JoinContext | null>(null)
  const [loading, setLoading] = useState(!!sessionId)

  const [displayName, setDisplayName] = useState('')
  const [native, setNative] = useState<Language | null>(null)
  const [level, setLevel] = useState<CEFRLevel | JLPTLevel | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    fetchJoinContext(sessionId)
      .then(setContext)
      .catch(() => setContext(null))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!context || !sessionId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 px-4">
        <h1 className="text-2xl font-semibold">Session not found</h1>
        <p className="text-sm text-muted-foreground">
          Double-check the link and try again.
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
    setLevel(null)
    setError(null)
  }

  async function handleSubmit() {
    if (!sessionId || !native || !level || !nativeMatches || !practiceLanguage) return
    const trimmed = displayName.trim()
    if (!trimmed) return

    setSubmitting(true)
    setError(null)
    try {
      const participant = await createParticipant({
        sessionId,
        displayName: trimmed,
        nativeLanguage: native,
        proficiencyLevel: toCEFR(practiceLanguage, level),
      })
      setMultiplayer(sessionId, session.title, participant.id)
      navigate(`/join/${sessionId}/waiting`)
    } catch (e) {
      if (e instanceof NameTakenError) {
        setError('Die naam is al bezet. Kies een andere.')
      } else {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
      setSubmitting(false)
    }
  }

  const canSubmit =
    !!displayName.trim() && nativeMatches && level !== null && !submitting

  return (
    <div className="min-h-screen flex flex-col items-center gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">{session.title}</h1>

      <label className="flex flex-col gap-2 w-full max-w-xs">
        <span className="text-sm font-medium">Your name</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={submitting}
          className="border border-input bg-background rounded-md h-10 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="e.g. Yuki"
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
            disabled={submitting}
          >
            {language.label}
          </Button>
        ))}
      </div>

      {native && !nativeMatches && (
        <p className="text-sm text-destructive text-center max-w-xs">
          Deze taal wordt nog niet ondersteund in deze sessie.
        </p>
      )}

      {nativeMatches && practiceLanguage && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <h2 className="text-lg font-medium">
            Your level in {LANGUAGE_LABELS[practiceLanguage]}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {levels.map((l) => (
              <Button
                key={l}
                size="lg"
                variant={level === l ? 'default' : 'outline'}
                onClick={() => setLevel(l)}
                disabled={submitting}
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
        {submitting ? 'Joining…' : 'Join session'}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
