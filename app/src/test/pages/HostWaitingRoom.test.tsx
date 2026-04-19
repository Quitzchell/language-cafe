import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Participant } from '@/lib/sessions'
import { HostWaitingRoom } from '@/pages/HostWaitingRoom'
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

import {
  endSession,
  fetchSessionById,
  isHostOfSession,
  listParticipants,
  subscribeToParticipants,
} from '@/lib/sessions'

const SESSION_ID = 'session-1'
const HOST_PARTICIPANT_ID = 'host-1'

const persistedAsHost = {
  nativeLanguage: 'Dutch' as const,
  targetLanguage: 'Japanese' as const,
  proficiencyLevel: 'B1' as const,
  mode: 'multiplayer' as const,
  sessionId: SESSION_ID,
  sessionTitle: 'Test session',
  participantId: HOST_PARTICIPANT_ID,
}

function renderHost() {
  return renderWithProviders(
    <Routes>
      <Route path="/session/:sessionId" element={<HostWaitingRoom />} />
      <Route path="/" element={<div>home route</div>} />
    </Routes>,
    {
      initialEntries: [`/session/${SESSION_ID}`],
      persisted: persistedAsHost,
    },
  )
}

describe('HostWaitingRoom', () => {
  let participantCallback: ((p: Participant) => void) | null = null

  beforeEach(() => {
    participantCallback = null
    vi.mocked(fetchSessionById).mockReset()
    vi.mocked(isHostOfSession).mockReset()
    vi.mocked(listParticipants).mockReset()
    vi.mocked(endSession).mockReset()
    vi.mocked(subscribeToParticipants).mockImplementation((_id, cb) => {
      participantCallback = cb
      return () => {}
    })
  })

  it('streams a new participant from realtime into the list', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession())
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Host', is_host: true }),
    ])

    renderHost()
    expect(await screen.findByRole('heading', { name: 'Test session' })).toBeInTheDocument()
    expect(screen.getByText('Waiting for someone to join…')).toBeInTheDocument()

    act(() => {
      participantCallback?.(
        makeParticipant({ id: 'guest-1', display_name: 'Yuki', is_host: false }),
      )
    })
    expect(await screen.findByText('Yuki')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Participants (1)' })).toBeInTheDocument()
  })

  it('calls endSession and navigates home when the host confirms the end dialog', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession())
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([])
    vi.mocked(endSession).mockResolvedValue(undefined)

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderHost()

    await user.click(await screen.findByRole('button', { name: 'Beëindig sessie' }))

    expect(vi.mocked(endSession)).toHaveBeenCalledWith(SESSION_ID, 'host', HOST_PARTICIPANT_ID)
    expect(await screen.findByText('home route')).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('renders the already-ended screen when the session is ended on load', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'ended' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([])

    renderHost()

    expect(
      await screen.findByRole('heading', { name: 'Sessie is beëindigd' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Terug naar start' })).toBeInTheDocument()
  })

  it('rejects visitors who are not the host of the session', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession())
    vi.mocked(isHostOfSession).mockResolvedValue(false)
    vi.mocked(listParticipants).mockResolvedValue([])

    renderHost()

    expect(
      await screen.findByRole('heading', { name: "You aren't the host of this session" }),
    ).toBeInTheDocument()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
})
