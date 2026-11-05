import { Capacitor } from '@capacitor/core'
import { db, setMeta, SYNC_TABLES } from '../db'
import type { Base } from '../db/types'
import { keyOfLocalDate } from './dates'

export interface BackupFile {
  app: 'momos-spot'
  version: 1
  exportedAt: string
  tables: Record<string, Base[]>
}

export async function buildBackup(): Promise<BackupFile> {
  const tables: Record<string, Base[]> = {}
  for (const t of SYNC_TABLES) tables[t] = (await db.table(t).toArray()) as Base[]
  return { app: 'momos-spot', version: 1, exportedAt: new Date().toISOString(), tables }
}

/** Save a file to the phone: Documents folder in the Android app, a download in the browser. */
export async function saveFile(name: string, content: string, mime: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    try {
      // Only asks on Android 9 and older; newer phones allow this without a permission.
      const perm = await Filesystem.checkPermissions()
      if (perm.publicStorage !== 'granted') await Filesystem.requestPermissions()
    } catch {
      /* not needed on this phone */
    }
    const path = `MomosSpot/${name}`
    await Filesystem.writeFile({ path, data: content, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true })
    return `Documents/${path}`
  }
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return `Downloads/${name}`
}

export async function downloadBackup(): Promise<string> {
  const b = await buildBackup()
  const where = await saveFile(`momos-spot-backup-${keyOfLocalDate(new Date())}.json`, JSON.stringify(b), 'application/json')
  await setMeta('lastBackupAt', b.exportedAt)
  return where
}

export interface RestoreResult {
  added: number
  updated: number
  skipped: number
}

/** Merge a backup into this phone. Newer copies win; nothing newer on the phone is overwritten. */
export async function restoreBackup(json: string): Promise<RestoreResult> {
  let parsed: BackupFile
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('This file is not a valid backup.')
  }
  if (parsed?.app !== 'momos-spot' || !parsed.tables) throw new Error('This file is not a Momos Spot backup.')
  const res: RestoreResult = { added: 0, updated: 0, skipped: 0 }
  const at = new Date().toISOString()
  await db.transaction('rw', [...SYNC_TABLES.map((t) => db.table(t)), db.outbox], async () => {
    for (const t of SYNC_TABLES) {
      const rows = parsed.tables[t] ?? []
      for (const r of rows) {
        if (!r || typeof r.id !== 'string' || typeof r.updatedAt !== 'string') {
          res.skipped++
          continue
        }
        const local = (await db.table(t).get(r.id)) as Base | undefined
        if (local && local.updatedAt >= r.updatedAt) {
          res.skipped++
          continue
        }
        await db.table(t).put(r)
        if (r.updatedAt > '1971') await db.outbox.add({ table: t, rowId: r.id, at })
        if (local) res.updated++
        else res.added++
      }
    }
  })
  return res
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
}
