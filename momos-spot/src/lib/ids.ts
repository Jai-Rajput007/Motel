export function uid(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  const b = new Uint8Array(16)
  if (c) c.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const GUEST_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L

export function guestCode(): string {
  let s = ''
  for (let i = 0; i < 4; i++) s += GUEST_ALPHABET[Math.floor(Math.random() * GUEST_ALPHABET.length)]
  return `G-${s}`
}

/** Normalised key for comparing names: "  Rahul  Kumar " → "rahul kumar" */
export function nameKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function tidyName(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}
