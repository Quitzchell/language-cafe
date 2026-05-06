import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import type { CEFRLevel, Language } from '@/lib/languages'

type PersistedSession = {
  nativeLanguage: Language | null
  targetLanguage: Language | null
  proficiencyLevels: CEFRLevel[]
  sessionId: string | null
  sessionTitle: string | null
  participantId: string | null
}

type SessionState = PersistedSession & {
  setNativeLanguage: (language: Language) => void
  setTarget: (language: Language, levels: CEFRLevel[]) => void
  setMultiplayer: (sessionId: string, sessionTitle: string, participantId: string) => void
}

const STORAGE_KEY = 'lc:session:v1'

const EMPTY: PersistedSession = {
  nativeLanguage: null,
  targetLanguage: null,
  proficiencyLevels: [],
  sessionId: null,
  sessionTitle: null,
  participantId: null,
}

function readPersisted(): PersistedSession {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<PersistedSession>) }
  } catch {
    return EMPTY
  }
}

const SessionContext = createContext<SessionState | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const initial = readPersisted()

  const [nativeLanguage, setNativeLanguage] = useState<Language | null>(initial.nativeLanguage)
  const [targetLanguage, setTargetLanguage] = useState<Language | null>(initial.targetLanguage)
  const [proficiencyLevels, setProficiencyLevels] = useState<CEFRLevel[]>(initial.proficiencyLevels)
  const [sessionId, setSessionId] = useState<string | null>(initial.sessionId)
  const [sessionTitle, setSessionTitle] = useState<string | null>(initial.sessionTitle)
  const [participantId, setParticipantId] = useState<string | null>(initial.participantId)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const payload: PersistedSession = {
      nativeLanguage,
      targetLanguage,
      proficiencyLevels,
      sessionId,
      sessionTitle,
      participantId,
    }
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // sessionStorage can throw in private mode; state still lives in memory.
    }
  }, [nativeLanguage, targetLanguage, proficiencyLevels, sessionId, sessionTitle, participantId])

  function setTarget(language: Language, levels: CEFRLevel[]) {
    setTargetLanguage(language)
    setProficiencyLevels(levels)
  }

  function setMultiplayer(newSessionId: string, newTitle: string, newParticipantId: string) {
    setSessionId(newSessionId)
    setSessionTitle(newTitle)
    setParticipantId(newParticipantId)
  }

  return (
    <SessionContext.Provider
      value={{
        nativeLanguage,
        targetLanguage,
        proficiencyLevels,
        sessionId,
        sessionTitle,
        participantId,
        setNativeLanguage,
        setTarget,
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