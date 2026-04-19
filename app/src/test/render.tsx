import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { SessionProvider } from '@/contexts/SessionContext'
import { SessionLiveProvider } from '@/contexts/SessionLive'

const STORAGE_KEY = 'lc:session:v1'

type PersistedSession = Partial<{
  nativeLanguage: string | null
  targetLanguage: string | null
  proficiencyLevels: string[]
  mode: 'solo' | 'multiplayer' | null
  sessionId: string | null
  sessionTitle: string | null
  participantId: string | null
}>

type Options = {
  initialEntries?: string[]
  persisted?: PersistedSession
  /** When set, wraps children in SessionLiveProvider with this sessionId. */
  sessionLiveId?: string
} & Omit<RenderOptions, 'wrapper'>

export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { initialEntries = ['/'], persisted, sessionLiveId, ...rest } = options
  if (persisted) {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  }
  const Wrapper = ({ children }: { children: ReactNode }) => {
    const router = <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    const withLive = sessionLiveId ? (
      <SessionLiveProvider sessionId={sessionLiveId}>{router}</SessionLiveProvider>
    ) : (
      router
    )
    return <SessionProvider>{withLive}</SessionProvider>
  }
  return render(ui, { wrapper: Wrapper, ...rest })
}
