import type { Table } from 'dexie'
import { db, type SyncTable } from './index'
import type { Base } from './types'

type Listener = () => void
const listeners = new Set<Listener>()

/** The sync engine subscribes here so it can upload soon after a change. */
export function onLocalChange(fn: Listener) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function table(name: SyncTable): Table<Base, string> {
  return db.table(name) as Table<Base, string>
}

type Draft<T extends Base> = Omit<T, 'createdAt' | 'updatedAt'> & Partial<Pick<T, 'createdAt' | 'updatedAt'>>

/**
 * Save rows locally and queue them for upload, in one transaction.
 * Safe to call inside an outer `atomic()` transaction.
 */
export async function save<T extends Base>(name: SyncTable, rows: Draft<T> | Draft<T>[]): Promise<T[]> {
  const list = (Array.isArray(rows) ? rows : [rows]) as T[]
  if (list.length === 0) return []
  const now = new Date().toISOString()
  // Keep updatedAt strictly increasing per call so sync ordering is stable even on fast repeated saves.
  const out: T[] = list.map((r) => ({ ...r, createdAt: r.createdAt && r.createdAt > '1971' ? r.createdAt : now, updatedAt: now }))
  await db.transaction('rw', [table(name), db.outbox], async () => {
    await table(name).bulkPut(out)
    await db.outbox.bulkAdd(out.map((r) => ({ table: name, rowId: r.id, at: now })))
  })
  queueMicrotask(() => listeners.forEach((l) => l()))
  return out
}

/** Soft delete: the row stays (marked deleted) so the deletion syncs too. */
export async function remove(name: SyncTable, id: string) {
  const row = await table(name).get(id)
  if (!row || row.deletedAt) return
  await save(name, { ...row, deletedAt: new Date().toISOString() })
}

/** Run several saves as one all-or-nothing transaction. */
export async function atomic<R>(names: SyncTable[], fn: () => Promise<R>): Promise<R> {
  return db.transaction('rw', [...names.map(table), db.outbox], fn)
}
