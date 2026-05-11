import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/SessionContext'
import { LANGUAGES, type Language } from '@/lib/languages'

export function NativeLanguageSelect() {
  const { setNativeLanguage } = useSession()
  const navigate = useNavigate()

  function handleSelect(language: Language) {
    setNativeLanguage(language)
    navigate('/target')
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-8 px-4">
      <h1 className="text-3xl font-semibold">What is your native language?</h1>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {LANGUAGES.map((language) => (
          <Button key={language.code} size="lg" onClick={() => handleSelect(language.code)}>
            {language.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
