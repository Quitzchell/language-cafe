import { useSession } from '@/contexts/SessionContext'

export function Home() {
  const { nativeLanguage } = useSession()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">Welcome</h1>
      <p className="text-muted-foreground">
        Your native language is set to: <strong>{nativeLanguage}</strong>
      </p>
    </div>
  )
}