import { describe, expect, it } from 'vitest'

import { matchesSessionLanguages, toCEFRLevels } from '@/lib/languages'

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

describe('toCEFRLevels', () => {
  it('maps JLPT levels to CEFR for Japanese', () => {
    expect(toCEFRLevels('Japanese', ['N5'])).toEqual(['A1'])
  })

  it('expands JLPT N1 to both C1 and C2', () => {
    expect(toCEFRLevels('Japanese', ['N1'])).toEqual(['C1', 'C2'])
  })

  it('deduplicates overlapping JLPT selections', () => {
    expect(toCEFRLevels('Japanese', ['N2', 'N1'])).toEqual(['B2', 'C1', 'C2'])
  })

  it('passes CEFR levels through for Dutch', () => {
    expect(toCEFRLevels('Dutch', ['A2'])).toEqual(['A2'])
    expect(toCEFRLevels('Dutch', ['A2', 'B1'])).toEqual(['A2', 'B1'])
  })
})
