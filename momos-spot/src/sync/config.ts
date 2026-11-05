import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface CloudConfig {
  url: string
  anonKey: string
  email?: string
}

const KEY = 'momos.cloud'

/** Cloud project built into the app at build time (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). */
export function builtInConfig(): CloudConfig | null {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
  return url && anonKey ? { url: url.replace(/\/+$/, ''), anonKey } : null
}

/** Details typed in Settings win over the built-in project. */
export function readConfig(): CloudConfig | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as CloudConfig
  } catch {
    /* ignore */
  }
  return builtInConfig()
}

export function writeConfig(c: CloudConfig | null) {
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify(c))
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  client = null
}

let client: SupabaseClient | null = null
let clientFor = ''

export function getClient(): SupabaseClient | null {
  const c = readConfig()
  if (!c) return null
  const sig = `${c.url}|${c.anonKey}`
  if (!client || clientFor !== sig) {
    client = createClient(c.url, c.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'momos.auth' },
    })
    clientFor = sig
  }
  return client
}
