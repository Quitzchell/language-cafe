import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/SessionContext'
import {
  LANGUAGE_CODES,
  LANGUAGE_LABELS,
  levelsForLanguage,
  toCEFRLevels,
  type CEFRLevel,
  type JLPTLevel,
  type Language,
} from '@/lib/languages'

type InputLevel = CEFRLevel | JLPTLevel

export function TargetLanguageSelect() {
  const { nativeLanguage, setTarget } = useSession()
  const navigate = useNavigate()
  const [target, setTargetLanguage] = useState<Language | null>(null)
  const [selected, setSelected] = useState<InputLevel[]>([])

  const availableTargets = LANGUAGE_CODES.filter((l) => l !== nativeLanguage)

  function handleTarget(language: Language) {
    setTargetLanguage(language)
    setSelected([])
  }

  function toggleLevel(level: InputLevel) {
    setSelected((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    )
  }

  function handleContinue() {
    if (!target || selected.length === 0) return
    setTarget(target, toCEFRLevels(target, selected))
    navigate('/mode')
  }

  const levels = target ? levelsForLanguage(target) : []

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-8 px-4 py-12">
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
          <h2 className="text-2xl font-semibold">Pick your level(s)</h2>
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
            {levels.map((l) => (
              <Button
                key={l}
                size="lg"
                variant={selected.includes(l) ? 'default' : 'outline'}
                onClick={() => toggleLevel(l)}
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
        disabled={!target || selected.length === 0}
        onClick={handleContinue}
      >
        Continue
      </Button>
    </div>
  )
}
