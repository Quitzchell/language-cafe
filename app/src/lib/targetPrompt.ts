import type { Language } from './languages'

const TARGET_PROMPTS: Partial<Record<Language, string>> = {
  Dutch: 'Iemand stelt jou een vraag — luister goed',
  Japanese: '誰かがあなたに質問しています — よく聞いてください',
}

export function targetPromptText(language: Language): string {
  return TARGET_PROMPTS[language] ?? 'Someone is asking you a question — listen carefully'
}