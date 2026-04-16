import { useSession } from '@/contexts/SessionContext'

export function SessionHostStub() {
  const { sessionId, sessionTitle } = useSession()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">Session created</h1>
      <p className="text-muted-foreground">
        Title: <strong>{sessionTitle}</strong>
      </p>
      <p className="text-muted-foreground text-sm">
        Session id: <code>{sessionId}</code>
      </p>
      <p className="text-muted-foreground text-sm italic">QR screen coming in LC-5.</p>
    </div>
  )
}