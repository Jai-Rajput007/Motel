import { differenceInCalendarDays, format, parseISO, addDays } from 'date-fns'

export const USD_RATE = 88

export function money(inr: number, currency: 'INR' | 'USD' = 'INR', compact = false) {
  if (currency === 'USD') {
    const v = inr / USD_RATE
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, notation: compact ? 'compact' : 'standard' }).format(v)
  }
  if (compact) {
    if (inr >= 1e7) return `₹${(inr / 1e7).toFixed(2)} Cr`
    if (inr >= 1e5) return `₹${(inr / 1e5).toFixed(1)} L`
    if (inr >= 1e3) return `₹${(inr / 1e3).toFixed(1)}K`
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(inr)
}

export const inr = (v: number) => money(v, 'INR')
export const inrC = (v: number) => money(v, 'INR', true)

export const iso = (d: Date) => format(d, 'yyyy-MM-dd')
export const todayISO = () => iso(new Date())
export const fmtDate = (s: string, f = 'dd MMM yyyy') => format(parseISO(s), f)
export const nightsBetween = (a: string, b: string) => differenceInCalendarDays(parseISO(b), parseISO(a))
export const addDaysISO = (s: string, n: number) => iso(addDays(parseISO(s), n))
export const overlaps = (aIn: string, aOut: string, bIn: string, bOut: string) => aIn < bOut && bIn < aOut

export function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}

export function bookingRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = 'VR'
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export const initials = (name: string) => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
export const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`
