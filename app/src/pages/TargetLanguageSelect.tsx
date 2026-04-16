import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useSession, type CEFRLevel, type Language } from '@/contexts/SessionContext'

type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const JLPT_LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

const LANGUAGE_LABELS: Record<Language, string> = {
  Dutch: 'Nederlands',
  Japanese: '日本語',
}

const ALL_LANGUAGES: Language[] = ['Dutch', 'Japanese']

const JLPT_TO_CEFR: Record<JLPTLevel, CEFRLevel> = {
  N5: 'A1',
  N4: 'A2',
  N3: 'B1',
  N2: 'B2',
  N1: 'C1',
}

export function TargetLanguageSelect() {
  const { nativeLanguage, setTarget } = useSession()
  const navigate = useNavigate()
  const [target, setTargetLanguage] = useState<Language | null>(null)
  const [level, setLevel] = useState<CEFRLevel | JLPTLevel | null>(null)

  const availableTargets = ALL_LANGUAGES.filter((l) => l !== nativeLanguage)

  function handleTarget(language: Language) {
    setTargetLanguage(language)
    setLevel(null)
  }

  function handleContinue() {
    if (!target || !level) return
    const cefr = target === 'Japanese' ? JLPT_TO_CEFR[level as JLPTLevel] : (level as CEFRLevel)
    setTarget(target, cefr)
    navigate('/mode')
  }

  const levels = target === 'Japanese' ? JLPT_LEVELS : target === 'Dutch' ? CEFR_LEVELS : []

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">Which language do you want to practice?</h1>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        {availableTargets.map((language) => (
          <Button
            key={language}
            size="lg"
            variant={target === language ? 'default' : 'outline'}
            onClick={() => handleTarget(language)}
          >
            {LANGUAGE_LABELS[language]}
          </Button>
        ))}
      </div>

      {target && (
        <>
          <h2 className="text-2xl font-semibold">Pick your level</h2>
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
            {levels.map((l) => (
              <Button
                key={l}
                size="lg"
                variant={level === l ? 'default' : 'outline'}
                onClick={() => setLevel(l)}
              >
                {l}
              </Button>
            ))}
          </div>
        </>
      )}

      <Button
        size="lg"
        className="w-full max-w-xs"
        disabled={!target || !level}
        onClick={handleContinue}
      >
        Doorgaan
      </Button>
    </div>
  )
}
