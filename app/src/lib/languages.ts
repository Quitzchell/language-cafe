export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type CEFRLevel = (typeof CEFR_LEVELS)[number]

export const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const
export type JLPTLevel = (typeof JLPT_LEVELS)[number]

export const JLPT_TO_CEFR: Record<JLPTLevel, readonly CEFRLevel[]> = {
  N5: ['A1'],
  N4: ['A2'],
  N3: ['B1'],
  N2: ['B2'],
  N1: ['C1', 'C2'],
}

type LevelScheme = 'cefr' | 'jlpt'

export const LANGUAGES = [
  { code: 'Dutch', label: 'Nederlands', levelScheme: 'cefr' },
  { code: 'Japanese', label: '日本語', levelScheme: 'jlpt' },
] as const satisfies readonly { code: string; label: string; levelScheme: LevelScheme }[]

export type Language = (typeof LANGUAGES)[number]['code']

export const LANGUAGE_CODES: readonly Language[] = LANGUAGES.map((l) => l.code)

export const LANGUAGE_LABELS: Record<Language, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l.label]),
) as Record<Language, string>

export function levelsForLanguage(language: Language): readonly (CEFRLevel | JLPTLevel)[] {
  const def = LANGUAGES.find((l) => l.code === language)
  return def?.levelScheme === 'jlpt' ? JLPT_LEVELS : CEFR_LEVELS
}

export function toCEFRLevels(
  language: Language,
  levels: readonly (CEFRLevel | JLPTLevel)[],
): CEFRLevel[] {
  const def = LANGUAGES.find((l) => l.code === language)
  const expanded = levels.flatMap((level) =>
    def?.levelScheme === 'jlpt'
      ? [...JLPT_TO_CEFR[level as JLPTLevel]]
      : [level as CEFRLevel],
  )
  return CEFR_LEVELS.filter((c) => expanded.includes(c))
}

export function matchesSessionLanguages(
  candidate: Language,
  hostNativeLanguage: Language,
  targetLanguage: Language,
): boolean {
  return candidate === hostNativeLanguage || candidate === targetLanguage
}
