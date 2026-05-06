import { describe, expect, it } from 'vitest'

import { computeAskedThisRound, type CardDrawnEvent } from '@/lib/sessions'
import { makeCardDrawnEvent } from '@/test/mocks/sessions'

function history(
  targets: string[],
): CardDrawnEvent[] {
  return targets.map((target_participant_id, idx) => {
    const event = makeCardDrawnEvent(
      { target_participant_id },
      {
        id: `evt-${idx}`,
        created_at: new Date(2026, 3, 19, 12, 0, idx).toISOString(),
      },
    )
    return event as CardDrawnEvent
  })
}

describe('computeAskedThisRound', () => {
  it('returns empty set when no events exist', () => {
    expect(computeAskedThisRound([], 3)).toEqual(new Set())
  })

  it('returns empty set when participant count is zero', () => {
    expect(computeAskedThisRound(history(['a']), 0)).toEqual(new Set())
  })

  it('tracks a partial round mid-rotation', () => {
    expect(computeAskedThisRound(history(['a']), 3)).toEqual(new Set(['a']))
    expect(computeAskedThisRound(history(['a', 'b']), 3)).toEqual(new Set(['a', 'b']))
  })

  it('resets to empty when a round closes exactly on N targets', () => {
    expect(computeAskedThisRound(history(['a', 'b', 'c']), 3)).toEqual(new Set())
  })

  it('starts fresh on the first target of the next round', () => {
    expect(computeAskedThisRound(history(['a', 'b', 'c', 'a']), 3)).toEqual(new Set(['a']))
  })

  it('handles multiple completed rounds plus a partial', () => {
    expect(
      computeAskedThisRound(history(['a', 'b', 'c', 'a', 'b', 'c', 'b', 'c']), 3),
    ).toEqual(new Set(['b', 'c']))
  })

  it('collapses consecutive same-target events (skip) into one slot', () => {
    expect(computeAskedThisRound(history(['a', 'a']), 3)).toEqual(new Set(['a']))
    expect(computeAskedThisRound(history(['a', 'a', 'a']), 3)).toEqual(new Set(['a']))
    expect(computeAskedThisRound(history(['a', 'a', 'b']), 3)).toEqual(new Set(['a', 'b']))
  })

  it('still closes a round correctly when skips happen during it', () => {
    expect(
      computeAskedThisRound(history(['a', 'a', 'b', 'c']), 3),
    ).toEqual(new Set())
  })

  it('works for a 2-player session', () => {
    expect(computeAskedThisRound(history(['a']), 2)).toEqual(new Set(['a']))
    expect(computeAskedThisRound(history(['a', 'b']), 2)).toEqual(new Set())
    expect(computeAskedThisRound(history(['a', 'b', 'a']), 2)).toEqual(new Set(['a']))
  })
})
