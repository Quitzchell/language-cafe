import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useSession, type Language } from '@/contexts/SessionContext'

export function NativeLanguageSelect() {
  const { setNativeLanguage } = useSession()
  const navigate = useNavigate()

  function handleSelect(language: Language) {
    setNativeLanguage(language)
    navigate('/home')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <h1 className="text-3xl font-semibold">What is your native language?</h1>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button size="lg" onClick={() => handleSelect('Dutch')}>
          Nederlands
        </Button>
        <Button size="lg" onClick={() => handleSelect('Japanese')}>
          日本語
        </Button>
      </div>
    </div>
  )
}