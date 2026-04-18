import { render, screen, act } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SessionProvider, useSession } from '@/contexts/SessionContext'

const STORAGE_KEY = 'lc:session:v1'

afterEach(() => {
  window.sessionStorage.clear()
})

function Probe() {
  const session = useSession()
  return (
    <div>
      <span data-testid="native">{session.nativeLanguage ?? ''}</span>
      <span data-testid="sessionId">{session.sessionId ?? ''}</span>
      <span data-testid="participantId">{session.participantId ?? ''}</span>
      <button
        type="button"
        onClick={() =>
          session.setMultiplayer('s-1', 'Title', 'p-1')
        }
      >
        join
      </button>
    </div>
  )
}

describe('SessionProvider persistence', () => {
  it('rehydrates state from sessionStorage on mount', () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        nativeLanguage: 'Dutch',
        sessionId: 's-abc',
        participantId: 'p-xyz',
      }),
    )

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )

    expect(screen.getByTestId('native')).toHaveTextContent('Dutch')
    expect(screen.getByTestId('sessionId')).toHaveTextContent('s-abc')
    expect(screen.getByTestId('participantId')).toHaveTextContent('p-xyz')
  })

  it('persists state written via setters back to sessionStorage', () => {
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )

    act(() => {
      screen.getByText('join').click()
    })

    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const payload = JSON.parse(raw!)
    expect(payload.sessionId).toBe('s-1')
    expect(payload.sessionTitle).toBe('Title')
    expect(payload.participantId).toBe('p-1')
    expect(payload.mode).toBe('multiplayer')
  })

  it('state survives a re-mount of the provider', () => {
    const { unmount } = render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    act(() => {
      screen.getByText('join').click()
    })
    unmount()

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    expect(screen.getByTestId('sessionId')).toHaveTextContent('s-1')
    expect(screen.getByTestId('participantId')).toHaveTextContent('p-1')
  })
})
