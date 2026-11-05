import { alive, db, GAS_ITEM_ID } from '../db'
import type { Cylinder, PayMode } from '../db/types'
import { atomic, remove, save } from '../db/write'
import { uid } from '../lib/ids'
import { UserError } from './common'
import { addPurchases } from './stock'

export async function buyGas(o: { count: number; total: number; at: string; payMode: PayMode; supplier?: string; note?: string }) {
  if (!(o.count >= 1) || !Number.isInteger(o.count)) throw new UserError('Number of cylinders must be 1 or more.')
  return addPurchases([{ itemId: GAS_ITEM_ID, qty: o.count, unit: 'cylinder', amount: o.total, at: o.at, payMode: o.payMode, vendor: o.supplier, note: o.note }])
}

/** A cylinder you already had before using the app (no purchase is recorded). */
export async function addExistingCylinder(o: { inUse: boolean; at: string; price: number }) {
  await save<Cylinder>('cylinders', {
    id: uid(), price: o.price, boughtAt: o.at, status: o.inUse ? 'in_use' : 'in_stock', connectedAt: o.inUse ? o.at : undefined, note: 'Added as existing cylinder',
  })
}

/** Connect a spare cylinder. The one currently in use is marked empty at the same moment. */
export async function connectCylinder(id: string, at: string, emptyPrevious = true) {
  if (new Date(at).getTime() > Date.now() + 15 * 60_000) throw new UserError('That date & time is in the future.')
  await atomic(['cylinders'], async () => {
    const c = await db.cylinders.get(id)
    if (!c || c.deletedAt) throw new UserError('Cylinder not found.')
    if (c.status !== 'in_stock') throw new UserError('This cylinder is not a spare.')
    const current = alive(await db.cylinders.where('status').equals('in_use').toArray())
    for (const p of current) {
      if (p.connectedAt && at < p.connectedAt) throw new UserError('The new connection time is before the current cylinder was connected.')
      if (emptyPrevious) await save<Cylinder>('cylinders', { ...p, status: 'empty', emptiedAt: at })
    }
    await save<Cylinder>('cylinders', { ...c, status: 'in_use', connectedAt: at })
  })
}

export async function markEmpty(id: string, at: string) {
  if (new Date(at).getTime() > Date.now() + 15 * 60_000) throw new UserError('That date & time is in the future.')
  const c = await db.cylinders.get(id)
  if (!c) return
  if (c.connectedAt && at < c.connectedAt) throw new UserError('Empty time is before it was connected.')
  await save<Cylinder>('cylinders', { ...c, status: 'empty', emptiedAt: at })
}

export async function updateCylinder(c: Cylinder, ch: Partial<Pick<Cylinder, 'connectedAt' | 'emptiedAt' | 'status' | 'note'>>) {
  const next = { ...c, ...ch }
  if (next.connectedAt && next.emptiedAt && next.emptiedAt < next.connectedAt) throw new UserError('Empty time must be after the connect time.')
  if (next.status === 'in_stock') {
    next.connectedAt = undefined
    next.emptiedAt = undefined
  }
  if (next.status === 'in_use') next.emptiedAt = undefined
  await save<Cylinder>('cylinders', next)
}

export async function deleteCylinder(c: Cylinder) {
  if (c.purchaseId) throw new UserError('This cylinder came from a purchase. Delete the purchase instead.')
  await remove('cylinders', c.id)
}
