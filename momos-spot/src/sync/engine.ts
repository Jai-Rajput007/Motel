import { db, getMeta, setMeta, SYNC_TABLES, type SyncTable } from '../db'
import type { Base } from '../db/types'
import { onLocalChange } from '../db/write'
import { getClient, readConfig, writeConfig, type CloudConfig } from './config'

export type SyncState = 'off' | 'offline' | 'idle' | 'syncing' | 'error'

export interface SyncStatus {
  state: SyncState
  error?: string
  lastSyncAt?: string
}

let status: SyncStatus = { state: readConfig() ? 'idle' : 'off' }
const subs = new Set<() => void>()

function set(s: Partial<SyncStatus>) {
  status = { ...status, ...s }
  subs.forEach((f) => f())
}
export function getStatus() {
  return status
}
export function subscribeStatus(f: () => void) {
  subs.add(f)
  return () => {
    subs.delete(f)
  }
}

const PUSH_BATCH = 300
const PULL_PAGE = 500

async function userId(): Promise<string> {
  const sb = getClient()
  if (!sb) throw new Error('Cloud not set up')
  const { data, error } = await sb.auth.getSession()
  if (error) throw error
  const id = data.session?.user.id
  if (!id) throw new Error('Not signed in to the cloud. Open Settings → Cloud backup.')
  return id
}

async function push(owner: string) {
  const sb = getClient()!
  for (let round = 0; round < 1000; round++) {
    const entries = await db.outbox.orderBy('seq').limit(PUSH_BATCH).toArray()
    if (entries.length === 0) return
    const seen = new Map<string, { table: SyncTable; id: string }>()
    for (const e of entries) seen.set(`${e.table}|${e.rowId}`, { table: e.table as SyncTable, id: e.rowId })
    const payload: Record<string, unknown>[] = []
    for (const { table, id } of seen.values()) {
      if (!(SYNC_TABLES as readonly string[]).includes(table)) continue
      const row = (await db.table(table).get(id)) as Base | undefined
      if (!row) continue
      payload.push({ owner, tbl: table, id, data: row, updated_at: row.updatedAt, deleted: !!row.deletedAt })
    }
    if (payload.length) {
      const { error } = await sb.from('records').upsert(payload, { onConflict: 'owner,tbl,id' })
      if (error) throw new Error(error.message)
    }
    await db.outbox.bulkDelete(entries.map((e) => e.seq!))
  }
}

async function pull() {
  const sb = getClient()!
  for (let page = 0; page < 10000; page++) {
    const since = await getMeta<string>('lastPullAt', '1970-01-01T00:00:00Z')
    const { data, error } = await sb
      .from('records')
      .select('tbl,id,data,updated_at,server_updated_at')
      .gt('server_updated_at', since)
      .order('server_updated_at', { ascending: true })
      .limit(PULL_PAGE)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as { tbl: string; id: string; data: Base; updated_at: string; server_updated_at: string }[]
    if (rows.length === 0) return
    await db.transaction('rw', [...SYNC_TABLES.map((t) => db.table(t)), db.outbox, db.meta], async () => {
      for (const r of rows) {
        if (!(SYNC_TABLES as readonly string[]).includes(r.tbl)) continue
        // A local change waiting to upload is newer than anything on the server: keep it.
        const pending = await db.outbox.where('[table+rowId]').equals([r.tbl, r.id]).count()
        if (pending) continue
        const local = (await db.table(r.tbl).get(r.id)) as Base | undefined
        if (!local || local.updatedAt <= r.data.updatedAt) await db.table(r.tbl).put(r.data)
      }
      await db.meta.put({ key: 'lastPullAt', value: rows[rows.length - 1].server_updated_at })
    })
    if (rows.length < PULL_PAGE) return
  }
}

let running = false
let again = false

export async function syncNow(): Promise<void> {
  if (!readConfig()) {
    set({ state: 'off' })
    return
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    set({ state: 'offline' })
    return
  }
  if (running) {
    again = true
    return
  }
  running = true
  set({ state: 'syncing', error: undefined })
  try {
    do {
      again = false
      const owner = await userId()
      await push(owner)
      await pull()
    } while (again)
    const at = new Date().toISOString()
    await setMeta('lastSyncAt', at)
    set({ state: 'idle', lastSyncAt: at })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const offline = /fetch|network|Failed to fetch|NetworkError/i.test(msg)
    set({ state: offline ? 'offline' : 'error', error: offline ? undefined : msg })
  } finally {
    running = false
  }
}

let started = false
let debounce: ReturnType<typeof setTimeout> | undefined

export async function startSync() {
  if (started) return
  started = true
  const last = await getMeta<string | undefined>('lastSyncAt', undefined)
  set({ lastSyncAt: last })
  onLocalChange(() => {
    clearTimeout(debounce)
    debounce = setTimeout(() => void syncNow(), 2500)
  })
  window.addEventListener('online', () => void syncNow())
  window.addEventListener('offline', () => readConfig() && set({ state: 'offline' }))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow()
  })
  setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow()
  }, 60_000)
  void syncNow()
}

/** Sign in (or create the one account on first use), save the settings and sync everything. */
export async function connectCloud(cfg: CloudConfig, password: string): Promise<void> {
  const prev = await getMeta<string | null>('cloudAccount', null)
  const url = cfg.url.trim().replace(/\/+$/, '')
  if (!/^https:\/\/.+/.test(url)) throw new Error('Project URL should start with https://')
  writeConfig({ url, anonKey: cfg.anonKey.trim(), email: cfg.email?.trim() })
  const sb = getClient()!
  const email = cfg.email?.trim() ?? ''
  let res = await sb.auth.signInWithPassword({ email, password })
  if (res.error && /invalid login credentials/i.test(res.error.message)) {
    const up = await sb.auth.signUp({ email, password })
    if (up.error) {
      writeConfig(null)
      throw new Error(up.error.message)
    }
    if (!up.data.session) {
      writeConfig(null)
      throw new Error(
        'Account created, but Supabase is asking for email confirmation. In Supabase open Authentication → Sign In / Providers → Email and turn off "Confirm email", then try again. (Or confirm from your inbox.)',
      )
    }
    res = await sb.auth.signInWithPassword({ email, password })
  }
  if (res.error) {
    writeConfig(null)
    throw new Error(res.error.message)
  }
  const probe = await sb.from('records').select('id', { head: true, count: 'exact' }).limit(1)
  if (probe.error) {
    throw new Error(`Signed in, but the "records" table is missing. Run supabase/schema.sql in the Supabase SQL Editor. (${probe.error.message})`)
  }
  const account = `${url}|${email.toLowerCase()}`
  if (prev !== account) {
    // New account or project: upload everything on this phone and download everything from the cloud.
    await requeueAll()
    await setMeta('lastPullAt', '1970-01-01T00:00:00Z')
    await setMeta('cloudAccount', account)
  }
  set({ state: 'idle' })
  await syncNow()
}

/** Queue every local record for upload again (used for a new cloud account or "Upload everything"). */
export async function requeueAll() {
  const at = new Date().toISOString()
  for (const t of SYNC_TABLES) {
    const rows = (await db.table(t).toArray()) as Base[]
    const real = rows.filter((r) => r.updatedAt > '1971')
    if (real.length) await db.outbox.bulkAdd(real.map((r) => ({ table: t, rowId: r.id, at })))
  }
}

export async function disconnectCloud() {
  const sb = getClient()
  try {
    await sb?.auth.signOut()
  } catch {
    /* ignore */
  }
  writeConfig(null)
  set({ state: 'off', error: undefined })
}

export async function pendingCount() {
  return db.outbox.count()
}
