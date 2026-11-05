import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { alive, db, DEFAULT_SETTINGS, SETTINGS_ID, type SyncTable } from './db'
import type { Base, Settings } from './db/types'
import { todayKey } from './lib/dates'
import { getStatus, subscribeStatus } from './sync/engine'

export function useSettings(): Settings {
  return useLiveQuery(() => db.settings.get(SETTINGS_ID), []) ?? DEFAULT_SETTINGS
}

/** Today's business day; updates by itself when the day changes. */
export function useToday(): string {
  const s = useSettings()
  const [t, setT] = useState(() => todayKey(s.dayCutoffHour))
  useEffect(() => {
    setT(todayKey(s.dayCutoffHour))
    const i = setInterval(() => setT(todayKey(s.dayCutoffHour)), 30_000)
    return () => clearInterval(i)
  }, [s.dayCutoffHour])
  return t
}

/** All live (not deleted) rows of a table. `undefined` while loading. */
export function useAll<T extends Base>(table: SyncTable, deps: unknown[] = []): T[] | undefined {
  return useLiveQuery(async () => alive((await db.table(table).toArray()) as T[]), deps)
}

/** Rows of a day-indexed table between two day keys (inclusive). */
export function useDays<T extends Base>(table: 'sales' | 'purchases' | 'expenses' | 'creditPayments' | 'trips', from: string, to: string): T[] | undefined {
  return useLiveQuery(async () => alive((await db.table(table).where('day').between(from, to, true, true).toArray()) as T[]), [table, from, to])
}

export function useSyncStatus() {
  return useSyncExternalStore(subscribeStatus, getStatus)
}

export function usePending(): number {
  return useLiveQuery(() => db.outbox.count(), []) ?? 0
}

export function useOnline(): boolean {
  const [on, setOn] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const a = () => setOn(true)
    const b = () => setOn(false)
    window.addEventListener('online', a)
    window.addEventListener('offline', b)
    return () => {
      window.removeEventListener('online', a)
      window.removeEventListener('offline', b)
    }
  }, [])
  return on
}

/** Keep a value in sessionStorage so drafts survive the app being closed halfway. */
export function useDraft<T>(key: string, initial: () => T): [T, (v: T | ((p: T) => T)) => void, () => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`draft.${key}`)
      if (raw) return JSON.parse(raw) as T
    } catch {
      /* ignore */
    }
    return initial()
  })
  useEffect(() => {
    try {
      localStorage.setItem(`draft.${key}`, JSON.stringify(v))
    } catch {
      /* ignore */
    }
  }, [key, v])
  const clear = () => {
    try {
      localStorage.removeItem(`draft.${key}`)
    } catch {
      /* ignore */
    }
    setV(initial())
  }
  return [v, setV, clear]
}
