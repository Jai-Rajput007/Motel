import { db, DEFAULT_SETTINGS, SETTINGS_ID } from '../db'
import type { Settings } from '../db/types'
import { dayKey } from '../lib/dates'

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get(SETTINGS_ID)) ?? DEFAULT_SETTINGS
}

/** Business day for a moment, using the shop's late-night cut-off. Rejects dates in the future. */
export async function bizDay(at: string): Promise<string> {
  const t = new Date(at).getTime()
  if (Number.isNaN(t)) throw new UserError('That date is not valid.')
  if (t > Date.now() + 15 * 60_000) throw new UserError('That date & time is in the future. Please check it.')
  const s = await getSettings()
  return dayKey(at, s.dayCutoffHour)
}

export class UserError extends Error {}
