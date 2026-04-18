import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import type { CEFRLevel, Language } from '@/lib/languages'

export type PlayMode = 'solo' | 'multiplayer'

type PersistedSession = {
  nativeLanguage: Language | null
  targetLanguage: Language | null
  proficiencyLevel: CEFRLevel | null
  mode: PlayMode | null
  sessionId: string | null
  sessionTitle: string | null
  participantId: string | null
}

type SessionState = PersistedSession & {
  setNativeLanguage: (language: Language) => void
  setTarget: (language: Language, level: CEFRLevel) => void
  setSolo: () => void
  setMultiplayer: (sessionId: string, sessionTitle: string, participantId: string) => void
}

const STORAGE_KEY = 'lc:session:v1'

const EMPTY: PersistedSession = {
  nativeLanguage: null,
  targetLanguage: null,
  proficiencyLevel: null,
  mode: null,
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
  const [proficiencyLevel, setProficiencyLevel] = useState<CEFRLevel | null>(initial.proficiencyLevel)
  const [mode, setMode] = useState<PlayMode | null>(initial.mode)
  const [sessionId, setSessionId] = useState<string | null>(initial.sessionId)
  const [sessionTitle, setSessionTitle] = useState<string | null>(initial.sessionTitle)
  const [participantId, setParticipantId] = useState<string | null>(initial.participantId)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const payload: PersistedSession = {
      nativeLanguage,
      targetLanguage,
      proficiencyLevel,
      mode,
      sessionId,
      sessionTitle,
      participantId,
    }
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // sessionStorage can throw in private mode; state still lives in memory.
    }
  }, [nativeLanguage, targetLanguage, proficiencyLevel, mode, sessionId, sessionTitle, participantId])

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
