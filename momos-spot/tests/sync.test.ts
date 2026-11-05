import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/* ---------- a tiny fake of the Supabase "records" table, with the same rules as supabase/schema.sql ---------- */
interface Rec { owner: string; tbl: string; id: string; data: { updatedAt: string }; updated_at: string; deleted: boolean; server_updated_at: string }
const server = new Map<string, Rec>()
let clock = 0
const stamp = () => new Date(Date.UTC(2026, 0, 1) + ++clock).toISOString()

function query() {
  let since = ''
  let lim = 1000
  const q = {
    select: () => q,
    gt: (_c: string, v: string) => ((since = v), q),
    order: () => q,
    limit: (n: number) => ((lim = n), q),
    then: (res: (v: unknown) => void) => {
      const rows = [...server.values()].filter((r) => r.server_updated_at > since).sort((a, b) => (a.server_updated_at < b.server_updated_at ? -1 : 1)).slice(0, lim)
      res({ data: rows, error: null })
    },
  }
  return q
}
let signedIn = true
const fakeClient = {
  auth: { getSession: async () => ({ data: { session: signedIn ? { user: { id: 'u1' } } : null }, error: null }) },
  from: () => ({
    upsert: async (rows: Rec[]) => {
      for (const r of rows) {
        const k = `${r.owner}|${r.tbl}|${r.id}`
        const old = server.get(k)
        if (old && r.updated_at < old.updated_at) continue // trigger: never overwrite newer
        server.set(k, { ...r, server_updated_at: stamp() })
      }
      return { error: null }
    },
    select: () => query().select(),
  }),
}
vi.mock('../src/sync/config', () => ({
  readConfig: () => ({ url: 'https://x.supabase.co', anonKey: 'k' }),
  writeConfig: () => {},
  getClient: () => fakeClient,
}))
Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true })

const { db, ensureSeed, setMeta } = await import('../src/db')
const { addPurchases, createItem } = await import('../src/actions/stock')
const { saveSale } = await import('../src/actions/sales')
const { save } = await import('../src/db/write')
const { syncNow, getStatus } = await import('../src/sync/engine')

async function wipePhone() {
  await Promise.all(db.tables.map((t) => t.clear()))
  await ensureSeed()
}

beforeEach(async () => {
  signedIn = true
  server.clear()
  await wipePhone()
})

describe('offline-first sync', () => {
  it('waits quietly for sign-in when the cloud project is known but the phone is not signed in', async () => {
    signedIn = false
    const item = await createItem({ name: 'Paneer', categoryId: 'cat-meat', unit: 'kg' })
    await syncNow()
    expect(getStatus().state).toBe('signin')
    expect(getStatus().error).toBeUndefined()
    expect(await db.outbox.count()).toBeGreaterThan(0) // kept until sign-in
    signedIn = true
    await syncNow()
    expect(getStatus().state).toBe('idle')
    expect([...server.values()].some((r) => r.id === item.id)).toBe(true)
  })

  it('queues changes made offline and uploads them later', async () => {
    const onion = await createItem({ name: 'Onion', categoryId: 'cat-veg', unit: 'kg' })
    await addPurchases([{ itemId: onion.id, qty: 2, unit: 'kg', amount: 8000, at: new Date().toISOString(), payMode: 'cash' }])
    expect(await db.outbox.count()).toBeGreaterThan(0)
    await syncNow()
    expect(getStatus().state).toBe('idle')
    expect(await db.outbox.count()).toBe(0)
    expect([...server.values()].some((r) => r.tbl === 'purchases')).toBe(true)
    // seed rows (default categories) are never uploaded
    expect([...server.values()].some((r) => r.tbl === 'stockCategories')).toBe(false)
  })

  it('restores everything on a new phone', async () => {
    await saveSale({ lines: [{ key: 'a', name: 'Veg Momos', price: 9000, qty: 2 }], isDelivery: false, deliveryFee: 0, discount: 0, customer: { mode: 'new', name: 'Rahul' }, cashTendered: 20000, online: 0, redeemRewardIds: [] })
    await syncNow()
    await wipePhone()
    await setMeta('lastPullAt', '1970-01-01T00:00:00Z')
    expect(await db.sales.count()).toBe(0)
    await syncNow()
    const sales = await db.sales.toArray()
    expect(sales).toHaveLength(1)
    expect(sales[0]).toMatchObject({ total: 18000, change: 2000 })
    expect(await db.customers.count()).toBe(1)
  })

  it('never lets an older copy overwrite a newer one', async () => {
    const item = await createItem({ name: 'Mayo', categoryId: 'cat-packaged', unit: 'packet' })
    await syncNow()
    // newer edit uploaded
    await save<typeof item>('items', { ...item, name: 'Mayo (Veeba)' })
    await syncNow()
    // a stale upload arrives late
    await fakeClient.from().upsert([{ owner: 'u1', tbl: 'items', id: item.id, data: item, updated_at: item.updatedAt, deleted: false } as never])
    const onServer = [...server.values()].find((r) => r.id === item.id)!
    expect((onServer.data as unknown as { name: string }).name).toBe('Mayo (Veeba)')
  })

  it('uploads a waiting local change first, then the newest version wins everywhere', async () => {
    const item = await createItem({ name: 'Cabbage', categoryId: 'cat-veg', unit: 'kg' })
    await syncNow()
    // the server has a different version, but this phone has an unsent edit
    server.set(`u1|items|${item.id}`, { owner: 'u1', tbl: 'items', id: item.id, data: { ...item, name: 'Server name', updatedAt: '2099-01-01T00:00:00.000Z' } as never, updated_at: '2099-01-01T00:00:00.000Z', deleted: false, server_updated_at: stamp() })
    await db.items.put({ ...item, name: 'Local name' })
    await db.outbox.add({ table: 'items', rowId: item.id, at: new Date().toISOString() })
    // pull happens after push inside syncNow; push uploads the local edit first, server keeps newer (2099)
    await syncNow()
    const local = await db.items.get(item.id)
    expect(local?.name).toBe('Server name')
  })
})
