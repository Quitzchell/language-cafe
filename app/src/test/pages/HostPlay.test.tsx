import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SessionEvent } from '@/lib/sessions'
import { HostPlay } from '@/pages/HostPlay'
import {
  makeCardDrawnEvent,
  makeCardSkippedEvent,
  makeParticipant,
  makeSession,
  makeSessionEndedEvent,
  makeTurnPassedEvent,
} from '@/test/mocks/sessions'
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
    computeAskedThisRound: vi.fn(() => new Set<string>()),
    NameTakenError,
  }
})

import {
  computeAskedThisRound,
  drawCard,
  fetchCardWithTranslations,
  fetchCurrentDealer,
  fetchSessionById,
  isHostOfSession,
  listParticipants,
  passTurn,
  skipCard,
  subscribeToParticipants,
  subscribeToSessionEvents,
} from '@/lib/sessions'

const SESSION_ID = 'session-1'
const HOST_PARTICIPANT_ID = 'host-1'

const persistedAsHost = {
  nativeLanguage: 'Dutch' as const,
  targetLanguage: 'Japanese' as const,
  proficiencyLevels: ['B1'],
  mode: 'multiplayer' as const,
  sessionId: SESSION_ID,
  sessionTitle: 'Test session',
  participantId: HOST_PARTICIPANT_ID,
}

function renderHostPlay() {
  return renderWithProviders(
    <Routes>
      <Route path="/session/:sessionId/play" element={<HostPlay />} />
      <Route path="/" element={<div>home route</div>} />
    </Routes>,
    {
      initialEntries: [`/session/${SESSION_ID}/play`],
      persisted: persistedAsHost,
      sessionLiveId: SESSION_ID,
    },
  )
}

describe('HostPlay', () => {
  let eventCallback: ((e: SessionEvent) => void) | null = null

  beforeEach(() => {
    eventCallback = null
    vi.mocked(fetchSessionById).mockReset()
    vi.mocked(isHostOfSession).mockReset()
    vi.mocked(listParticipants).mockReset()
    vi.mocked(drawCard).mockReset()
    vi.mocked(skipCard).mockReset()
    vi.mocked(passTurn).mockReset()
    vi.mocked(fetchCurrentDealer).mockReset()
    vi.mocked(fetchCurrentDealer).mockResolvedValue(null)
    vi.mocked(fetchCardWithTranslations).mockReset()
    vi.mocked(fetchCardWithTranslations).mockResolvedValue({ practice: '', native: '' })
    vi.mocked(subscribeToParticipants).mockImplementation(() => () => {})
    vi.mocked(subscribeToSessionEvents).mockImplementation((_id, cb) => {
      eventCallback = cb
      return () => {}
    })
    vi.mocked(computeAskedThisRound).mockReturnValue(new Set<string>())
  })

  it('lists guest participants and calls drawCard on click', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Host', is_host: true }),
      makeParticipant({ id: 'guest-1', display_name: 'Yuki', is_host: false }),
    ])
    vi.mocked(drawCard).mockResolvedValue(
      makeCardDrawnEvent({ card_id: 'card-1', target_participant_id: 'guest-1' }),
    )

    const user = userEvent.setup()
    renderHostPlay()

    await user.click(await screen.findByRole('button', { name: /Yuki/ }))

    expect(vi.mocked(drawCard)).toHaveBeenCalledWith(
      SESSION_ID,
      HOST_PARTICIPANT_ID,
      'guest-1',
    )
    expect(screen.queryByRole('button', { name: /Host/ })).not.toBeInTheDocument()
  })

  it('excludes participants already asked this round from the picker', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Host', is_host: true }),
      makeParticipant({ id: 'guest-1', display_name: 'Yuki', is_host: false }),
      makeParticipant({ id: 'guest-2', display_name: 'Lena', is_host: false }),
    ])
    vi.mocked(computeAskedThisRound).mockReturnValue(new Set(['guest-1']))

    renderHostPlay()

    await screen.findByRole('heading', { name: 'Kies een deelnemer' })

    expect(screen.queryByRole('button', { name: /Yuki/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lena/ })).toBeInTheDocument()
  })

  it('renders the card when a card_drawn event arrives', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Host', is_host: true }),
      makeParticipant({ id: 'guest-1', display_name: 'Yuki', is_host: false }),
    ])
    vi.mocked(fetchCardWithTranslations).mockResolvedValue({
      practice: '週末は何をするのが好きですか？',
      native: 'Wat doe je graag in het weekend?',
    })

    renderHostPlay()
    await screen.findByRole('button', { name: /Yuki/ })

    act(() => {
      eventCallback?.(
        makeCardDrawnEvent({
          card_id: 'card-1',
          target_participant_id: 'guest-1',
          practice_language: 'Japanese',
          native_language: 'Dutch',
        }),
      )
    })

    expect(await screen.findByText('Voor Yuki')).toBeInTheDocument()
    expect(screen.getByText('週末は何をするのが好きですか？')).toBeInTheDocument()
    expect(screen.getByText('Wat doe je graag in het weekend?')).toBeInTheDocument()
    expect(vi.mocked(fetchCardWithTranslations)).toHaveBeenCalledWith(
      'card-1',
      'Japanese',
      'Dutch',
    )
  })

  it('flips to the ended screen when session_ended is broadcast', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Host', is_host: true }),
    ])

    renderHostPlay()
    await screen.findByRole('heading', { name: 'Kies een deelnemer' })

    act(() => {
      eventCallback?.(makeSessionEndedEvent())
    })

    expect(
      await screen.findByRole('heading', { name: 'Sessie is beëindigd' }),
    ).toBeInTheDocument()
  })

  it('surfaces a draw error via friendlyMessage', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Host', is_host: true }),
      makeParticipant({ id: 'guest-1', display_name: 'Yuki', is_host: false }),
    ])
    vi.mocked(drawCard).mockRejectedValue(new Error('No cards left at level B1'))

    const user = userEvent.setup()
    renderHostPlay()

    await user.click(await screen.findByRole('button', { name: /Yuki/ }))

    expect(
      await screen.findByText('Geen kaarten meer op dit niveau.'),
    ).toBeInTheDocument()
  })

  it('hides the Overslaan button before any card is drawn', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Host', is_host: true }),
      makeParticipant({ id: 'guest-1', display_name: 'Yuki', is_host: false }),
    ])

    renderHostPlay()
    await screen.findByRole('button', { name: /Yuki/ })

    expect(screen.queryByRole('button', { name: /Overslaan/i })).not.toBeInTheDocument()
  })

  it('shows Overslaan after a card is drawn and calls skipCard on click', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Host', is_host: true }),
      makeParticipant({ id: 'guest-1', display_name: 'Yuki', is_host: false }),
    ])
    vi.mocked(fetchCardWithTranslations).mockResolvedValue({
      practice: '週末は何をするのが好きですか？',
      native: 'Wat doe je graag in het weekend?',
    })
    vi.mocked(skipCard).mockResolvedValue(
      makeCardDrawnEvent(
        { card_id: 'card-2', target_participant_id: 'guest-1' },
        { id: 'event-skip-1' },
      ),
    )

    const user = userEvent.setup()
    renderHostPlay()
    await screen.findByRole('button', { name: /Yuki/ })

    act(() => {
      eventCallback?.(
        makeCardDrawnEvent({
          card_id: 'card-1',
          target_participant_id: 'guest-1',
          practice_language: 'Japanese',
          native_language: 'Dutch',
        }),
      )
    })

    const skipButton = await screen.findByRole('button', { name: /Overslaan/i })
    await user.click(skipButton)

    expect(vi.mocked(skipCard)).toHaveBeenCalledWith(SESSION_ID, HOST_PARTICIPANT_ID)
  })

  it('surfaces a skip error via friendlyMessage', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Host', is_host: true }),
      makeParticipant({ id: 'guest-1', display_name: 'Yuki', is_host: false }),
    ])
    vi.mocked(fetchCardWithTranslations).mockResolvedValue({
      practice: '週末は何をするのが好きですか？',
      native: 'Wat doe je graag in het weekend?',
    })
    vi.mocked(skipCard).mockRejectedValue(new Error('No cards left at level B1'))

    const user = userEvent.setup()
    renderHostPlay()
    await screen.findByRole('button', { name: /Yuki/ })

    act(() => {
      eventCallback?.(
        makeCardDrawnEvent({
          card_id: 'card-1',
          target_participant_id: 'guest-1',
          practice_language: 'Japanese',
          native_language: 'Dutch',
        }),
      )
    })

    await user.click(await screen.findByRole('button', { name: /Overslaan/i }))

    expect(
      await screen.findByText('Geen kaarten meer op dit niveau.'),
    ).toBeInTheDocument()
  })

  it('hides the Beurt doorgeven button before any card is drawn', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Host', is_host: true }),
      makeParticipant({ id: 'guest-1', display_name: 'Yuki', is_host: false }),
    ])

    renderHostPlay()
    await screen.findByRole('button', { name: /Yuki/ })

    expect(
      screen.queryByRole('button', { name: /Beurt doorgeven/i }),
    ).not.toBeInTheDocument()
  })

  it('shows Beurt doorgeven after a card is drawn and calls passTurn with the receiver id', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Host', is_host: true }),
      makeParticipant({ id: 'guest-1', display_name: 'Yuki', is_host: false }),
    ])
    vi.mocked(fetchCardWithTranslations).mockResolvedValue({
      practice: '週末は何をするのが好きですか？',
      native: 'Wat doe je graag in het weekend?',
    })
    vi.mocked(passTurn).mockResolvedValue(
      makeTurnPassedEvent({ next_participant_id: 'guest-1' }),
    )

    const user = userEvent.setup()
    renderHostPlay()
    await screen.findByRole('button', { name: /Yuki/ })

    act(() => {
      eventCallback?.(
        makeCardDrawnEvent({
          card_id: 'card-1',
          target_participant_id: 'guest-1',
          practice_language: 'Japanese',
          native_language: 'Dutch',
        }),
      )
    })

    const passButton = await screen.findByRole('button', { name: /Beurt doorgeven/i })
    await user.click(passButton)

    expect(vi.mocked(passTurn)).toHaveBeenCalledWith(
      SESSION_ID,
      HOST_PARTICIPANT_ID,
      'guest-1',
    )
  })

  it('switches to observer view when turn_passed names a different participant', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Host', is_host: true }),
      makeParticipant({ id: 'guest-1', display_name: 'Yuki', is_host: false }),
    ])
    vi.mocked(fetchCardWithTranslations).mockResolvedValue({
      practice: '週末は何をするのが好きですか？',
      native: 'Wat doe je graag in het weekend?',
    })

    renderHostPlay()
    await screen.findByRole('button', { name: /Yuki/ })

    act(() => {
      eventCallback?.(
        makeCardDrawnEvent({
          card_id: 'card-1',
          target_participant_id: 'guest-1',
          practice_language: 'Japanese',
          native_language: 'Dutch',
        }),
      )
    })
    await screen.findByText('週末は何をするのが好きですか？')

    act(() => {
      eventCallback?.(
        makeTurnPassedEvent({ next_participant_id: 'guest-1' }),
      )
    })

    expect(
      await screen.findByText('Wachten op Yuki…'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Kies een deelnemer' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('週末は何をするのが好きですか？')).not.toBeInTheDocument()
  })

  it('surfaces a pass error via friendlyMessage', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Host', is_host: true }),
      makeParticipant({ id: 'guest-1', display_name: 'Yuki', is_host: false }),
    ])
    vi.mocked(fetchCardWithTranslations).mockResolvedValue({
      practice: '週末は何をするのが好きですか？',
      native: 'Wat doe je graag in het weekend?',
    })
    vi.mocked(passTurn).mockRejectedValue(new Error('No card to pass on'))

    const user = userEvent.setup()
    renderHostPlay()
    await screen.findByRole('button', { name: /Yuki/ })

    act(() => {
      eventCallback?.(
        makeCardDrawnEvent({
          card_id: 'card-1',
          target_participant_id: 'guest-1',
          practice_language: 'Japanese',
          native_language: 'Dutch',
        }),
      )
    })

    await user.click(await screen.findByRole('button', { name: /Beurt doorgeven/i }))

    expect(
      await screen.findByText('No card to pass on'),
    ).toBeInTheDocument()
  })

  it('restores dealer from fetchCurrentDealer on mount', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Host', is_host: true }),
      makeParticipant({ id: 'guest-1', display_name: 'Yuki', is_host: false }),
    ])
    vi.mocked(fetchCurrentDealer).mockResolvedValue('guest-1')

    renderHostPlay()

    expect(
      await screen.findByText('Wachten op Yuki…'),
    ).toBeInTheDocument()
  })

  it('shows the blind message when the host is target of the current card', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Mitchell', is_host: true }),
      makeParticipant({ id: 'guest-1', display_name: 'Yuki', is_host: false }),
    ])
    vi.mocked(fetchCurrentDealer).mockResolvedValue('guest-1')
    vi.mocked(fetchCardWithTranslations).mockResolvedValue({
      practice: '週末は何をするのが好きですか？',
      native: 'Wat doe je graag in het weekend?',
    })

    renderHostPlay()
    await screen.findByText('Wachten op Yuki…')

    act(() => {
      eventCallback?.(
        makeCardDrawnEvent({
          card_id: 'card-1',
          target_participant_id: HOST_PARTICIPANT_ID,
          practice_language: 'Japanese',
          native_language: 'Dutch',
        }),
      )
    })

    expect(
      await screen.findByText('Iemand stelt jou een vraag — luister goed'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Wachten op/)).not.toBeInTheDocument()
  })

  it('keeps the current card on screen when a card_skipped event arrives alone', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(makeSession({ status: 'active' }))
    vi.mocked(isHostOfSession).mockResolvedValue(true)
    vi.mocked(listParticipants).mockResolvedValue([
      makeParticipant({ id: HOST_PARTICIPANT_ID, display_name: 'Host', is_host: true }),
      makeParticipant({ id: 'guest-1', display_name: 'Yuki', is_host: false }),
    ])
    vi.mocked(fetchCardWithTranslations).mockResolvedValue({
      practice: '週末は何をするのが好きですか？',
      native: 'Wat doe je graag in het weekend?',
    })

    renderHostPlay()
    await screen.findByRole('button', { name: /Yuki/ })

    act(() => {
      eventCallback?.(
        makeCardDrawnEvent({
          card_id: 'card-1',
          target_participant_id: 'guest-1',
          practice_language: 'Japanese',
          native_language: 'Dutch',
        }),
      )
    })

    await screen.findByText('週末は何をするのが好きですか？')

    act(() => {
      eventCallback?.(makeCardSkippedEvent({ card_id: 'card-1' }))
    })

    expect(screen.getByText('週末は何をするのが好きですか？')).toBeInTheDocument()
  })

})
