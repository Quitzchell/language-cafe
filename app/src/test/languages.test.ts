import { describe, expect, it } from 'vitest'

import { matchesSessionLanguages, toCEFR } from '@/lib/languages'

describe('matchesSessionLanguages', () => {
  it('accepts a native matching the host native language', () => {
    expect(matchesSessionLanguages('Dutch', 'Dutch', 'Japanese')).toBe(true)
  })

  it('accepts a native matching the target language', () => {
    expect(matchesSessionLanguages('Japanese', 'Dutch', 'Japanese')).toBe(true)
  })

  it('rejects a native matching neither session language', () => {
    expect(
      matchesSessionLanguages(
        'Spanish' as unknown as 'Dutch',
        'Dutch',
        'Japanese',
      ),
    ).toBe(false)
  })
})

describe('toCEFR', () => {
  it('maps JLPT levels to CEFR for Japanese', () => {
    expect(toCEFR('Japanese', 'N5')).toBe('A1')
    expect(toCEFR('Japanese', 'N1')).toBe('C1')
  })

  it('passes CEFR levels through for Dutch', () => {
    expect(toCEFR('Dutch', 'A2')).toBe('A2')
    expect(toCEFR('Dutch', 'C2')).toBe('C2')
  })
})
