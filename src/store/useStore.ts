import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns'
import { generateSeed } from '../data/seed'
import { HOTELS, hotelById, roomTypeById } from '../data/hotels'
import { availability, findFreeRoom, quote } from '../lib/pricing'
import { bookingRef, iso, nightsBetween, overlaps, todayISO, uid } from '../lib/utils'
import type {
  AuditEntry, Automation, Booking, BookingSource, Campaign, FolioLine, Guest, HKStatus, InventoryItem, Lead, LeadStage,
  Notice, PurchaseOrder, Review, Role, Room, Segment, Staff, StockMove, TableBooking, Ticket, Vendor,
} from '../types'

export type Data = {
  guests: Guest[]
  rooms: Room[]
  bookings: Booking[]
  staff: Staff[]
  vendors: Vendor[]
  inventory: InventoryItem[]
  purchaseOrders: PurchaseOrder[]
  stockMoves: StockMove[]
  leads: Lead[]
  reviews: Review[]
  segments: Segment[]
  campaigns: Campaign[]
  automations: Automation[]
  tickets: Ticket[]
  audit: AuditEntry[]
  notices: Notice[]
  tableBookings: TableBooking[]
  rateOverrides: Record<string, number>
  stopSell: string[]
  seededOn: string
}

export type NewBookingInput = {
  hotelId: string
  roomTypeId: string
  checkIn: string
  checkOut: string
  adults: number
  children: number
  ratePlanId: string
  addOns: string[]
  promo?: string
  guest: { firstName: string; lastName: string; email: string; phone: string; country: string; city?: string; company?: string }
  specialRequests?: string
  source?: BookingSource
  payNow?: boolean
  arrival?: string
}

type UI = {
  currency: 'INR' | 'USD'
  lang: 'en' | 'hi'
  role: Role
  property: string // 'all' or hotel id
  dark: boolean
  tourStep: number | null
  lastRef: string | null
}

type Actions = {
  setUI: (p: Partial<UI>) => void
  log: (action: string, detail: string) => void
  notify: (kind: Notice['kind'], text: string) => void
  markNoticesRead: () => void
  createBooking: (i: NewBookingInput) => Booking | null
  cancelBooking: (id: string) => void
  checkIn: (id: string, roomNo?: string) => void
  checkOut: (id: string) => void
  markNoShow: (id: string) => void
  moveBooking: (id: string, roomNo: string, checkIn: string) => string | null
  addFolio: (id: string, line: Omit<FolioLine, 'id'>) => void
  updateBooking: (id: string, patch: Partial<Booking>) => void
  setRoomHK: (roomId: string, hk: HKStatus, attendant?: string) => void
  updateGuest: (id: string, patch: Partial<Guest>) => void
  upsertGuest: (g: NewBookingInput['guest'] & { optIn?: boolean; tags?: string[] }) => Guest
  updateStaff: (id: string, patch: Partial<Staff>) => void
  setShift: (id: string, day: string, v: Staff['shift'][string]) => void
  addStaff: (s: Omit<Staff, 'id'>) => void
  adjustStock: (itemId: string, delta: number, reason: string) => void
  updateItem: (id: string, patch: Partial<InventoryItem>) => void
  createPO: (hotelId: string, vendorId: string, items: PurchaseOrder['items']) => string
  receivePO: (id: string) => void
  addLead: (l: Omit<Lead, 'id' | 'createdAt' | 'stage' | 'owner'> & Partial<Pick<Lead, 'stage' | 'owner'>>) => void
  moveLead: (id: string, stage: LeadStage) => void
  updateLead: (id: string, patch: Partial<Lead>) => void
  replyReview: (id: string, reply: string) => void
  addReview: (r: Omit<Review, 'id' | 'date' | 'sentiment' | 'tags' | 'nps'>) => void
  saveCampaign: (c: Campaign) => void
  sendCampaign: (id: string, audience: number) => void
  saveSegment: (s: Segment) => void
  toggleAutomation: (id: string) => void
  addTicket: (t: Omit<Ticket, 'id' | 'createdAt' | 'status'>) => void
  updateTicket: (id: string, patch: Partial<Ticket>) => void
  setRateOverride: (roomTypeId: string, rate: number) => void
  toggleStopSell: (key: string) => void
  addTableBooking: (t: Omit<TableBooking, 'id' | 'createdAt'>) => void
  subscribe: (email: string) => void
  resetDemo: () => void
  simulateBusyDay: () => number
}

export type State = Data & UI & Actions

const now = () => new Date().toISOString()

// Debounced localStorage writer — the demo dataset is large, so avoid serialising it on every keystroke.
let pending: ReturnType<typeof setTimeout> | undefined
let queued: [string, string] | null = null
const flush = () => { if (queued) { try { localStorage.setItem(queued[0], queued[1]) } catch { /* ignore */ } queued = null } }
if (typeof window !== 'undefined') window.addEventListener('pagehide', flush)
const debouncedStorage = {
  getItem: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  setItem: (k: string, v: string) => {
    clearTimeout(pending)
    queued = [k, v]
    pending = setTimeout(flush, 400) // quota or private-mode failures are ignored — the demo keeps working in memory
  },
  removeItem: (k: string) => { try { localStorage.removeItem(k) } catch { /* ignore */ } },
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...(generateSeed() as Data),
      currency: 'INR',
      lang: 'en',
      role: 'General Manager',
      property: 'all',
      dark: false,
      tourStep: null,
      lastRef: null,

      setUI: (p) => set(p),
      log: (action, detail) => set((s) => ({ audit: [{ id: uid('au'), at: now(), user: s.role, action, detail }, ...s.audit].slice(0, 300) })),
      notify: (kind, text) => set((s) => ({ notices: [{ id: uid('n'), at: now(), kind, text, read: false }, ...s.notices].slice(0, 60) })),
      markNoticesRead: () => set((s) => ({ notices: s.notices.map((n) => ({ ...n, read: true })) })),

      upsertGuest: (g) => {
        const s = get()
        const email = g.email.trim().toLowerCase()
        const existing = s.guests.find((x) => x.email.toLowerCase() === email)
        if (existing) {
          const merged = { ...existing, phone: g.phone || existing.phone, marketingOptIn: g.optIn ?? existing.marketingOptIn, tags: Array.from(new Set([...existing.tags, ...(g.tags ?? [])])) }
          set({ guests: s.guests.map((x) => (x.id === existing.id ? merged : x)) })
          return merged
        }
        const guest: Guest = {
          id: uid('g'), firstName: g.firstName || email.split('@')[0], lastName: g.lastName || '', email, phone: g.phone, city: g.city || '', country: g.country || 'India',
          tier: 'Member', points: 0, tags: g.tags ?? ['New'], preferences: [], notes: '', createdAt: todayISO(), marketingOptIn: g.optIn ?? true, company: g.company,
        }
        set({ guests: [guest, ...s.guests] })
        return guest
      },

      createBooking: (i) => {
        const s = get()
        if (availability(i.roomTypeId, i.checkIn, i.checkOut, s.bookings, s.rooms, s.stopSell) <= 0) return null
        // Prefer a room free for the whole stay; otherwise leave unassigned for the front desk to allocate.
        let room = findFreeRoom(i.roomTypeId, i.checkIn, i.checkOut, s.bookings, s.rooms)
        if (!room) {
          // Room optimiser: try to relocate conflicting future (not in-house) bookings to other rooms of the same type.
          const typeRooms = s.rooms.filter((r) => r.roomTypeId === i.roomTypeId && r.hk !== 'out-of-order')
          const live = (b: Booking) => b.status !== 'cancelled' && b.status !== 'no-show'
          for (const cand of typeRooms) {
            const conflicts = s.bookings.filter((b) => b.hotelId === cand.hotelId && b.roomNo === cand.number && live(b) && overlaps(b.checkIn, b.checkOut, i.checkIn, i.checkOut))
            if (conflicts.some((c) => c.status !== 'confirmed')) continue
            let pool = s.bookings
            const moves: [string, string][] = []
            for (const c of conflicts) {
              const others = typeRooms.filter((r) => r.number !== cand.number)
              const target = others.find((r) => !pool.some((b) => b.id !== c.id && b.hotelId === r.hotelId && b.roomNo === r.number && live(b) && overlaps(b.checkIn, b.checkOut, c.checkIn, c.checkOut)))
              if (!target) { moves.length = 0; break }
              moves.push([c.id, target.number])
              pool = pool.map((b) => (b.id === c.id ? { ...b, roomNo: target.number } : b))
            }
            if (moves.length === conflicts.length) {
              set({ bookings: pool })
              moves.forEach(([id, no]) => get().log('Room optimiser', `${s.bookings.find((b) => b.id === id)?.ref} moved to room ${no}`))
              room = cand
              break
            }
          }
        }
        const guest = get().upsertGuest({ ...i.guest, tags: ['Website booker'] })
        const q = quote({ roomTypeId: i.roomTypeId, checkIn: i.checkIn, checkOut: i.checkOut, ratePlanId: i.ratePlanId, addOns: i.addOns, adults: i.adults, children: i.children, promo: i.promo, overrides: s.rateOverrides })
        const b: Booking = {
          id: uid('b'), ref: bookingRef(), hotelId: i.hotelId, roomTypeId: i.roomTypeId, roomNo: room?.number ?? null, guestId: guest.id,
          checkIn: i.checkIn, checkOut: i.checkOut, adults: i.adults, children: i.children, ratePlanId: i.ratePlanId, addOns: i.addOns,
          roomTotal: q.roomTotal, addOnTotal: q.addOnTotal, discount: q.discount, tax: q.tax, total: q.total, paid: i.payNow ? q.total : 0,
          status: 'confirmed', source: i.source ?? 'Website', createdAt: todayISO(), specialRequests: [i.specialRequests, i.arrival ? `Arrival ~${i.arrival}` : ''].filter(Boolean).join(' · '), promo: q.promoValid ? i.promo?.toUpperCase() : undefined,
          folio: i.payNow ? [{ id: uid('f'), date: todayISO(), description: 'Online payment — card', amount: q.total, type: 'payment' }] : [],
        }
        const points = Math.round(q.roomTotal / 100) * 5
        set((st) => ({
          bookings: [b, ...st.bookings],
          guests: st.guests.map((g) => (g.id === guest.id ? { ...g, points: g.points + points } : g)),
          lastRef: b.ref,
        }))
        const hotel = hotelById(i.hotelId)
        get().notify('booking', `New ${b.source.toLowerCase()} booking ${b.ref} — ${roomTypeById(i.roomTypeId).name}, ${hotel.name}`)
        get().log('Booking created', `${b.ref} · ${guest.firstName} ${guest.lastName} · ${hotel.name} · ${room ? `Room ${room.number}` : 'room to be assigned'}`)
        // Consume guest amenities for the stay (inventory link)
        const nights = nightsBetween(i.checkIn, i.checkOut)
        const amen = get().inventory.filter((x) => x.hotelId === i.hotelId && x.category === 'Amenities')
        amen.forEach((it) => get().adjustStock(it.id, -Math.max(1, Math.ceil(nights / 2)) * (i.adults + i.children), `Allocated to ${b.ref}`))
        return b
      },

      cancelBooking: (id) => {
        const b = get().bookings.find((x) => x.id === id)
        set((s) => ({ bookings: s.bookings.map((x) => (x.id === id ? { ...x, status: 'cancelled', roomNo: null } : x)) }))
        if (b) get().log('Booking cancelled', `${b.ref}`)
      },
      checkIn: (id, roomNo) => {
        const b = get().bookings.find((x) => x.id === id)
        if (!b) return
        const no = roomNo ?? b.roomNo
        set((s) => ({
          bookings: s.bookings.map((x) => (x.id === id ? { ...x, status: 'checked-in', roomNo: no } : x)),
        }))
        get().log('Check‑in', `${b.ref} → Room ${no} · ${hotelById(b.hotelId).name}`)
      },
      checkOut: (id) => {
        const b = get().bookings.find((x) => x.id === id)
        if (!b) return
        const extras = b.folio.filter((f) => f.type === 'charge').reduce((a, f) => a + f.amount, 0)
        const due = b.total + extras - b.paid
        set((s) => ({
          bookings: s.bookings.map((x) =>
            x.id === id ? { ...x, status: 'checked-out', checkOut: x.checkOut > todayISO() ? todayISO() : x.checkOut, paid: x.paid + Math.max(0, due), folio: due > 0 ? [...x.folio, { id: uid('f'), date: todayISO(), description: 'Settlement — card', amount: due, type: 'payment' }] : x.folio } : x,
          ),
          rooms: s.rooms.map((r) => (r.hotelId === b.hotelId && r.number === b.roomNo ? { ...r, hk: 'dirty' } : r)),
        }))
        get().log('Check‑out', `${b.ref} · Room ${b.roomNo} marked dirty`)
      },
      markNoShow: (id) => set((s) => ({ bookings: s.bookings.map((x) => (x.id === id ? { ...x, status: 'no-show', roomNo: null } : x)) })),

      moveBooking: (id, roomNo, checkIn) => {
        const s = get()
        const b = s.bookings.find((x) => x.id === id)
        if (!b) return 'Booking not found'
        const room = s.rooms.find((r) => r.hotelId === b.hotelId && r.number === roomNo)
        if (!room) return 'Room not found'
        if (room.hk === 'out-of-order') return `Room ${roomNo} is out of order`
        const len = nightsBetween(b.checkIn, b.checkOut)
        const newOut = iso(addDays(parseISO(checkIn), len))
        const clash = s.bookings.find((x) => x.id !== id && x.hotelId === b.hotelId && x.roomNo === roomNo && x.status !== 'cancelled' && x.status !== 'no-show' && overlaps(x.checkIn, x.checkOut, checkIn, newOut))
        if (clash) return `Conflicts with ${clash.ref} in room ${roomNo}`
        if (b.status === 'checked-in' && checkIn !== b.checkIn) return 'Guest is in‑house — only room moves allowed'
        set({ bookings: s.bookings.map((x) => (x.id === id ? { ...x, roomNo, roomTypeId: room.roomTypeId, checkIn, checkOut: newOut } : x)) })
        get().log('Booking moved', `${b.ref} → Room ${roomNo}, ${checkIn}`)
        return null
      },
      addFolio: (id, line) => set((s) => ({ bookings: s.bookings.map((x) => (x.id === id ? { ...x, folio: [...x.folio, { ...line, id: uid('f') }], paid: line.type === 'payment' ? x.paid + line.amount : x.paid } : x)) })),
      updateBooking: (id, patch) => set((s) => ({ bookings: s.bookings.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),

      setRoomHK: (roomId, hk, attendant) => {
        set((s) => ({ rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, hk, attendant: attendant ?? r.attendant } : r)) }))
        get().log('Housekeeping', `${roomId} → ${hk}`)
      },

      updateGuest: (id, patch) => set((s) => ({ guests: s.guests.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      updateStaff: (id, patch) => set((s) => ({ staff: s.staff.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      setShift: (id, day, v) => set((s) => ({ staff: s.staff.map((x) => (x.id === id ? { ...x, shift: { ...x.shift, [day]: v } } : x)) })),
      addStaff: (st) => { set((s) => ({ staff: [{ ...st, id: uid('s') }, ...s.staff] })); get().log('Staff added', `${st.name} · ${st.role}`) },

      adjustStock: (itemId, delta, reason) => {
        const item = get().inventory.find((i) => i.id === itemId)
        if (!item) return
        const stock = Math.max(0, item.stock + delta)
        set((s) => ({
          inventory: s.inventory.map((i) => (i.id === itemId ? { ...i, stock } : i)),
          stockMoves: [{ id: uid('m'), itemId, qty: delta, reason, date: now() }, ...s.stockMoves].slice(0, 400),
        }))
        if (item.stock > item.reorder && stock <= item.reorder) get().notify('stock', `${item.name} below reorder level at ${hotelById(item.hotelId).name}`)
      },
      updateItem: (id, patch) => set((s) => ({ inventory: s.inventory.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      createPO: (hotelId, vendorId, items) => {
        const id = `PO-${2042 + get().purchaseOrders.length}`
        const total = items.reduce((a, x) => a + x.qty * x.cost, 0)
        set((s) => ({ purchaseOrders: [{ id, hotelId, vendorId, items, status: 'Sent', createdAt: todayISO(), total }, ...s.purchaseOrders] }))
        get().log('Purchase order', `${id} sent · ${items.length} lines`)
        return id
      },
      receivePO: (id) => {
        const po = get().purchaseOrders.find((p) => p.id === id)
        if (!po || po.status === 'Received') return
        po.items.forEach((l) => get().adjustStock(l.itemId, l.qty, `Received ${id}`))
        set((s) => ({ purchaseOrders: s.purchaseOrders.map((p) => (p.id === id ? { ...p, status: 'Received' } : p)) }))
        get().log('Goods received', id)
      },

      addLead: (l) => {
        set((s) => ({ leads: [{ ...l, id: uid('l'), createdAt: todayISO(), stage: l.stage ?? 'New', owner: l.owner ?? 'Radhika Iyer' }, ...s.leads] }))
        get().notify('lead', `New ${l.type.toLowerCase()} enquiry from ${l.name} — ${l.guests} guests`)
      },
      moveLead: (id, stage) => {
        const l = get().leads.find((x) => x.id === id)
        set((s) => ({ leads: s.leads.map((x) => (x.id === id ? { ...x, stage } : x)) }))
        if (l) get().log('Lead stage', `${l.name} → ${stage}`)
      },
      updateLead: (id, patch) => set((s) => ({ leads: s.leads.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),

      replyReview: (id, reply) => set((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? { ...r, reply } : r)) })),
      addReview: (r) => {
        const sentiment = r.rating >= 4 ? 'positive' : r.rating === 3 ? 'neutral' : 'negative'
        set((s) => ({ reviews: [{ ...r, id: uid('rv'), date: todayISO(), sentiment, tags: ['Website'], nps: r.rating * 2 }, ...s.reviews] }))
        get().notify('review', `New ${r.rating}★ review for ${hotelById(r.hotelId).name}`)
      },

      saveCampaign: (c) => set((s) => ({ campaigns: s.campaigns.some((x) => x.id === c.id) ? s.campaigns.map((x) => (x.id === c.id ? c : x)) : [c, ...s.campaigns] })),
      sendCampaign: (id, audience) => {
        const r = Math.random
        set((s) => ({
          campaigns: s.campaigns.map((c) => {
            if (c.id !== id) return c
            const opened = Math.round(audience * (c.channel === 'WhatsApp' ? 0.88 : 0.42 + r() * 0.1))
            const clicked = Math.round(opened * (0.18 + r() * 0.1))
            const bookings = Math.max(1, Math.round(clicked * 0.08))
            return { ...c, status: 'Sent', sent: audience, opened, clicked, bookings, revenue: bookings * 86000 }
          }),
        }))
        get().log('Campaign sent', id)
      },
      saveSegment: (seg) => set((s) => ({ segments: s.segments.some((x) => x.id === seg.id) ? s.segments.map((x) => (x.id === seg.id ? seg : x)) : [...s.segments, seg] })),
      toggleAutomation: (id) => set((s) => ({ automations: s.automations.map((a) => (a.id === id ? { ...a, active: !a.active } : a)) })),

      addTicket: (t) => {
        set((s) => ({ tickets: [{ ...t, id: `T-${1200 + s.tickets.length}`, status: 'Open', createdAt: todayISO() }, ...s.tickets] }))
        get().log('Maintenance ticket', `${t.title} · Room ${t.roomNo}`)
      },
      updateTicket: (id, patch) => set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

      setRateOverride: (roomTypeId, rate) => { set((s) => ({ rateOverrides: { ...s.rateOverrides, [roomTypeId]: rate } })); get().log('Base rate', `${roomTypeById(roomTypeId).name} → ₹${rate.toLocaleString('en-IN')}`) },
      toggleStopSell: (key) => set((s) => ({ stopSell: s.stopSell.includes(key) ? s.stopSell.filter((k) => k !== key) : [...s.stopSell, key] })),

      addTableBooking: (t) => {
        set((s) => ({ tableBookings: [{ ...t, id: uid('t'), createdAt: now() }, ...s.tableBookings] }))
        get().notify('booking', `Table for ${t.guests} at ${t.venue} on ${t.date}, ${t.time}`)
      },
      subscribe: (email) => {
        get().upsertGuest({ firstName: '', lastName: '', email, phone: '', country: '', optIn: true, tags: ['Subscriber'] })
        get().notify('system', `Newsletter subscriber: ${email}`)
      },

      resetDemo: () => set({ ...(generateSeed() as Data), lastRef: null }),
      simulateBusyDay: () => {
        const s = get()
        const names = [['Rhea', 'Kapoor'], ['Daniel', 'Hughes'], ['Aisha', 'Qureshi'], ['Vikram', 'Sethi'], ['Sofia', 'Marino'], ['Arnav', 'Bose'], ['Hiro', 'Sato'], ['Nandini', 'Pillai']]
        let made = 0
        for (let k = 0; k < 10; k++) {
          const h = HOTELS[k % HOTELS.length]
          const rt = h.roomTypes[k % h.roomTypes.length]
          const ci = iso(addDays(new Date(), k % 3))
          const co = iso(addDays(new Date(), (k % 3) + 1 + (k % 4)))
          const [fn, ln] = names[k % names.length]
          const src: BookingSource[] = ['Website', 'Booking.com', 'MakeMyTrip', 'Website', 'Expedia', 'Corporate']
          const b = get().createBooking({ hotelId: h.id, roomTypeId: rt.id, checkIn: ci, checkOut: co, adults: 2, children: 0, ratePlanId: 'bb', addOns: [], guest: { firstName: fn, lastName: ln, email: `${fn}.${ln}${k}@mail.com`.toLowerCase(), phone: '+91 98' + String(10000000 + k * 7919), country: 'India' }, source: src[k % src.length] })
          if (b) made++
        }
        void s
        return made
      },
    }),
    {
      name: 'virasat-demo-v1',
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { tourStep, ...rest } = s
        return rest
      },
      onRehydrateStorage: () => (state) => {
        if (state && differenceInCalendarDays(new Date(), parseISO(state.seededOn)) > 7) {
          // Keep the demo feeling "live": re-seed if data is more than a week old.
          setTimeout(() => useStore.getState().resetDemo(), 0)
        }
      },
    },
  ),
)

export const useCurrency = () => useStore((s) => s.currency)
