import { Capacitor } from '@capacitor/core'

/** Open an outside link (WhatsApp, UPI…). In the Android app this hands it to the right app. */
export function openExternal(url: string) {
  if (Capacitor.isNativePlatform()) window.location.href = url
  else window.open(url, '_blank')
}

/** Share text through WhatsApp (or the phone's share menu when available). */
export async function shareText(text: string, phone?: string) {
  const digits = (phone ?? '').replace(/\D/g, '')
  const to = digits.length === 10 ? `91${digits}` : digits
  if (!to && typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  openExternal(`https://wa.me/${to}?text=${encodeURIComponent(text)}`)
}

export function upiLink(o: { upiId: string; name?: string; amount: number; note?: string }) {
  const p = new URLSearchParams({ pa: o.upiId, pn: o.name ?? '', am: (o.amount / 100).toFixed(2), cu: 'INR' })
  if (o.note) p.set('tn', o.note)
  return `upi://pay?${p.toString()}`
}
