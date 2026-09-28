import { addDays, eachDayOfInterval, parseISO } from 'date-fns'
import type { Booking, Guest, Room, Segment } from '../types'
import { iso, nightsBetween, todayISO } from './utils'

export const isActive = (b: Booking) => b.status !== 'cancelled' && b.status !== 'no-show'
export const inHotel = (property: string) => (x: { hotelId: string }) => property === 'all' || x.hotelId === property

export function guestStats(bookings: Booking[]) {
  const m = new Map<string, { stays: number; nights: number; spend: number; last?: string; next?: string }>()
  const T = todayISO()
  for (const b of bookings) {
    if (!isActive(b)) continue
    const s = m.get(b.guestId) ?? { stays: 0, nights: 0, spend: 0 }
    s.stays++
    s.nights += nightsBetween(b.checkIn, b.checkOut)
    s.spend += b.total + b.folio.filter((f) => f.type === 'charge').reduce((a, f) => a + f.amount, 0)
    if (b.checkIn <= T && (!s.last || b.checkIn > s.last)) s.last = b.checkIn
    if (b.checkIn > T && (!s.next || b.checkIn < s.next)) s.next = b.checkIn
    m.set(b.guestId, s)
  }
  return m
}

export function inSegment(seg: Segment, g: Guest, st?: { stays: number; spend: number; last?: string }) {
  return seg.rules.every((r) => {
    switch (r.field) {
      case 'tier': return g.tier === r.value
      case 'stays': return (st?.stays ?? 0) >= Number(r.value)
      case 'spend': return (st?.spend ?? 0) >= Number(r.value)
      case 'tag': return g.tags.includes(String(r.value))
      case 'country': return String(r.value).startsWith('!') ? g.country !== String(r.value).slice(1) : g.country === r.value
      case 'optIn': return g.marketingOptIn === r.value
      case 'lastStayDays': return !!st?.last && nightsBetween(st.last, todayISO()) >= Number(r.value)
    }
  })
}

export function dayStats(bookings: Booking[], rooms: Room[], date: string) {
  const sold = bookings.filter((b) => isActive(b) && b.checkIn <= date && date < b.checkOut)
  const revenue = sold.reduce((a, b) => a + b.roomTotal / Math.max(1, nightsBetween(b.checkIn, b.checkOut)), 0)
  const available = rooms.filter((r) => r.hk !== 'out-of-order').length || 1
  const occ = sold.length / available
  const adr = sold.length ? revenue / sold.length : 0
  return { sold: sold.length, available, occ, adr, revpar: revenue / available, revenue }
}

export function series(bookings: Booking[], rooms: Room[], from: number, to: number) {
  const T = new Date()
  return eachDayOfInterval({ start: addDays(T, from), end: addDays(T, to) }).map((d) => {
    const ds = iso(d)
    const s = dayStats(bookings, rooms, ds)
    return { date: ds, label: `${d.getDate()}/${d.getMonth() + 1}`, occ: Math.round(s.occ * 100), adr: Math.round(s.adr), revpar: Math.round(s.revpar), revenue: Math.round(s.revenue), sold: s.sold }
  })
}

export const statusColor: Record<string, string> = {
  confirmed: 'bg-peacock/10 text-peacock dark:bg-peacock/30 dark:text-[#9fd0dc]',
  'checked-in': 'bg-leaf/15 text-leaf dark:bg-leaf/30 dark:text-[#bcd6a6]',
  'checked-out': 'bg-stone/15 text-stone dark:text-sand',
  cancelled: 'bg-sindoor/10 text-sindoor dark:bg-sindoor/30 dark:text-[#f2b3a6]',
  'no-show': 'bg-gold/15 text-[#8a6a36] dark:text-gold-2',
}

export const hkColor: Record<string, string> = {
  clean: 'bg-peacock/10 text-peacock border-peacock/30 dark:text-[#9fd0dc]',
  dirty: 'bg-sindoor/10 text-sindoor border-sindoor/30 dark:text-[#f2b3a6]',
  inspected: 'bg-leaf/15 text-leaf border-leaf/30 dark:text-[#bcd6a6]',
  'out-of-order': 'bg-kohl/10 text-kohl border-kohl/30 dark:bg-white/10 dark:text-sand',
}

export const parseDate = parseISO
