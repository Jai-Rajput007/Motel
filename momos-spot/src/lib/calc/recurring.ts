import type { Expense, Recurring } from '../../db/types'
import { addDays, daysInMonth, diffDays, makeKey, monthBounds, monthKey, parts } from '../dates'

/** Amount in force on a date (amount changes are kept as history, never rewritten). */
export function amountOn(r: Recurring, day: string): number {
  const sorted = [...r.amounts].sort((a, b) => (a.from < b.from ? -1 : 1))
  let amt = sorted[0]?.amount ?? 0
  for (const a of sorted) if (a.from <= day) amt = a.amount
  return amt
}

function periodDays(r: Recurring): number {
  switch (r.frequency) {
    case 'daily': return 1
    case 'weekly': return 7
    case 'every_n_days': return Math.max(1, r.intervalN ?? 1)
    default: return 0
  }
}

/** The k-th (0-based) scheduled due date. */
function nth(r: Recurring, k: number): string {
  const s = parts(r.startsOn)
  switch (r.frequency) {
    case 'daily':
    case 'weekly':
    case 'every_n_days':
      return addDays(r.startsOn, k * periodDays(r))
    case 'monthly': {
      const want = r.dueDay ?? s.d
      // first month: if the due day is before the start day, start next month
      const offset = want < s.d ? 1 : 0
      const t = s.y * 12 + (s.m - 1) + offset + k
      const y = Math.floor(t / 12)
      const m = (t % 12) + 1
      return makeKey(y, m, Math.min(want, daysInMonth(y, m)))
    }
    case 'yearly': {
      const y = s.y + k
      return makeKey(y, s.m, Math.min(s.d, daysInMonth(y, s.m)))
    }
  }
}

/** Index of the first occurrence on or after `day` (an estimate that is then corrected). */
function firstIndexFrom(r: Recurring, day: string): number {
  if (day <= r.startsOn) return 0
  let k: number
  switch (r.frequency) {
    case 'daily':
    case 'weekly':
    case 'every_n_days':
      k = Math.floor(diffDays(r.startsOn, day) / periodDays(r))
      break
    case 'monthly': {
      const s = parts(r.startsOn)
      const d = parts(day)
      k = (d.y - s.y) * 12 + (d.m - s.m) - 1
      break
    }
    case 'yearly':
      k = parts(day).y - parts(r.startsOn).y - 1
      break
  }
  k = Math.max(0, k)
  while (k > 0 && nth(r, k - 1) >= day) k--
  while (nth(r, k) < day) k++
  return k
}

export function isPaused(r: Recurring, day: string): boolean {
  return (r.pauses ?? []).some((p) => day >= p.from && (!p.to || day <= p.to))
}

export interface Occurrence {
  date: string
  index: number
  amount: number
}

/** Due dates in [from, to], respecting start, end, number of instalments and pause. */
export function occurrences(r: Recurring, from: string, to: string): Occurrence[] {
  if (r.deletedAt) return []
  const out: Occurrence[] = []
  let k = firstIndexFrom(r, from)
  for (let guard = 0; guard < 5000; guard++, k++) {
    if (r.installments && k >= r.installments) break
    const date = nth(r, k)
    if (date > to) break
    if (r.endsOn && date > r.endsOn) break
    if (date < r.startsOn) continue
    if (isPaused(r, date)) continue
    out.push({ date, index: k, amount: amountOn(r, date) })
  }
  return out
}

export function lastOccurrenceDate(r: Recurring): string | null {
  if (r.installments) return nth(r, r.installments - 1)
  return r.endsOn ?? null
}

export type OccStatus = 'paid' | 'partial' | 'due' | 'overdue' | 'upcoming'

export interface OccurrenceWithStatus extends Occurrence {
  paid: number
  status: OccStatus
  recurring: Recurring
}

export function withStatus(r: Recurring, occs: Occurrence[], expenses: Expense[], today: string): OccurrenceWithStatus[] {
  return occs.map((o) => {
    const paid = expenses
      .filter((e) => !e.deletedAt && e.recurringId === r.id && e.dueDate === o.date)
      .reduce((s, e) => s + e.amount, 0)
    let status: OccStatus
    if (paid >= o.amount && o.amount > 0) status = 'paid'
    else if (paid > 0) status = 'partial'
    else if (o.date < today) status = 'overdue'
    else if (o.date === today) status = 'due'
    else status = 'upcoming'
    if (o.amount === 0) status = 'paid'
    return { ...o, paid, status, recurring: r }
  })
}

/**
 * The share of a recurring cost that belongs to one day, used for "spread" profit.
 * Monthly costs are spread over the days of their calendar month, others over their period.
 */
export function dailyShare(r: Recurring, day: string): number {
  if (r.deletedAt) return 0
  switch (r.frequency) {
    case 'daily':
      return occurrences(r, day, day).reduce((s, o) => s + o.amount, 0)
    case 'monthly': {
      const [a, b] = monthBounds(monthKey(day))
      const occ = occurrences(r, a, b)
      if (occ.length === 0) return 0
      const p = parts(day)
      return occ.reduce((s, o) => s + o.amount, 0) / daysInMonth(p.y, p.m)
    }
    case 'yearly': {
      const back = addDays(day, -365)
      const occ = occurrences(r, addDays(back, 1), day)
      if (occ.length === 0) return 0
      return occ[occ.length - 1].amount / 365
    }
    case 'weekly':
    case 'every_n_days': {
      const len = periodDays(r)
      const occ = occurrences(r, addDays(day, -(len - 1)), day)
      if (occ.length === 0) return 0
      return occ[occ.length - 1].amount / len
    }
  }
}

/** Sum of daily shares over a range (float paise; round when displaying). */
export function rangeShare(list: Recurring[], from: string, to: string): number {
  let s = 0
  for (let d = from; d <= to; d = addDays(d, 1)) for (const r of list) s += dailyShare(r, d)
  return s
}

/** Average fixed cost per day for the given month. */
export function fixedCostPerDay(list: Recurring[], mk: string): number {
  const [a, b] = monthBounds(mk)
  const days = diffDays(a, b) + 1
  return rangeShare(list, a, b) / days
}

export interface DeductionMeter {
  dueSoFar: number
  paidSoFar: number
  pending: number
  monthTotal: number
}

/** "Up to today this much should have gone out this month; this much is paid." */
export function deductionMeter(list: Recurring[], expenses: Expense[], today: string): DeductionMeter {
  const [a, b] = monthBounds(monthKey(today))
  let dueSoFar = 0
  let paidSoFar = 0
  let monthTotal = 0
  for (const r of list) {
    const occ = withStatus(r, occurrences(r, a, b), expenses, today)
    for (const o of occ) {
      monthTotal += o.amount
      if (o.date <= today) {
        dueSoFar += o.amount
        paidSoFar += Math.min(o.paid, o.amount)
      }
    }
  }
  return { dueSoFar, paidSoFar, pending: Math.max(0, dueSoFar - paidSoFar), monthTotal }
}

export interface EmiProgress {
  done: number
  total: number
  paidAmount: number
  leftAmount: number
  endDate: string | null
}

export function emiProgress(r: Recurring, expenses: Expense[]): EmiProgress | null {
  if (!r.installments) return null
  const all = occurrences(r, r.startsOn, nth(r, r.installments - 1))
  const st = withStatus(r, all, expenses, '9999-12-31')
  const done = st.filter((o) => o.status === 'paid').length
  const paidAmount = st.reduce((s, o) => s + Math.min(o.paid, o.amount), 0)
  const totalAmount = st.reduce((s, o) => s + o.amount, 0)
  return { done, total: r.installments, paidAmount, leftAmount: totalAmount - paidAmount, endDate: lastOccurrenceDate(r) }
}

/** Deterministic id for auto-marked payments, so they can never be created twice. */
export function autoExpenseId(r: Recurring, date: string) {
  return `auto-${r.id}-${date}`
}
