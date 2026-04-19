import { act, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Participant, SessionEvent } from '@/lib/sessions'
import { ParticipantWaitingRoom } from '@/pages/ParticipantWaitingRoom'
import { renderWithProviders } from '@/test/render'
import {
  makeParticipant,
  makeSession,
  makeSessionEndedEvent,
  makeSessionStartedEvent,
} from '@/test/mocks/sessions'

vi.mock('@/lib/sessions', () => {
  class NameTakenError extends Error {}
  return {
    createHostedSession: vi.fn(),
    fetchSessionById: vi.fn(),
    fetchJoinContext: vi.fn(),
    isHostOfSession: vi.fn(),
    createParticipant: vi.fn(),
    listParticipants: vi.fn(),
    listCardDrawnEvents: vi.fn(() => Promise.resolve([])),
    fetchCurrentDealer: vi.fn(() => Promise.resolve(null)),
    fetchCardWithTranslations: vi.fn(),
    subscribeToParticipants: vi.fn(() => () => {}),
    subscribeToSessionEvents: vi.fn(() => () => {}),
    endSession: vi.fn(),
    NameTakenError,
  }
})

import {
  fetchCurrentDealer,
  fetchSessionById,
  listCardDrawnEvents,
  listParticipants,
  subscribeToParticipants,
  subscribeToSessionEvents,
} from '@/lib/sessions'

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
      sessionLiveId: SESSION_ID,
    },
  )
}

describe('ParticipantWaitingRoom', () => {
  let participantCallback: ((p: Participant) => void) | null = null
  let eventCallback: ((e: SessionEvent) => void) | null = null

  beforeEach(() => {
    participantCallback = null
    eventCallback = null
    vi.mocked(fetchSessionById).mockReset()
    vi.mocked(listParticipants).mockReset()
    vi.mocked(listCardDrawnEvents).mockReset().mockResolvedValue([])
    vi.mocked(fetchCurrentDealer).mockReset().mockResolvedValue(null)
    vi.mocked(subscribeToParticipants).mockImplementation((_id, cb) => {
      participantCallback = cb
      return () => {}
    })
    vi.mocked(subscribeToSessionEvents).mockImplementation((_id, cb) => {
      eventCallback = cb
      return () => {}
    })
  })

  it('adds a new participant to the list when realtime fires', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession())
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: 'host-1', display_name: 'Mitchell', is_host: true }),
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
    ])

    renderWaitingRoom()

    expect(await screen.findByText('Yuki')).toBeInTheDocument()
    expect(screen.getByText('Mitchell')).toBeInTheDocument()
    expect(screen.getByText('(host)')).toBeInTheDocument()
    expect(screen.getByText('(you)')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Participants (1)' })).toBeInTheDocument()

    act(() => {
      participantCallback?.(
        makeParticipant({ id: 'guest-2', display_name: 'Jan' }),
      )
    })

    expect(await screen.findByText('Jan')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Participants (2)' })).toBeInTheDocument()
  })

  it('flips to the ended screen when session_ended is broadcast', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession())
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
    ])

    renderWaitingRoom()
    expect(await screen.findByText('Yuki')).toBeInTheDocument()

    act(() => {
      eventCallback?.(makeSessionEndedEvent())
    })

    expect(
      await screen.findByRole('heading', { name: 'Sessie is beëindigd' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Yuki')).not.toBeInTheDocument()
  })

  it('navigates to the play route when session_started fires', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession())
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
    ])

    renderWaitingRoom()
    expect(await screen.findByText('Yuki')).toBeInTheDocument()

    act(() => {
      eventCallback?.(makeSessionStartedEvent())
    })

    expect(await screen.findByText('play route')).toBeInTheDocument()
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
