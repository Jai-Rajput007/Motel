import type { Cylinder } from '../../db/types'

const DAY = 86400_000

export interface GasStats {
  inUse: Cylinder | null
  spares: Cylinder[]
  finished: { c: Cylinder; days: number }[]
  avgLifeDays: number | null
  currentDays: number | null
  daysLeft: number | null
  predictedEmptyAt: string | null
  avgPrice: number | null
  costPerDay: number | null
  warnNoSpare: boolean
}

export function gasStats(cylinders: Cylinder[], now = new Date()): GasStats {
  const list = cylinders.filter((c) => !c.deletedAt)
  const inUse = list.filter((c) => c.status === 'in_use').sort((a, b) => ((a.connectedAt ?? '') < (b.connectedAt ?? '') ? 1 : -1))[0] ?? null
  const spares = list.filter((c) => c.status === 'in_stock').sort((a, b) => (a.boughtAt < b.boughtAt ? -1 : 1))
  const finished = list
    .filter((c) => c.connectedAt && c.emptiedAt && c.emptiedAt > c.connectedAt)
    .sort((a, b) => (a.emptiedAt! < b.emptiedAt! ? 1 : -1))
    .map((c) => ({ c, days: (new Date(c.emptiedAt!).getTime() - new Date(c.connectedAt!).getTime()) / DAY }))
  const recent = finished.slice(0, 6)
  const avgLifeDays = recent.length ? recent.reduce((s, x) => s + x.days, 0) / recent.length : null
  const currentDays = inUse?.connectedAt ? Math.max(0, (now.getTime() - new Date(inUse.connectedAt).getTime()) / DAY) : null
  const daysLeft = avgLifeDays !== null && currentDays !== null ? avgLifeDays - currentDays : null
  const predictedEmptyAt =
    avgLifeDays !== null && inUse?.connectedAt ? new Date(new Date(inUse.connectedAt).getTime() + avgLifeDays * DAY).toISOString() : null
  const priced = [...list].sort((a, b) => (a.boughtAt < b.boughtAt ? 1 : -1)).slice(0, 6)
  const avgPrice = priced.length ? priced.reduce((s, c) => s + c.price, 0) / priced.length : null
  const costPerDay = avgPrice !== null && avgLifeDays ? avgPrice / avgLifeDays : null
  const warnNoSpare = spares.length === 0 && (!inUse || daysLeft === null || daysLeft <= 3)
  return { inUse, spares, finished, avgLifeDays, currentDays, daysLeft, predictedEmptyAt, avgPrice, costPerDay, warnNoSpare }
}
