import { createContext, useContext, useState, type ReactNode } from 'react'

export type Language = 'Dutch' | 'Japanese'
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

type SessionState = {
  nativeLanguage: Language | null
  targetLanguage: Language | null
  proficiencyLevel: CEFRLevel | null
  setNativeLanguage: (language: Language) => void
  setTarget: (language: Language, level: CEFRLevel) => void
}

const SessionContext = createContext<SessionState | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [nativeLanguage, setNativeLanguage] = useState<Language | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<Language | null>(null)
  const [proficiencyLevel, setProficiencyLevel] = useState<CEFRLevel | null>(null)

  function setTarget(language: Language, level: CEFRLevel) {
    setTargetLanguage(language)
    setProficiencyLevel(level)
  }

  return (
    <SessionContext.Provider
      value={{
        nativeLanguage,
        targetLanguage,
        proficiencyLevel,
        setNativeLanguage,
        setTarget,
      }}
    >
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