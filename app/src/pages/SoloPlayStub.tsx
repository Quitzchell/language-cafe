import { useSession } from '@/contexts/SessionContext'

export function SoloPlayStub() {
  const { nativeLanguage, targetLanguage, proficiencyLevels } = useSession()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">Solo play</h1>
      <p className="text-muted-foreground">
        Native language: <strong>{nativeLanguage}</strong>
      </p>
      <p className="text-muted-foreground">
        Practising: <strong>{targetLanguage}</strong> at{' '}
        <strong>{proficiencyLevels.join(', ')}</strong>
      </p>
      <p className="text-muted-foreground text-sm italic">Gameplay coming in LC-7.</p>
    </div>
  )
}
