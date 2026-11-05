import { useLiveQuery } from 'dexie-react-hooks'
import { alive, db } from '../../db'
import type { CreditPayment, CustomerReward, Cylinder, Expense, Purchase, Recurring, Sale } from '../../db/types'
import { dayKey } from '../../lib/dates'
import { summarize, type DaySummary } from '../../lib/calc/summary'

export interface GasEvent {
  day: string
  at: string
  kind: 'bought' | 'connected' | 'empty'
  c: Cylinder
}

export interface RangeData {
  sales: Sale[]
  purchases: Purchase[]
  expenses: Expense[]
  credit: CreditPayment[]
  recurring: Recurring[]
  gas: GasEvent[]
  redeemed: CustomerReward[]
  days: Map<string, DaySummary>
}

/** Everything that happened between two days, plus a per-day money summary. */
export function useRangeData(from: string, to: string, cutoff: number): RangeData | undefined {
  return useLiveQuery(async () => {
    const between = <T,>(t: 'sales' | 'purchases' | 'expenses' | 'creditPayments') =>
      db.table(t).where('day').between(from, to, true, true).toArray() as Promise<T[]>
    const [sales, purchases, expenses, credit, recurring, cylinders, rewards] = await Promise.all([
      between<Sale>('sales'),
      between<Purchase>('purchases'),
      between<Expense>('expenses'),
      between<CreditPayment>('creditPayments'),
      db.recurring.toArray(),
      db.cylinders.toArray(),
      db.rewards.where('status').equals('redeemed').toArray(),
    ])
    const gas: GasEvent[] = []
    for (const c of alive(cylinders)) {
      const push = (at: string | undefined, kind: GasEvent['kind']) => {
        if (!at) return
        const day = dayKey(at, cutoff)
        if (day >= from && day <= to) gas.push({ day, at, kind, c })
      }
      if (c.purchaseId) push(c.boughtAt, 'bought')
      push(c.connectedAt, 'connected')
      push(c.emptiedAt, 'empty')
    }
    const redeemed = alive(rewards).filter((r) => r.redeemedAt && dayKey(r.redeemedAt, cutoff) >= from && dayKey(r.redeemedAt, cutoff) <= to)
    const d = {
      sales: alive(sales),
      purchases: alive(purchases),
      expenses: alive(expenses),
      credit: alive(credit),
      recurring: alive(recurring),
    }
    return {
      ...d,
      gas: gas.sort((a, b) => (a.at < b.at ? -1 : 1)),
      redeemed,
      days: summarize(from, to, { ...d, creditPayments: d.credit }),
    }
  }, [from, to, cutoff])
}
