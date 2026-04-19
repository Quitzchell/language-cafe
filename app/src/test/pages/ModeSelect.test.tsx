import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ModeSelect } from '@/pages/ModeSelect'
import { renderWithProviders } from '@/test/render'

vi.mock('@/lib/sessions', () => {
  class NameTakenError extends Error {}
  return {
    createHostedSession: vi.fn(),
    fetchSessionById: vi.fn(),
    fetchJoinContext: vi.fn(),
    isHostOfSession: vi.fn(),
    createParticipant: vi.fn(),
    listParticipants: vi.fn(),
    subscribeToParticipants: vi.fn(() => () => {}),
    subscribeToSessionEvents: vi.fn(() => () => {}),
    endSession: vi.fn(),
    NameTakenError,
  }
})

import { createHostedSession } from '@/lib/sessions'

function SessionRouteMarker() {
  const { sessionId } = useParams()
  return <div>session route {sessionId}</div>
}

describe('ModeSelect multiplayer flow', () => {
  beforeEach(() => {
    vi.mocked(createHostedSession).mockResolvedValue({
      session: { id: 'session-abc', title: 'Tuesday café' },
      participant: { id: 'participant-xyz' },
    })
  })

  it('creates a hosted session via the RPC and routes to /session/:id', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/mode" element={<ModeSelect />} />
        <Route path="/session/:sessionId" element={<SessionRouteMarker />} />
      </Routes>,
      {
        initialEntries: ['/mode'],
        persisted: {
          nativeLanguage: 'Dutch',
          targetLanguage: 'Japanese',
          proficiencyLevels: ['B1'],
        },
      },
    )

    await user.click(screen.getByRole('button', { name: 'Met anderen' }))
    await user.type(screen.getByRole('textbox', { name: 'Session title' }), 'Tuesday café')
    await user.type(screen.getByRole('textbox', { name: 'Jouw naam' }), 'Mitchell')
    await user.click(screen.getByRole('button', { name: 'Doorgaan' }))

    expect(vi.mocked(createHostedSession)).toHaveBeenCalledWith({
      title: 'Tuesday café',
      hostDisplayName: 'Mitchell',
      targetLanguage: 'Japanese',
      hostNativeLanguage: 'Dutch',
      hostProficiencyLevels: ['B1'],
    })
    expect(await screen.findByText('session route session-abc')).toBeInTheDocument()
  })

  it('disables Doorgaan until both session title and host name are entered', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/mode" element={<ModeSelect />} />
      </Routes>,
      {
        initialEntries: ['/mode'],
        persisted: {
          nativeLanguage: 'Dutch',
          targetLanguage: 'Japanese',
          proficiencyLevels: ['B1'],
        },
      },
    )

    await user.click(screen.getByRole('button', { name: 'Met anderen' }))
    const submit = screen.getByRole('button', { name: 'Doorgaan' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByRole('textbox', { name: 'Session title' }), 'Tuesday café')
    expect(submit).toBeDisabled()

    await user.type(screen.getByRole('textbox', { name: 'Jouw naam' }), 'Mitchell')
    expect(submit).toBeEnabled()
  })
})
