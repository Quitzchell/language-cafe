import { createContext, useContext, useState, type ReactNode } from 'react'

export type Language = 'Dutch' | 'Japanese'
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type PlayMode = 'solo' | 'multiplayer'

type SessionState = {
  nativeLanguage: Language | null
  targetLanguage: Language | null
  proficiencyLevel: CEFRLevel | null
  mode: PlayMode | null
  sessionId: string | null
  sessionTitle: string | null
  participantId: string | null
  setNativeLanguage: (language: Language) => void
  setTarget: (language: Language, level: CEFRLevel) => void
  setSolo: () => void
  setMultiplayer: (sessionId: string, sessionTitle: string, participantId: string) => void
}

const SessionContext = createContext<SessionState | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [nativeLanguage, setNativeLanguage] = useState<Language | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<Language | null>(null)
  const [proficiencyLevel, setProficiencyLevel] = useState<CEFRLevel | null>(null)
  const [mode, setMode] = useState<PlayMode | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionTitle, setSessionTitle] = useState<string | null>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)

  function setTarget(language: Language, level: CEFRLevel) {
    setTargetLanguage(language)
    setProficiencyLevel(level)
  }

  function setSolo() {
    setMode('solo')
    setSessionId(null)
    setSessionTitle(null)
    setParticipantId(null)
  }

  function setMultiplayer(newSessionId: string, newTitle: string, newParticipantId: string) {
    setMode('multiplayer')
    setSessionId(newSessionId)
    setSessionTitle(newTitle)
    setParticipantId(newParticipantId)
  }

  return (
    <SessionContext.Provider
      value={{
        nativeLanguage,
        targetLanguage,
        proficiencyLevel,
        mode,
        sessionId,
        sessionTitle,
        participantId,
        setNativeLanguage,
        setTarget,
        setSolo,
        setMultiplayer,
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