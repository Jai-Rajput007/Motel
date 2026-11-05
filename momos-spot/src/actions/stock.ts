import { alive, db, GAS_ITEM_ID } from '../db'
import type { Cylinder, Item, PayMode, Purchase, Restock, Trip, Unit } from '../db/types'
import { atomic, remove, save } from '../db/write'
import { nameKey, tidyName, uid } from '../lib/ids'
import { splitEven } from '../lib/money'
import { bizDay, UserError } from './common'

export async function findItemByName(name: string): Promise<Item | undefined> {
  const k = nameKey(name)
  const list = alive(await db.items.where('nameKey').equals(k).toArray()).filter((i) => !i.mergedIntoId)
  return list[0]
}

export async function createItem(input: { name: string; categoryId: string; unit: Unit; alias?: string }): Promise<Item> {
  const name = tidyName(input.name)
  if (!name) throw new UserError('Enter a name.')
  const existing = await findItemByName(name)
  if (existing) {
    if (existing.archived) await save<Item>('items', { ...existing, archived: false })
    return existing
  }
  const [row] = await save<Item>('items', {
    id: uid(), name, nameKey: nameKey(name), categoryId: input.categoryId, unit: input.unit, alias: input.alias?.trim() || undefined,
  })
  return row
}

export async function updateItem(item: Item, changes: Partial<Pick<Item, 'name' | 'alias' | 'categoryId' | 'unit' | 'archived'>>) {
  const next = { ...item, ...changes }
  if (changes.name !== undefined) {
    const name = tidyName(changes.name)
    if (!name) throw new UserError('Enter a name.')
    const clash = await findItemByName(name)
    if (clash && clash.id !== item.id) throw new UserError(`"${clash.name}" already exists. Use Merge to combine them.`)
    next.name = name
    next.nameKey = nameKey(name)
  }
  await save<Item>('items', next)
}

/** Move all history from one item to another and hide the first. */
export async function mergeItems(fromId: string, intoId: string) {
  if (fromId === intoId || fromId === GAS_ITEM_ID) throw new UserError('Choose a different item.')
  await atomic(['items', 'purchases', 'restock'], async () => {
    const from = await db.items.get(fromId)
    if (!from) return
    const ps = await db.purchases.where('itemId').equals(fromId).toArray()
    if (ps.length) await save<Purchase>('purchases', ps.map((p) => ({ ...p, itemId: intoId })))
    const rs = await db.restock.where('itemId').equals(fromId).toArray()
    if (rs.length) await save<Restock>('restock', rs.map((r) => ({ ...r, itemId: intoId })))
    await save<Item>('items', { ...from, mergedIntoId: intoId, deletedAt: new Date().toISOString() })
  })
}

export interface PurchaseInput {
  itemId: string
  qty: number
  unit: Unit
  amount: number
  at: string
  payMode: PayMode
  vendor?: string
  note?: string
}

function validate(p: PurchaseInput) {
  if (!p.itemId) throw new UserError('Choose an item.')
  if (!(p.qty > 0)) throw new UserError('Quantity must be more than 0.')
  if (!(p.amount > 0)) throw new UserError('Enter the price paid.')
  if (p.amount > 100_000_00 * 10) throw new UserError('That price looks too large. Please check it.')
}

/** Save one or more purchases (a market trip). Also clears these items from the shopping list and adds gas cylinders. */
export async function addPurchases(inputs: PurchaseInput[], trip?: { vendor?: string; declaredTotal?: number; note?: string }) {
  if (inputs.length === 0) throw new UserError('Add at least one item.')
  inputs.forEach(validate)
  const days = await Promise.all(inputs.map((p) => bizDay(p.at)))
  return atomic(['trips', 'purchases', 'restock', 'cylinders'], async () => {
    let tripId: string | undefined
    if (inputs.length > 1 || trip?.declaredTotal) {
      tripId = uid()
      await save<Trip>('trips', {
        id: tripId, at: inputs[0].at, day: days[0], vendor: trip?.vendor?.trim() || undefined, declaredTotal: trip?.declaredTotal, note: trip?.note,
      })
    }
    const rows = await save<Purchase>(
      'purchases',
      inputs.map((p, i) => ({
        id: uid(), itemId: p.itemId, tripId, qty: p.qty, unit: p.unit, amount: p.amount, at: p.at, day: days[i], payMode: p.payMode,
        vendor: (p.vendor ?? trip?.vendor)?.trim() || undefined, note: p.note?.trim() || undefined,
      })),
    )
    const open = (await db.restock.toArray()).filter((r) => !r.deletedAt && !r.resolvedAt)
    const resolved: Restock[] = []
    for (const p of rows) {
      for (const r of open) if (r.itemId === p.itemId && r.at <= p.at) resolved.push({ ...r, resolvedAt: p.at, resolvedPurchaseId: p.id })
      if (p.itemId === GAS_ITEM_ID) {
        const n = Math.max(1, Math.round(p.qty))
        const prices = splitEven(p.amount, n)
        await save<Cylinder>('cylinders', prices.map((price) => ({ id: uid(), purchaseId: p.id, price, boughtAt: p.at, status: 'in_stock' as const, supplier: p.vendor })))
      }
    }
    if (resolved.length) await save<Restock>('restock', resolved)
    return rows
  })
}

export async function updatePurchase(p: Purchase, changes: Partial<PurchaseInput>) {
  const next = { ...p, ...changes }
  validate(next)
  if (p.itemId === GAS_ITEM_ID || next.itemId === GAS_ITEM_ID) {
    if (p.itemId !== next.itemId || Math.round(p.qty) !== Math.round(next.qty))
      throw new UserError('For gas, delete this purchase and add it again to change the item or number of cylinders.')
  }
  const day = await bizDay(next.at)
  await atomic(['purchases', 'cylinders'], async () => {
    await save<Purchase>('purchases', { ...next, day, vendor: next.vendor?.trim() || undefined, note: next.note?.trim() || undefined })
    if (next.itemId === GAS_ITEM_ID) {
      const cyl = alive(await db.cylinders.toArray()).filter((c) => c.purchaseId === p.id)
      const prices = splitEven(next.amount, cyl.length)
      if (cyl.length) await save<Cylinder>('cylinders', cyl.map((c, i) => ({ ...c, price: prices[i], boughtAt: next.at })))
    }
  })
}

export async function deletePurchase(p: Purchase) {
  await atomic(['purchases', 'cylinders', 'restock'], async () => {
    if (p.itemId === GAS_ITEM_ID) {
      const cyl = alive(await db.cylinders.toArray()).filter((c) => c.purchaseId === p.id)
      if (cyl.some((c) => c.status !== 'in_stock'))
        throw new UserError('A cylinder from this purchase has already been connected. Fix the gas history first.')
      for (const c of cyl) await remove('cylinders', c.id)
    }
    const rs = (await db.restock.where('itemId').equals(p.itemId).toArray()).filter((r) => r.resolvedPurchaseId === p.id)
    if (rs.length) await save<Restock>('restock', rs.map((r) => ({ ...r, resolvedAt: undefined, resolvedPurchaseId: undefined })))
    await remove('purchases', p.id)
  })
}

export async function markFinished(itemId: string, note?: string) {
  const open = alive(await db.restock.where('itemId').equals(itemId).toArray()).find((r) => !r.resolvedAt)
  if (open) {
    if (note !== undefined) await save<Restock>('restock', { ...open, note: note.trim() || open.note })
    return open
  }
  const [r] = await save<Restock>('restock', { id: uid(), itemId, at: new Date().toISOString(), note: note?.trim() || undefined })
  return r
}

export async function resolveRestock(r: Restock) {
  await save<Restock>('restock', { ...r, resolvedAt: new Date().toISOString() })
}

export async function reopenRestock(r: Restock) {
  await save<Restock>('restock', { ...r, resolvedAt: undefined, resolvedPurchaseId: undefined })
}
