import { id } from '@/locales/id'

export const MAX_ACTIONS = 5
const MAX_ACTION_LENGTH = 300

/** One step per line in the text box. */
export function actionsToText(actions: string[]): string {
  return actions.join('\n')
}

/** Trims every line and drops the empty ones. */
export function parseActions(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/** The first problem found, or null when the steps are fine. */
export function validateActions(actions: string[]): string | null {
  const errors = id.advisor.dialog.errors
  if (actions.length === 0) return errors.required
  if (actions.length > MAX_ACTIONS) {
    return errors.tooMany.replace('{max}', String(MAX_ACTIONS))
  }
  if (actions.some((action) => action.length > MAX_ACTION_LENGTH)) {
    return errors.tooLong.replace('{max}', String(MAX_ACTION_LENGTH))
  }
  return null
}

export function sameActions(first: string[], second: string[]): boolean {
  return (
    first.length === second.length &&
    first.every((action, index) => action === second[index])
  )
}
