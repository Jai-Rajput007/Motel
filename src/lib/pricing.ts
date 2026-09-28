import { eachDayOfInterval, parseISO, subDays } from 'date-fns'
import { ADD_ONS, PROMOS, RATE_PLANS } from '../data/content'
import { roomTypeById } from '../data/hotels'
import type { Booking, Room } from '../types'
import { iso, nightsBetween, overlaps } from './utils'

export type SeasonInfo = { factor: number; label: string }

export function season(date: Date, hotelId?: string): SeasonInfo {
  const m = date.getMonth()
  const d = date.getDate()
  if ((m === 11 && d >= 20) || (m === 0 && d <= 5)) return { factor: 1.45, label: 'Festive' }
  if (m === 10 && d <= 12) return { factor: 1.35, label: 'Diwali' }
  if (hotelId === 'rls') {
    if (m >= 3 && m <= 5) return { factor: 1.2, label: 'Peak' }
    if (m >= 6 && m <= 8) return { factor: 0.85, label: 'Monsoon' }
    return { factor: 1, label: 'Regular' }
  }
  if (m >= 9 || m <= 2) return { factor: 1.2, label: 'Peak' }
  if (m >= 5 && m <= 8) return { factor: 0.82, label: 'Monsoon' }
  return { factor: 1, label: 'Regular' }
}

export function nightlyRate(roomTypeId: string, date: Date, overrides?: Record<string, number>) {
  const rt = roomTypeById(roomTypeId)
  const base = overrides?.[roomTypeId] ?? rt.baseRate
  const s = season(date, rt.hotelId)
  const dow = date.getDay()
  const weekend = dow === 5 || dow === 6 ? 1.12 : 1
  return Math.round((base * s.factor * weekend) / 100) * 100
}

// GST on hotel accommodation (India, from 22 Sep 2025): 5% up to ₹7,500 per night, 18% above.
export const gstRateFor = (tariff: number) => (tariff <= 7500 ? 0.05 : 0.18)

export type QuoteInput = {
  roomTypeId: string
  checkIn: string
  checkOut: string
  ratePlanId: string
  addOns: string[]
  adults: number
  children: number
  promo?: string
  rooms?: number
  overrides?: Record<string, number>
}

export function quote(q: QuoteInput) {
  const plan = RATE_PLANS.find((p) => p.id === q.ratePlanId) ?? RATE_PLANS[0]
  const rooms = q.rooms ?? 1
  const n = Math.max(1, nightsBetween(q.checkIn, q.checkOut))
  const days = eachDayOfInterval({ start: parseISO(q.checkIn), end: subDays(parseISO(q.checkOut), 1) })
  const nights = days.map((d) => ({ date: iso(d), rate: Math.round(nightlyRate(q.roomTypeId, d, q.overrides) * plan.modifier) }))
  const roomTotal = nights.reduce((s, x) => s + x.rate, 0) * rooms
  const guests = q.adults + q.children
  const addOnTotal = q.addOns.reduce((s, id) => {
    const a = ADD_ONS.find((x) => x.id === id)
    if (!a) return s
    return s + a.price * (a.per === 'stay' ? 1 : a.per === 'night' ? n : guests)
  }, 0)
  const promo = q.promo ? PROMOS[q.promo.toUpperCase()] : undefined
  const minNightsOk = q.promo?.toUpperCase() !== 'MONSOON25' || n >= 3
  const discount = promo && minNightsOk ? Math.round((roomTotal * promo.pct) / 100) : 0
  const roomTax = nights.reduce((s, x) => s + x.rate * gstRateFor(x.rate), 0) * rooms * (1 - (discount ? promo!.pct / 100 : 0))
  const tax = Math.round(roomTax + addOnTotal * 0.18)
  const total = roomTotal - discount + addOnTotal + tax
  return { plan, nights, n, roomTotal, addOnTotal, discount, tax, total, promoValid: !!promo && minNightsOk, promoLabel: promo?.label, promoError: q.promo && !promo ? 'Code not recognised' : q.promo && !minNightsOk ? 'Requires a minimum stay of 3 nights' : undefined }
}

const active = (b: Booking) => b.status !== 'cancelled' && b.status !== 'no-show'

export function availability(roomTypeId: string, checkIn: string, checkOut: string, bookings: Booking[], rooms: Room[], stopSell: string[] = []) {
  const typeRooms = rooms.filter((r) => r.roomTypeId === roomTypeId && r.hk !== 'out-of-order')
  const rel = bookings.filter((b) => b.roomTypeId === roomTypeId && active(b) && overlaps(b.checkIn, b.checkOut, checkIn, checkOut))
  const days = eachDayOfInterval({ start: parseISO(checkIn), end: subDays(parseISO(checkOut), 1) })
  let min = typeRooms.length
  for (const d of days) {
    const ds = iso(d)
    if (stopSell.includes(`${roomTypeId}|${ds}`)) return 0
    const used = rel.filter((b) => b.checkIn <= ds && ds < b.checkOut).length
    min = Math.min(min, typeRooms.length - used)
  }
  return Math.max(0, min)
}

export function findFreeRoom(roomTypeId: string, checkIn: string, checkOut: string, bookings: Booking[], rooms: Room[]) {
  const typeRooms = rooms.filter((r) => r.roomTypeId === roomTypeId && r.hk !== 'out-of-order')
  return typeRooms.find((r) => !bookings.some((b) => b.roomNo === r.number && b.hotelId === r.hotelId && active(b) && overlaps(b.checkIn, b.checkOut, checkIn, checkOut)))
}
