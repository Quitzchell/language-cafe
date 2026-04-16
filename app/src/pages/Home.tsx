import { useSession } from '@/contexts/SessionContext'

export function Home() {
  const { nativeLanguage, targetLanguage, proficiencyLevel } = useSession()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">Welcome</h1>
      <p className="text-muted-foreground">
        Native language: <strong>{nativeLanguage}</strong>
      </p>
      <p className="text-muted-foreground">
        Practising: <strong>{targetLanguage}</strong> at <strong>{proficiencyLevel}</strong>
      </p>
    </div>
  )
}