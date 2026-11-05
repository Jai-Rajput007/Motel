import type { CreditPayment, Expense, Purchase, Recurring, Sale } from '../../db/types'
import { eachDay } from '../dates'
import { dailyShare } from './recurring'

export interface DaySummary {
  day: string
  sales: number
  orders: number
  voided: number
  delivery: number
  /** money actually received for sales on the day (cash kept + online) */
  cashIn: number
  onlineIn: number
  creditGiven: number
  creditCollected: number
  creditCollectedCash: number
  creditCollectedOnline: number
  purchases: number
  purchasesCash: number
  expensesOneTime: number
  expensesRecurring: number
  expensesCash: number
  recurringShare: number
  /** sales − stock − one-time spends − fixed-cost share */
  profitSpread: number
  /** sales − stock − everything actually paid that day */
  profitCash: number
}

export function emptyDay(day: string): DaySummary {
  return {
    day, sales: 0, orders: 0, voided: 0, delivery: 0, cashIn: 0, onlineIn: 0, creditGiven: 0, creditCollected: 0,
    creditCollectedCash: 0, creditCollectedOnline: 0, purchases: 0, purchasesCash: 0, expensesOneTime: 0,
    expensesRecurring: 0, expensesCash: 0, recurringShare: 0, profitSpread: 0, profitCash: 0,
  }
}

export interface SummaryInput {
  sales: Sale[]
  purchases: Purchase[]
  expenses: Expense[]
  recurring: Recurring[]
  creditPayments: CreditPayment[]
}

export function summarize(from: string, to: string, d: SummaryInput): Map<string, DaySummary> {
  const map = new Map<string, DaySummary>()
  for (const day of eachDay(from, to)) map.set(day, emptyDay(day))
  for (const s of d.sales) {
    if (s.deletedAt) continue
    const x = map.get(s.day)
    if (!x) continue
    if (s.status === 'void') {
      x.voided++
      continue
    }
    x.sales += s.total
    x.orders++
    if (s.isDelivery) x.delivery++
    x.cashIn += s.cash
    x.onlineIn += s.online
    x.creditGiven += s.credit
  }
  for (const c of d.creditPayments) {
    if (c.deletedAt) continue
    const x = map.get(c.day)
    if (!x) continue
    x.creditCollected += c.amount
    x.creditCollectedCash += c.cash
    x.creditCollectedOnline += c.online
  }
  for (const p of d.purchases) {
    if (p.deletedAt) continue
    const x = map.get(p.day)
    if (!x) continue
    x.purchases += p.amount
    if (p.payMode === 'cash') x.purchasesCash += p.amount
  }
  for (const e of d.expenses) {
    if (e.deletedAt) continue
    const x = map.get(e.day)
    if (!x) continue
    if (e.recurringId) x.expensesRecurring += e.amount
    else x.expensesOneTime += e.amount
    if (e.payMode === 'cash') x.expensesCash += e.amount
  }
  const rec = d.recurring.filter((r) => !r.deletedAt)
  for (const x of map.values()) {
    x.recurringShare = rec.reduce((s, r) => s + dailyShare(r, x.day), 0)
    x.profitSpread = x.sales - x.purchases - x.expensesOneTime - x.recurringShare
    x.profitCash = x.sales - x.purchases - x.expensesOneTime - x.expensesRecurring
  }
  return map
}

export function totalOf(days: DaySummary[]): DaySummary {
  const t = emptyDay('total')
  for (const d of days) {
    for (const k of Object.keys(t) as (keyof DaySummary)[]) {
      if (k === 'day') continue
      ;(t[k] as number) += d[k] as number
    }
  }
  return t
}

export function profitOf(d: DaySummary, mode: 'spread' | 'cash') {
  return mode === 'spread' ? d.profitSpread : d.profitCash
}
