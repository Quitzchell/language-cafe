import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ParticipantJoin } from '@/pages/ParticipantJoin'
import { renderWithProviders } from '@/test/render'
import { makeSession } from '@/test/mocks/sessions'

vi.mock('@/lib/sessions', () => {
  class NameTakenError extends Error {
    constructor(name: string) {
      super(`Display name "${name}" is already taken in this session`)
      this.name = 'NameTakenError'
    }
  }
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

import { NameTakenError, createParticipant, fetchJoinContext } from '@/lib/sessions'

function renderJoin(sessionId = 'session-1') {
  return renderWithProviders(
    <Routes>
      <Route path="/join/:sessionId" element={<ParticipantJoin />} />
      <Route
        path="/join/:sessionId/waiting"
        element={<div>waiting room</div>}
      />
    </Routes>,
    { initialEntries: [`/join/${sessionId}`] },
  )
}

describe('ParticipantJoin happy path', () => {
  beforeEach(() => {
    vi.mocked(createParticipant).mockReset()
    vi.mocked(fetchJoinContext).mockReset()
  })

  it('joins as Japanese native with CEFR level for Dutch practice', async () => {
    vi.mocked(fetchJoinContext).mockResolvedValue({
      session: makeSession({ host_native_language: 'Dutch', target_language: 'Japanese' }),
      hostNativeLanguage: 'Dutch',
    })
    vi.mocked(createParticipant).mockResolvedValue({ id: 'participant-1' })
    const user = userEvent.setup()
    renderJoin()

    await user.type(await screen.findByRole('textbox', { name: 'Your name' }), 'Yuki')
    await user.click(screen.getByRole('button', { name: '日本語' }))
    await user.click(await screen.findByRole('button', { name: 'B1' }))
    await user.click(screen.getByRole('button', { name: 'Join session' }))

    expect(vi.mocked(createParticipant)).toHaveBeenCalledWith({
      sessionId: 'session-1',
      displayName: 'Yuki',
      nativeLanguage: 'Japanese',
      proficiencyLevel: 'B1',
    })
    expect(await screen.findByText('waiting room')).toBeInTheDocument()
  })

  it('joins as Dutch native with JLPT level mapped to CEFR for Japanese practice', async () => {
    vi.mocked(fetchJoinContext).mockResolvedValue({
      session: makeSession({ host_native_language: 'Japanese', target_language: 'Dutch' }),
      hostNativeLanguage: 'Japanese',
    })
    vi.mocked(createParticipant).mockResolvedValue({ id: 'participant-2' })
    const user = userEvent.setup()
    renderJoin()

    await user.type(await screen.findByRole('textbox', { name: 'Your name' }), 'Jan')
    await user.click(screen.getByRole('button', { name: 'Nederlands' }))
    await user.click(await screen.findByRole('button', { name: 'N4' }))
    await user.click(screen.getByRole('button', { name: 'Join session' }))

    expect(vi.mocked(createParticipant)).toHaveBeenCalledWith({
      sessionId: 'session-1',
      displayName: 'Jan',
      nativeLanguage: 'Dutch',
      proficiencyLevel: 'A2',
    })
  })
})

describe('ParticipantJoin guards', () => {
  beforeEach(() => {
    vi.mocked(createParticipant).mockReset()
    vi.mocked(fetchJoinContext).mockReset()
  })

  it('rejects a native language that matches neither session language', async () => {
    vi.mocked(fetchJoinContext).mockResolvedValue({
      session: makeSession({ host_native_language: 'Dutch', target_language: 'Dutch' }),
      hostNativeLanguage: 'Dutch',
    })
    const user = userEvent.setup()
    renderJoin()

    await user.click(await screen.findByRole('button', { name: '日本語' }))
    expect(
      screen.getByText('Deze taal wordt nog niet ondersteund in deze sessie.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Join session' })).toBeDisabled()
  })

  it('shows a friendly message when the display name is taken', async () => {
    vi.mocked(fetchJoinContext).mockResolvedValue({
      session: makeSession({ host_native_language: 'Dutch', target_language: 'Japanese' }),
      hostNativeLanguage: 'Dutch',
    })
    vi.mocked(createParticipant).mockRejectedValue(new NameTakenError('Yuki'))
    const user = userEvent.setup()
    renderJoin()

    await user.type(await screen.findByRole('textbox', { name: 'Your name' }), 'Yuki')
    await user.click(screen.getByRole('button', { name: '日本語' }))
    await user.click(await screen.findByRole('button', { name: 'B1' }))
    await user.click(screen.getByRole('button', { name: 'Join session' }))

    expect(
      await screen.findByText('Die naam is al bezet. Kies een andere.'),
    ).toBeInTheDocument()
  })

  it('blocks joining an already-ended session', async () => {
    vi.mocked(fetchJoinContext).mockResolvedValue({
      session: makeSession({ status: 'ended' }),
      hostNativeLanguage: 'Dutch',
    })
    renderJoin()

    expect(
      await screen.findByRole('heading', { name: 'Deze sessie is al beëindigd' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Your name' })).not.toBeInTheDocument()
  })
})
