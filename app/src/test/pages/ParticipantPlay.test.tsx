import { act, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SessionEvent } from '@/lib/sessions'
import { ParticipantPlay } from '@/pages/ParticipantPlay'
import {
  makeCardDrawnEvent,
  makeCardText,
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
    listCardDrawnEvents: vi.fn(() => Promise.resolve([])),
    hasTurnPassedAfter: vi.fn(() => Promise.resolve(false)),
    computeAskedThisRound: vi.fn(() => new Set<string>()),
    NameTakenError,
  }
})

import {
  drawCard,
  fetchCardWithTranslations,
  fetchCurrentDealer,
  fetchSessionById,
  hasTurnPassedAfter,
  listCardDrawnEvents,
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
      sessionLiveId: SESSION_ID,
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
    vi.mocked(fetchCardWithTranslations).mockResolvedValue(makeCardText())
    vi.mocked(listCardDrawnEvents).mockReset()
    vi.mocked(listCardDrawnEvents).mockResolvedValue([])
    vi.mocked(hasTurnPassedAfter).mockReset()
    vi.mocked(hasTurnPassedAfter).mockResolvedValue(false)
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

    expect(await screen.findByText('Waiting for the dealer…')).toBeInTheDocument()
  })

  it('shows the blind message when a card_drawn event targets me', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: 'host-1', display_name: 'Mitchell', is_host: true }),
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki', native_language: 'Dutch' }),
    ])
    vi.mocked(fetchCardWithTranslations).mockResolvedValue(
      makeCardText({
        practice: '週末は何をするのが好きですか？',
        native: 'Wat doe je graag in het weekend?',
      }),
    )

    renderParticipantPlay()
    await screen.findByText('Waiting for the dealer…')

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

    expect(
      await screen.findByText('Iemand stelt jou een vraag — luister goed'),
    ).toBeInTheDocument()
    expect(screen.queryByText('週末は何をするのが好きですか？')).not.toBeInTheDocument()
    expect(screen.queryByText('Voor Yuki')).not.toBeInTheDocument()
  })

  it('renders the blind message in Japanese when the participant native language is Japanese', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: 'host-1', display_name: 'Mitchell', is_host: true }),
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki', native_language: 'Japanese' }),
    ])

    renderParticipantPlay()
    await screen.findByText('Waiting for the dealer…')

    act(() => {
      eventCallback?.(
        makeCardDrawnEvent({
          card_id: 'card-1',
          target_participant_id: PARTICIPANT_ID,
          practice_language: 'Dutch',
          native_language: 'Japanese',
        }),
      )
    })

    expect(
      await screen.findByText('誰かがあなたに質問しています — よく聞いてください'),
    ).toBeInTheDocument()
  })

  it('renders the card when a card_drawn event targets someone else', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: 'host-1', display_name: 'Mitchell', is_host: true }),
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
      makeParticipant({ id: 'guest-2', display_name: 'Lena' }),
    ])
    vi.mocked(fetchCardWithTranslations).mockResolvedValue(
      makeCardText({
        practice: '週末は何をするのが好きですか？',
        native: 'Wat doe je graag in het weekend?',
      }),
    )

    renderParticipantPlay()
    await screen.findByText('Waiting for the dealer…')

    act(() => {
      eventCallback?.(
        makeCardDrawnEvent({
          card_id: 'card-1',
          target_participant_id: 'guest-2',
          practice_language: 'Japanese',
          native_language: 'Dutch',
        }),
      )
    })

    expect(await screen.findByText('Voor Lena')).toBeInTheDocument()
    expect(screen.getByText('週末は何をするのが好きですか？')).toBeInTheDocument()
    expect(
      screen.queryByText('Iemand stelt jou een vraag — luister goed'),
    ).not.toBeInTheDocument()
  })

  it('renders the dealer UI when turn_passed names me', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: 'host-1', display_name: 'Host', is_host: true }),
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki', native_language: 'Dutch' }),
      makeParticipant({ id: 'guest-2', display_name: 'Lena' }),
    ])
    vi.mocked(fetchCardWithTranslations).mockResolvedValue(
      makeCardText({
        practice: '週末は何をするのが好きですか？',
        native: 'Wat doe je graag in het weekend?',
      }),
    )

    const user = userEvent.setup()
    renderParticipantPlay()
    await screen.findByText('Waiting for the dealer…')

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
    await screen.findByText('Iemand stelt jou een vraag — luister goed')

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

  it('hides the picker for a participant-dealer once a card is drawn', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: 'host-1', display_name: 'Host', is_host: true }),
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
      makeParticipant({ id: 'guest-2', display_name: 'Lena' }),
    ])
    vi.mocked(fetchCurrentDealer).mockResolvedValue(PARTICIPANT_ID)
    vi.mocked(fetchCardWithTranslations).mockResolvedValue(
      makeCardText({
        practice: '週末は何をするのが好きですか？',
        native: 'Wat doe je graag in het weekend?',
      }),
    )

    renderParticipantPlay()
    await screen.findByRole('heading', { name: 'Kies een deelnemer' })

    act(() => {
      eventCallback?.(
        makeCardDrawnEvent({
          card_id: 'card-1',
          target_participant_id: 'guest-2',
          practice_language: 'Japanese',
          native_language: 'Dutch',
        }),
      )
    })

    await screen.findByText('週末は何をするのが好きですか？')

    expect(
      screen.queryByRole('heading', { name: 'Kies een deelnemer' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Host/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Lena/ })).not.toBeInTheDocument()
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

  it('restores the bystander card on mount from session_events history', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: 'host-1', display_name: 'Host', is_host: true }),
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
      makeParticipant({ id: 'guest-2', display_name: 'Lena' }),
    ])
    vi.mocked(listCardDrawnEvents).mockResolvedValue([
      makeCardDrawnEvent({
        card_id: 'card-1',
        target_participant_id: 'guest-2',
        practice_language: 'Japanese',
        native_language: 'Dutch',
      }),
    ])
    vi.mocked(hasTurnPassedAfter).mockResolvedValue(false)
    vi.mocked(fetchCardWithTranslations).mockResolvedValue(
      makeCardText({
        practice: '週末は何をするのが好きですか？',
        native: 'Wat doe je graag in het weekend?',
      }),
    )

    renderParticipantPlay()

    expect(await screen.findByText('Voor Lena')).toBeInTheDocument()
    expect(screen.getByText('週末は何をするのが好きですか？')).toBeInTheDocument()
    expect(screen.queryByText('Waiting for the dealer…')).not.toBeInTheDocument()
  })

  it('flips to the ended screen when session_ended is broadcast', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: PARTICIPANT_ID, display_name: 'Yuki' }),
    ])

    renderParticipantPlay()
    await screen.findByText('Waiting for the dealer…')

    act(() => {
      eventCallback?.(makeSessionEndedEvent())
    })

    expect(
      await screen.findByRole('heading', { name: 'Session ended' }),
    ).toBeInTheDocument()
  })
})
