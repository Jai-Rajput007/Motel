import { useLiveQuery } from 'dexie-react-hooks'
import { alive, db } from '../../db'
import type { Item, Purchase, Restock, StockCategory } from '../../db/types'
import { diffDays, keyOfLocalDate } from '../../lib/dates'
import { unitPrice } from '../../lib/units'

export interface StockData {
  items: Item[]
  itemsById: Map<string, Item>
  categories: StockCategory[]
  catById: Map<string, StockCategory>
  purchases: Purchase[]
  byItem: Map<string, Purchase[]>
  restock: Restock[]
}

export function useStock(): StockData | undefined {
  return useLiveQuery(async () => {
    const [items, categories, purchases, restock] = await Promise.all([
      db.items.toArray(),
      db.stockCategories.toArray(),
      db.purchases.toArray(),
      db.restock.toArray(),
    ])
    const ps = alive(purchases).sort((a, b) => (a.at < b.at ? 1 : -1))
    const byItem = new Map<string, Purchase[]>()
    for (const p of ps) {
      const l = byItem.get(p.itemId)
      if (l) l.push(p)
      else byItem.set(p.itemId, [p])
    }
    const it = alive(items).filter((i) => !i.mergedIntoId)
    const cats = alive(categories).sort((a, b) => a.sort - b.sort)
    return {
      items: it.sort((a, b) => a.name.localeCompare(b.name)),
      itemsById: new Map(items.map((i) => [i.id, i])),
      categories: cats,
      catById: new Map(cats.map((c) => [c.id, c])),
      purchases: ps,
      byItem,
      restock: alive(restock),
    }
  }, [])
}

/** Items bought most often recently: used for one-tap chips. */
export function frequentItems(d: StockData, limit = 10): Item[] {
  const since = new Date(Date.now() - 60 * 86400_000).toISOString()
  const count = new Map<string, number>()
  for (const p of d.purchases) if (p.at >= since) count.set(p.itemId, (count.get(p.itemId) ?? 0) + 1)
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => d.itemsById.get(id))
    .filter((i): i is Item => !!i && !i.deletedAt && !i.archived)
    .slice(0, limit)
}

export interface ItemStats {
  last?: Purchase
  avgUnit: number | null
  minUnit: number | null
  maxUnit: number | null
  baseUnit?: string
  count: number
  spentMonth: number
}

export function itemStats(list: Purchase[] = [], month = keyOfLocalDate(new Date()).slice(0, 7)): ItemStats {
  const recent = list.slice(0, 10)
  const ups = recent.map((p) => unitPrice(p.amount, p.qty, p.unit)).filter((x): x is NonNullable<typeof x> => !!x)
  const base = ups[0]?.unit
  const same = ups.filter((u) => u.unit === base).map((u) => u.price)
  return {
    last: list[0],
    avgUnit: same.length ? same.reduce((a, b) => a + b, 0) / same.length : null,
    minUnit: same.length ? Math.min(...same) : null,
    maxUnit: same.length ? Math.max(...same) : null,
    baseUnit: base,
    count: list.length,
    spentMonth: list.filter((p) => p.day.startsWith(month)).reduce((s, p) => s + p.amount, 0),
  }
}

/** How many days the stock bought before `at` lasted. */
export function lastedDays(list: Purchase[] = [], at: string): number | null {
  const before = list.find((p) => p.at <= at)
  if (!before) return null
  return diffDays(before.day, keyOfLocalDate(new Date(at)))
}
