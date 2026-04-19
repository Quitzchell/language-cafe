import { act, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SessionEvent } from '@/lib/sessions'
import { ParticipantPlay } from '@/pages/ParticipantPlay'
import {
  makeCardDrawnEvent,
  makeParticipant,
  makeSession,
  makeSessionEndedEvent,
  makeTurnPassedEvent,
} from '@/test/mocks/sessions'
import userEvent from '@testing-library/user-event'
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
    startSession: vi.fn(),
    drawCard: vi.fn(),
    skipCard: vi.fn(),
    passTurn: vi.fn(),
    fetchCurrentDealer: vi.fn(),
    fetchCardWithTranslations: vi.fn(),
    NameTakenError,
  }
})

import {
  drawCard,
  fetchCardWithTranslations,
  fetchCurrentDealer,
  fetchSessionById,
  listParticipants,
  passTurn,
  subscribeToSessionEvents,
} from '@/lib/sessions'

const SESSION_ID = 'session-1'
const PARTICIPANT_ID = 'participant-1'

const persistedAsParticipant = {
  nativeLanguage: 'Dutch' as const,
  targetLanguage: 'Japanese' as const,
  proficiencyLevels: ['B1'],
  mode: 'multiplayer' as const,
  sessionId: SESSION_ID,
  sessionTitle: 'Test session',
  participantId: PARTICIPANT_ID,
}

function renderParticipantPlay() {
  return renderWithProviders(
    <Routes>
      <Route path="/join/:sessionId/play" element={<ParticipantPlay />} />
      <Route path="/" element={<div>home route</div>} />
    </Routes>,
    {
      initialEntries: [`/join/${SESSION_ID}/play`],
      persisted: persistedAsParticipant,
    },
  )
}

describe('ParticipantPlay', () => {
  let eventCallback: ((e: SessionEvent) => void) | null = null

  beforeEach(() => {
    eventCallback = null
    vi.mocked(fetchSessionById).mockReset()
    vi.mocked(listParticipants).mockReset()
    vi.mocked(fetchCardWithTranslations).mockReset()
    vi.mocked(drawCard).mockReset()
    vi.mocked(passTurn).mockReset()
    vi.mocked(fetchCurrentDealer).mockReset()
    vi.mocked(fetchCurrentDealer).mockResolvedValue(null)
    vi.mocked(subscribeToSessionEvents).mockImplementation((_id, cb) => {
      eventCallback = cb
      return () => {}
    })
  })

  it('shows the waiting-for-dealer placeholder on first render', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
    ])

    renderParticipantPlay()

    expect(await screen.findByText('Wachten op de dealer…')).toBeInTheDocument()
  })

  it('renders the card when a card_drawn event arrives', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
    ])
    vi.mocked(fetchCardWithTranslations).mockResolvedValue({
      practice: '週末は何をするのが好きですか？',
      native: 'Wat doe je graag in het weekend?',
    })

    renderParticipantPlay()
    await screen.findByText('Wachten op de dealer…')

    act(() => {
      eventCallback?.(
        makeCardDrawnEvent({
          card_id: 'card-1',
          target_participant_id: PARTICIPANT_ID,
          practice_language: 'Japanese',
          native_language: 'Dutch',
        }),
      )
    })

    expect(await screen.findByText('Voor Yuki')).toBeInTheDocument()
    expect(screen.getByText('週末は何をするのが好きですか？')).toBeInTheDocument()
    expect(screen.getByText('Wat doe je graag in het weekend?')).toBeInTheDocument()
  })

  it('renders the dealer UI when turn_passed names me', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: 'host-1', display_name: 'Host', is_host: true }),
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
      makeParticipant({ id: 'guest-2', display_name: 'Lena' }),
    ])
    vi.mocked(fetchCardWithTranslations).mockResolvedValue({
      practice: '週末は何をするのが好きですか？',
      native: 'Wat doe je graag in het weekend?',
    })
    vi.mocked(drawCard).mockResolvedValue('card-2')

    const user = userEvent.setup()
    renderParticipantPlay()
    await screen.findByText('Wachten op de dealer…')

    act(() => {
      eventCallback?.(
        makeCardDrawnEvent({
          card_id: 'card-1',
          target_participant_id: PARTICIPANT_ID,
          practice_language: 'Japanese',
          native_language: 'Dutch',
        }),
      )
    })
    await screen.findByText('週末は何をするのが好きですか？')

    act(() => {
      eventCallback?.(
        makeTurnPassedEvent({ next_participant_id: PARTICIPANT_ID }),
      )
    })

    expect(
      await screen.findByRole('heading', { name: 'Kies een deelnemer' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Lena/ }))

    expect(vi.mocked(drawCard)).toHaveBeenCalledWith(
      SESSION_ID,
      PARTICIPANT_ID,
      'guest-2',
    )
  })

  it('restores dealer = me from fetchCurrentDealer on mount', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: 'host-1', display_name: 'Host', is_host: true }),
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
    ])
    vi.mocked(fetchCurrentDealer).mockResolvedValue(PARTICIPANT_ID)

    renderParticipantPlay()

    expect(
      await screen.findByRole('heading', { name: 'Kies een deelnemer' }),
    ).toBeInTheDocument()
  })

  it('flips to the ended screen when session_ended is broadcast', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
    ])

    renderParticipantPlay()
    await screen.findByText('Wachten op de dealer…')

    act(() => {
      eventCallback?.(makeSessionEndedEvent())
    })

    expect(
      await screen.findByRole('heading', { name: 'Sessie is beëindigd' }),
    ).toBeInTheDocument()
  })
})
