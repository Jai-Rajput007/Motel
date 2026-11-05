/** All money is stored as integer paise (₹1 = 100 paise). */

/** Parse user input like "120", "120.5", "1,200", "₹ 99" into paise. Returns null when not a valid amount. */
export function toPaise(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null
  const s = String(input).replace(/[₹,\s]/g, '')
  if (s === '' || s === '.') return null
  if (!/^-?\d*(\.\d{0,2})?$/.test(s)) return null
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

/** Paise to a plain editable string ("120", "120.5"). */
export function paiseToInput(p: number | null | undefined): string {
  if (p === null || p === undefined || Number.isNaN(p)) return ''
  const r = p / 100
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0$/, '')
}

const fmt0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const fmt2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Format paise as rupees with Indian digit grouping: ₹1,20,500 or ₹99.50 */
export function inr(p: number, opts: { sign?: boolean } = {}): string {
  const v = Math.round(p)
  const abs = Math.abs(v)
  const body = abs % 100 === 0 ? fmt0.format(abs / 100) : fmt2.format(abs / 100)
  const neg = v < 0 ? '−' : opts.sign && v > 0 ? '+' : ''
  return `${neg}₹${body}`
}

/** Compact form for small spaces: ₹1.2k, ₹3.4L */
export function inrShort(p: number): string {
  const r = Math.round(p) / 100
  const abs = Math.abs(r)
  const neg = r < 0 ? '−' : ''
  if (abs >= 100000) return `${neg}₹${trim(abs / 100000)}L`
  if (abs >= 1000) return `${neg}₹${trim(abs / 1000)}k`
  return `${neg}₹${Math.round(abs)}`
}
function trim(n: number) {
  return n >= 100 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, '')
}

/** Split an amount into n parts that add back up exactly (first parts get the remainder). */
export function splitEven(total: number, n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(total / n)
  const rem = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0))
}

export function sum<T>(arr: T[], f: (x: T) => number): number {
  let s = 0
  for (const x of arr) s += f(x)
  return s
}
