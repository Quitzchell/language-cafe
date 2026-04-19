import { NameTakenError } from '@/lib/sessions'

export function friendlyMessage(error: Error): string {
  if (error instanceof NameTakenError) {
    return 'Die naam is al bezet. Kies een andere.'
  }
  if (error.message.toLowerCase().includes('failed to fetch')) {
    return 'Kan geen verbinding maken. Controleer je internetverbinding.'
  }
  if (/no cards left/i.test(error.message)) {
    return 'Geen kaarten meer op dit niveau.'
  }
  return error.message || 'Er ging iets mis.'
}
