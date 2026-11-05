import { useLiveQuery } from 'dexie-react-hooks'
import { alive, db } from '../../db'
import type { Customer, LoyaltyRule, MenuCategory, MenuItem, OfferNote } from '../../db/types'

export interface CustomerStat {
  visits: number
  spent: number
  lastDay?: string
  credit: number
}

export function useMenu() {
  return useLiveQuery(async () => {
    const [cats, items] = await Promise.all([db.menuCategories.toArray(), db.menuItems.toArray()])
    const categories = alive(cats).sort((a, b) => a.sort - b.sort) as MenuCategory[]
    const all = alive(items) as MenuItem[]
    const order = new Map(categories.map((c, i) => [c.id, i]))
    const active = all.filter((m) => !m.archived).sort((a, b) => (order.get(a.categoryId) ?? 99) - (order.get(b.categoryId) ?? 99) || a.sort - b.sort)
    return { categories, items: active, all }
  }, [])
}

/** Visits, spend and credit for every customer. */
export function useCustomerStats() {
  return useLiveQuery(async () => {
    const [customers, sales, payments] = await Promise.all([db.customers.toArray(), db.sales.toArray(), db.creditPayments.toArray()])
    const stats = new Map<string, CustomerStat>()
    const get = (id: string) => {
      let s = stats.get(id)
      if (!s) stats.set(id, (s = { visits: 0, spent: 0, credit: 0 }))
      return s
    }
    for (const s of sales) {
      if (s.deletedAt || s.status !== 'done' || !s.customerId) continue
      const x = get(s.customerId)
      x.visits++
      x.spent += s.total
      x.credit += s.credit
      if (!x.lastDay || s.day > x.lastDay) x.lastDay = s.day
    }
    for (const p of payments) if (!p.deletedAt) get(p.customerId).credit -= p.amount
    return { customers: alive(customers) as Customer[], stats }
  }, [])
}

/** Top sellers in the last 30 days, by quantity. */
export function usePopular() {
  return useLiveQuery(async () => {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString()
    const sales = await db.sales.where('at').above(since).toArray()
    const qty = new Map<string, number>()
    for (const s of sales) {
      if (s.deletedAt || s.status !== 'done') continue
      for (const l of s.lines) if (l.menuItemId && !l.isReward) qty.set(l.menuItemId, (qty.get(l.menuItemId) ?? 0) + l.qty)
    }
    return qty
  }, [])
}

export function useOffersData() {
  return useLiveQuery(async () => {
    const [rules, notes] = await Promise.all([db.loyaltyRules.toArray(), db.offerNotes.toArray()])
    return { rules: alive(rules) as LoyaltyRule[], notes: alive(notes) as OfferNote[] }
  }, [])
}
