import { createContext, useContext, useState, type ReactNode } from 'react'

export type Language = 'Dutch' | 'Japanese'

type SessionState = {
  nativeLanguage: Language | null
  setNativeLanguage: (language: Language) => void
}

const SessionContext = createContext<SessionState | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [nativeLanguage, setNativeLanguage] = useState<Language | null>(null)

  return (
    <SessionContext.Provider value={{ nativeLanguage, setNativeLanguage }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}