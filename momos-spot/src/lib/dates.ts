/**
 * Date helpers. A "day key" is a calendar date string 'YYYY-MM-DD' in the phone's local time (IST).
 * Day-key arithmetic is done in UTC so it is never affected by time zones or DST.
 */

const pad = (n: number) => String(n).padStart(2, '0')

export function keyOfLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Business day of a moment. With cutoffHour = 2, a sale at 1:30 AM belongs to the previous day. */
export function dayKey(at: Date | string, cutoffHour = 0): string {
  const d = typeof at === 'string' ? new Date(at) : new Date(at.getTime())
  if (cutoffHour > 0) d.setTime(d.getTime() - cutoffHour * 3600_000)
  return keyOfLocalDate(d)
}

export function todayKey(cutoffHour = 0): string {
  return dayKey(new Date(), cutoffHour)
}

function toUTC(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
function fromUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function addDays(key: string, n: number): string {
  const d = toUTC(key)
  d.setUTCDate(d.getUTCDate() + n)
  return fromUTC(d)
}

/** Whole days from a to b (b − a). */
export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86400_000)
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate()
}

export function parts(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return { y, m, d }
}

export function makeKey(y: number, m1: number, d: number): string {
  return `${y}-${pad(m1)}-${pad(d)}`
}

export function monthKey(key: string): string {
  return key.slice(0, 7)
}

export function monthBounds(mk: string): [string, string] {
  const [y, m] = mk.split('-').map(Number)
  return [makeKey(y, m, 1), makeKey(y, m, daysInMonth(y, m))]
}

export function addMonths(mk: string, n: number): string {
  const [y, m] = mk.split('-').map(Number)
  const t = y * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`
}

/** Monday = 0 … Sunday = 6 */
export function weekdayMon0(key: string): number {
  return (toUTC(key).getUTCDay() + 6) % 7
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = []
  if (from > to) return out
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k)
  return out
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function formatDay(key: string, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const { y, m, d } = parts(key)
  let s = `${d} ${MONTHS[m - 1]}`
  if (opts.year) s += ` ${y}`
  if (opts.weekday) s = `${WEEKDAYS[weekdayMon0(key)]}, ${s}`
  return s
}

export function formatMonth(mk: string): string {
  const [y, m] = mk.split('-').map(Number)
  return `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]} ${y}`
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  let h = d.getHours()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${pad(d.getMinutes())} ${ampm}`
}

export function formatDateTime(iso: string): string {
  return `${formatDay(keyOfLocalDate(new Date(iso)))}, ${formatTime(iso)}`
}

/** Relative label: Today / Yesterday / 3 Nov */
export function relativeDay(key: string, today = todayKey()): string {
  const diff = diffDays(key, today)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) return `${diff} days ago`
  return formatDay(key, { year: parts(key).y !== parts(today).y })
}

/** ISO → value for <input type="datetime-local"> */
export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  return `${keyOfLocalDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> value → ISO. Returns null if invalid. */
export function fromLocalInput(v: string): string | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** A moment on a given day key at the current clock time (used when adding entries for a past day). */
export function atOnDay(key: string, base = new Date()): string {
  const { y, m, d } = parts(key)
  const t = new Date(base.getTime())
  t.setFullYear(y, m - 1, d)
  return t.toISOString()
}

export function hoursBetween(aIso: string, bIso: string): number {
  return (new Date(bIso).getTime() - new Date(aIso).getTime()) / 3600_000
}
