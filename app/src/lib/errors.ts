import { NameTakenError } from '@/lib/sessions'

export function friendlyMessage(error: Error): string {
  if (error instanceof NameTakenError) {
    return 'That name is already taken. Pick another one.'
  }
  if (error.message.toLowerCase().includes('failed to fetch')) {
    return "Can't connect. Check your internet connection."
  }
  if (/no cards left/i.test(error.message)) {
    return 'No cards left at this level.'
  }
  return error.message || 'Something went wrong.'
}
