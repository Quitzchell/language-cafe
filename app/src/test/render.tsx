import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { SessionProvider } from '@/contexts/SessionContext'

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
} & Omit<RenderOptions, 'wrapper'>

export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { initialEntries = ['/'], persisted, ...rest } = options
  if (persisted) {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  }
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <SessionProvider>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </SessionProvider>
  )
  return render(ui, { wrapper: Wrapper, ...rest })
}
