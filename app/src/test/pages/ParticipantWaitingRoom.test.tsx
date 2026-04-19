import { act, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ParticipantWaitingRoom } from '@/pages/ParticipantWaitingRoom'
import { renderWithProviders } from '@/test/render'
import { makeParticipant, makeSession } from '@/test/mocks/sessions'

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

import { fetchSessionById, listParticipants } from '@/lib/sessions'

const SESSION_ID = 'session-1'
const PARTICIPANT_ID = 'participant-1'

const persistedAsParticipant = {
  nativeLanguage: 'Japanese' as const,
  targetLanguage: 'Dutch' as const,
  proficiencyLevels: ['B1'],
  mode: 'multiplayer' as const,
  sessionId: SESSION_ID,
  sessionTitle: 'Test session',
  participantId: PARTICIPANT_ID,
}

function renderWaitingRoom() {
  return renderWithProviders(
    <Routes>
      <Route path="/join/:sessionId/waiting" element={<ParticipantWaitingRoom />} />
      <Route path="/join/:sessionId/play" element={<div>play route</div>} />
    </Routes>,
    {
      initialEntries: [`/join/${SESSION_ID}/waiting`],
      persisted: persistedAsParticipant,
    },
  )
}

describe('ParticipantWaitingRoom', () => {
  beforeEach(() => {
    vi.mocked(fetchSessionById).mockReset()
    vi.mocked(listParticipants).mockReset()
  })

  it('reflects new participants on the polling refresh', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession())
    vi.mocked(listParticipants)
      .mockResolvedValueOnce([
        makeParticipant({ id: 'host-1', display_name: 'Mitchell', is_host: true }),
        makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
      ])
      .mockResolvedValue([
        makeParticipant({ id: 'host-1', display_name: 'Mitchell', is_host: true }),
        makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
        makeParticipant({ id: 'guest-2', display_name: 'Jan' }),
      ])

    renderWaitingRoom()

    expect(await screen.findByText('Yuki')).toBeInTheDocument()
    expect(screen.getByText('Mitchell')).toBeInTheDocument()
    expect(screen.getByText('(host)')).toBeInTheDocument()
    expect(screen.getByText('(you)')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Participants (1)' })).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100)
    })

    expect(await screen.findByText('Jan')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Participants (2)' })).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('flips to the ended screen when the session ends between polls', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(fetchSessionById)
      .mockResolvedValueOnce(makeSession())
      .mockResolvedValue(makeSession({ status: 'ended' }))
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
    ])

    renderWaitingRoom()
    expect(await screen.findByText('Yuki')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100)
    })

    expect(
      await screen.findByRole('heading', { name: 'Sessie is beëindigd' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Yuki')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('navigates to the play route when the session becomes active', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(fetchSessionById)
      .mockResolvedValueOnce(makeSession())
      .mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
    ])

    renderWaitingRoom()
    expect(await screen.findByText('Yuki')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100)
    })

    expect(await screen.findByText('play route')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('renders the ended screen if the session was already ended on load', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'ended' }))
    vi.mocked(listParticipants).mockResolvedValue([])

    renderWaitingRoom()

    expect(
      await screen.findByRole('heading', { name: 'Sessie is beëindigd' }),
    ).toBeInTheDocument()
  })
})
