import { addDays, subDays } from 'date-fns'
import { HOTELS, roomTypeById } from './hotels'
import { quote } from '../lib/pricing'
import { iso, mulberry32 } from '../lib/utils'
import type {
  AuditEntry, Automation, Booking, BookingSource, Campaign, Guest, InventoryItem, Lead, LeadStage, Notice,
  PurchaseOrder, Review, Room, Segment, Staff, Ticket, Vendor,
} from '../types'

const FIRST = ['Aarav', 'Vihaan', 'Aditya', 'Arjun', 'Rohan', 'Kabir', 'Ishaan', 'Karan', 'Rahul', 'Vikram', 'Siddharth', 'Nikhil', 'Ananya', 'Diya', 'Priya', 'Meera', 'Kavya', 'Saanvi', 'Isha', 'Riya', 'Neha', 'Tara', 'Aditi', 'Pooja', 'Zoya', 'Farhan', 'Imran', 'Harpreet', 'Gurleen', 'Joseph', 'Maria', 'Deepa', 'Lakshmi', 'Suresh', 'Ramesh', 'James', 'Emily', 'Oliver', 'Charlotte', 'Lucas', 'Sophie', 'Hans', 'Clara', 'Yuki', 'Kenji', 'Mei', 'Omar', 'Layla', 'Noah', 'Ava', 'Pierre', 'Camille', 'Marco', 'Giulia', 'Ethan', 'Grace']
const LAST = ['Sharma', 'Verma', 'Mehta', 'Kapoor', 'Malhotra', 'Iyer', 'Nair', 'Menon', 'Reddy', 'Rao', 'Singh', 'Gill', 'Chatterjee', 'Banerjee', 'Mukherjee', 'Desai', 'Patel', 'Shah', 'Joshi', 'Kulkarni', 'Khan', 'Siddiqui', 'D’Souza', 'Fernandes', 'Pillai', 'Agarwal', 'Bhatia', 'Chopra', 'Smith', 'Taylor', 'Brown', 'Wilson', 'Müller', 'Schmidt', 'Tanaka', 'Suzuki', 'Chen', 'Rossi', 'Dubois', 'Martin', 'Johnson', 'Williams']
const CITIES: [string, string][] = [['Mumbai', 'India'], ['Delhi', 'India'], ['Bengaluru', 'India'], ['Hyderabad', 'India'], ['Chennai', 'India'], ['Kolkata', 'India'], ['Pune', 'India'], ['Ahmedabad', 'India'], ['Chandigarh', 'India'], ['Kochi', 'India'], ['London', 'United Kingdom'], ['Manchester', 'United Kingdom'], ['New York', 'United States'], ['San Francisco', 'United States'], ['Berlin', 'Germany'], ['Munich', 'Germany'], ['Paris', 'France'], ['Tokyo', 'Japan'], ['Singapore', 'Singapore'], ['Dubai', 'UAE'], ['Sydney', 'Australia'], ['Milan', 'Italy'], ['Toronto', 'Canada']]
const PREFS = ['Feather pillow', 'Hypoallergenic bedding', 'High floor', 'Quiet room', 'Vegetarian', 'Jain meals', 'Vegan', 'Gluten‑free', 'Twin beds', 'Extra towels', 'Late checkout', 'Room away from lift', 'Masala chai on arrival', 'Newspaper: The Hindu', 'Newspaper: FT', 'Allergic to nuts']
const TAGS = ['VIP', 'Honeymoon', 'Corporate', 'Repeat', 'Family', 'Wellness', 'Wedding guest', 'Influencer', 'Celebrity', 'Travel agent']
const COMPANIES = ['Tata Consultancy', 'Infosys', 'Reliance Industries', 'HDFC Bank', 'Deloitte India', 'McKinsey & Co', 'Unilever', 'Accenture', 'Mahindra Group', 'Goldman Sachs']

const SOURCES: [BookingSource, number][] = [['Website', 0.36], ['Booking.com', 0.14], ['MakeMyTrip', 0.14], ['Expedia', 0.07], ['Agoda', 0.06], ['Corporate', 0.1], ['Phone', 0.08], ['Walk-in', 0.05]]

export function generateSeed(today = new Date()) {
  const r = mulberry32(20260928)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  const int = (a: number, b: number) => Math.floor(r() * (b - a + 1)) + a
  const weighted = <T,>(arr: [T, number][]) => {
    let x = r()
    for (const [v, w] of arr) { if ((x -= w) <= 0) return v }
    return arr[0][0]
  }
  const T = iso(today)

  // ---- Guests
  const guests: Guest[] = Array.from({ length: 260 }, (_, i) => {
    const firstName = pick(FIRST)
    const lastName = pick(LAST)
    const [city, country] = pick(CITIES)
    const corporate = r() < 0.18
    const tags = Array.from(new Set(Array.from({ length: int(0, 2) }, () => pick(TAGS)).concat(corporate ? ['Corporate'] : [])))
    return {
      id: `g${i + 1}`,
      firstName, lastName,
      email: `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, '') + `${i}@mail.com`,
      phone: country === 'India' ? `+91 9${int(100000000, 999999999)}` : `+${int(1, 81)} ${int(200, 999)} ${int(100, 999)} ${int(1000, 9999)}`,
      city, country,
      tier: 'Member',
      points: 0,
      tags,
      preferences: Array.from(new Set(Array.from({ length: int(0, 3) }, () => pick(PREFS)))),
      birthday: `19${int(60, 99)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
      anniversary: r() < 0.4 ? `20${String(int(0, 22)).padStart(2, '0')}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}` : undefined,
      notes: r() < 0.25 ? pick(['Prefers the same butler as last visit.', 'Celebrated 25th anniversary with us in 2024.', 'Travels with a small dog — arrange pet amenities.', 'Photographer; appreciates sunrise boat access.', 'Board member — send GM welcome note.']) : '',
      createdAt: iso(subDays(today, int(30, 1400))),
      marketingOptIn: r() < 0.72,
      company: corporate ? pick(COMPANIES) : undefined,
    }
  })

  // ---- Rooms
  const rooms: Room[] = []
  for (const h of HOTELS) {
    let floor = 1
    let n = 1
    for (const rt of h.roomTypes) {
      for (let k = 0; k < rt.count; k++) {
        if (n > 12) { floor++; n = 1 }
        rooms.push({ id: `${h.id}-${floor}${String(n).padStart(2, '0')}`, hotelId: h.id, roomTypeId: rt.id, number: `${floor}${String(n).padStart(2, '0')}`, floor, hk: 'clean' })
        n++
      }
      floor++
      n = 1
    }
  }

  // ---- Bookings
  const bookings: Booking[] = []
  const start = subDays(today, 40)
  const end = addDays(today, 55)
  let seq = 1
  const plans = ['bb', 'bb', 'bb', 'ro', 'hb', 'nr']
  for (const room of rooms) {
    let d = addDays(start, int(-3, 2))
    while (d < end) {
      const ahead = (d.getTime() - today.getTime()) / 864e5
      const gap = ahead > 25 ? int(1, 8) : ahead > 7 ? int(0, 4) : int(0, 2)
      d = addDays(d, gap)
      const len = int(1, 5)
      const ci = iso(d)
      const co = iso(addDays(d, len))
      if (d >= end) break
      const rt = roomTypeById(room.roomTypeId)
      const g = pick(guests)
      const adults = Math.min(rt.maxGuests, int(1, 2) + (r() < 0.2 ? 1 : 0))
      const children = rt.maxGuests - adults > 0 && r() < 0.18 ? 1 : 0
      const ratePlanId = pick(plans)
      const addOns = r() < 0.3 ? [pick(['transfer', 'dinner', 'spa', 'celebration', 'heritage'])] : []
      const q = quote({ roomTypeId: rt.id, checkIn: ci, checkOut: co, ratePlanId, addOns, adults, children })
      let status: Booking['status'] = 'confirmed'
      if (co <= T) status = r() < 0.03 ? 'no-show' : 'checked-out'
      else if (ci < T) status = 'checked-in'
      else if (ci === T) status = r() < 0.35 ? 'checked-in' : 'confirmed'
      const source = weighted(SOURCES)
      const createdAt = iso(subDays(d, int(2, 70)))
      const b: Booking = {
        id: `b${seq}`, ref: `VR${(100000 + seq * 37).toString(36).toUpperCase().slice(-6).padStart(6, '0')}`,
        hotelId: room.hotelId, roomTypeId: rt.id, roomNo: room.number, guestId: g.id,
        checkIn: ci, checkOut: co, adults, children, ratePlanId, addOns,
        roomTotal: q.roomTotal, addOnTotal: q.addOnTotal, discount: 0, tax: q.tax, total: q.total,
        paid: status === 'checked-out' ? q.total : ratePlanId === 'nr' ? q.total : status === 'checked-in' ? Math.round(q.total * 0.3) : 0,
        status, source, createdAt,
        folio: [],
      }
      if (status === 'checked-in' || status === 'checked-out') {
        const extras = int(0, 3)
        for (let e = 0; e < extras; e++) {
          const item = pick([['In-room dining', 2400, 6800], ['Minibar', 900, 3200], ['Laundry', 600, 2200], ['Spa — Abhyanga', 7500, 7500], ['Bar — Polo Bar', 1800, 9000]] as [string, number, number][])
          const amt = Math.round(int(item[1], item[2]) / 50) * 50
          b.folio.push({ id: `f${seq}-${e}`, date: ci, description: item[0], amount: amt, type: 'charge' })
          if (status === 'checked-out') b.paid += amt
        }
      }
      bookings.push(b)
      seq++
      d = addDays(d, len)
    }
  }
  // Cancellations
  for (let i = 0; i < 90; i++) {
    const h = pick(HOTELS)
    const rt = pick(h.roomTypes)
    const d = addDays(today, int(-35, 50))
    const len = int(1, 4)
    const q = quote({ roomTypeId: rt.id, checkIn: iso(d), checkOut: iso(addDays(d, len)), ratePlanId: 'bb', addOns: [], adults: 2, children: 0 })
    bookings.push({ id: `b${seq}`, ref: `VR${(100000 + seq * 37).toString(36).toUpperCase().slice(-6)}`, hotelId: h.id, roomTypeId: rt.id, roomNo: null, guestId: pick(guests).id, checkIn: iso(d), checkOut: iso(addDays(d, len)), adults: 2, children: 0, ratePlanId: 'bb', addOns: [], roomTotal: q.roomTotal, addOnTotal: 0, discount: 0, tax: q.tax, total: q.total, paid: 0, status: 'cancelled', source: weighted(SOURCES), createdAt: iso(subDays(d, int(5, 60))), folio: [] })
    seq++
  }

  // Guest tiers & points from history (plus pre-history)
  const stats = new Map<string, { nights: number; spend: number }>()
  for (const b of bookings) {
    if (b.status === 'cancelled') continue
    const s = stats.get(b.guestId) ?? { nights: 0, spend: 0 }
    s.nights += (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 864e5
    s.spend += b.total
    stats.set(b.guestId, s)
  }
  for (const g of guests) {
    const s = stats.get(g.id) ?? { nights: 0, spend: 0 }
    const prior = int(0, 14)
    const nights = s.nights + prior
    g.tier = nights >= 40 ? 'Maharaja' : nights >= 25 ? 'Platinum' : nights >= 10 ? 'Gold' : nights >= 3 ? 'Silver' : 'Member'
    g.points = Math.round((s.spend / 100) * 5 + prior * 900)
    if (g.tier === 'Maharaja' && !g.tags.includes('VIP')) g.tags.push('VIP')
  }

  // Housekeeping status
  for (const room of rooms) {
    const occ = bookings.find((b) => b.roomNo === room.number && b.hotelId === room.hotelId && b.status === 'checked-in')
    const departed = bookings.find((b) => b.roomNo === room.number && b.hotelId === room.hotelId && b.checkOut === T && b.status === 'checked-out')
    room.hk = occ ? (r() < 0.55 ? 'dirty' : 'clean') : departed ? 'dirty' : r() < 0.6 ? 'inspected' : 'clean'
  }

  // ---- Staff
  const DEPTS: [Staff['department'], string[]][] = [
    ['Management', ['General Manager', 'Resident Manager']],
    ['Front Office', ['Front Office Manager', 'Guest Relations Executive', 'Front Desk Associate', 'Butler']],
    ['Housekeeping', ['Executive Housekeeper', 'Room Attendant', 'Room Attendant', 'Laundry Supervisor']],
    ['F&B', ['Restaurant Manager', 'Captain', 'Steward']],
    ['Kitchen', ['Executive Chef', 'Sous Chef', 'Commis']],
    ['Spa', ['Spa Manager', 'Ayurveda Therapist']],
    ['Engineering', ['Chief Engineer', 'Technician']],
    ['Security', ['Security Officer']],
    ['Sales', ['Director of Sales', 'Wedding Planner']],
  ]
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const staff: Staff[] = []
  let sid = 1
  for (const h of HOTELS) {
    for (const [dept, roles] of DEPTS) {
      for (const role of roles) {
        if (h.id === 'ghv' && r() < 0.35 && !['General Manager', 'Executive Chef', 'Front Office Manager'].includes(role)) continue
        const name = `${pick(FIRST.slice(0, 35))} ${pick(LAST.slice(0, 28))}`
        const off = int(0, 6)
        const shiftBase = pick(['M', 'E', 'N', 'M', 'E'] as const)
        const shift: Staff['shift'] = {}
        days.forEach((d, i) => (shift[d] = i === off || i === (off + 1) % 7 && r() < 0.3 ? 'O' : shiftBase))
        staff.push({
          id: `s${sid++}`, name, hotelId: h.id, department: dept, role,
          phone: `+91 9${int(100000000, 999999999)}`,
          email: `${name.split(' ')[0].toLowerCase()}.${h.id}@virasat.example`,
          joined: iso(subDays(today, int(90, 4000))),
          status: r() < 0.08 ? 'On leave' : r() < 0.7 ? 'On duty' : 'Off',
          shift, rating: Math.round((3.6 + r() * 1.4) * 10) / 10,
          avatar: name,
        })
      }
    }
  }

  // ---- Vendors & inventory
  const vendors: Vendor[] = [
    { id: 'v1', name: 'Jaipur Linen House', category: 'Linen', contact: 'Rakesh Gupta', phone: '+91 98290 11223', rating: 4.6 },
    { id: 'v2', name: 'Forest Essentials (Hotel Div.)', category: 'Amenities', contact: 'Nisha Rao', phone: '+91 98110 44556', rating: 4.8 },
    { id: 'v3', name: 'Metro Cash & Carry', category: 'F&B', contact: 'Accounts Desk', phone: '+91 80 4000 1234', rating: 4.2 },
    { id: 'v4', name: 'Himalayan Spring Water', category: 'Minibar', contact: 'Arun Thakur', phone: '+91 98160 77889', rating: 4.4 },
    { id: 'v5', name: 'EcoClean Supplies', category: 'Housekeeping', contact: 'Priya Menon', phone: '+91 98450 99001', rating: 4.1 },
    { id: 'v6', name: 'Havells Pro Services', category: 'Engineering', contact: 'Service Desk', phone: '+91 1800 103 1313', rating: 4.3 },
  ]
  const ITEMS: [string, InventoryItem['category'], string, number, number, string][] = [
    ['Bath towel (Egyptian cotton)', 'Linen', 'pcs', 320, 850, 'v1'], ['Bed sheet — King, 400TC', 'Linen', 'pcs', 260, 1900, 'v1'], ['Pillow cover', 'Linen', 'pcs', 400, 320, 'v1'], ['Bathrobe', 'Linen', 'pcs', 120, 2600, 'v1'],
    ['Shampoo 40ml — Kashmiri saffron', 'Amenities', 'bottles', 900, 95, 'v2'], ['Body lotion 40ml', 'Amenities', 'bottles', 900, 110, 'v2'], ['Soap — sandalwood', 'Amenities', 'pcs', 1100, 60, 'v2'], ['Dental kit', 'Amenities', 'kits', 700, 35, 'v2'], ['Slippers', 'Amenities', 'pairs', 500, 90, 'v2'],
    ['Mineral water 500ml', 'Minibar', 'bottles', 1500, 28, 'v4'], ['Indian craft gin (miniature)', 'Minibar', 'bottles', 180, 420, 'v3'], ['Masala cashews', 'Minibar', 'packs', 300, 160, 'v3'], ['Artisanal chocolate', 'Minibar', 'bars', 260, 210, 'v3'],
    ['Basmati rice', 'F&B', 'kg', 400, 140, 'v3'], ['Saffron (Kashmiri)', 'F&B', 'g', 500, 320, 'v3'], ['Ghee (A2)', 'F&B', 'kg', 120, 950, 'v3'], ['Darjeeling tea', 'F&B', 'kg', 25, 3200, 'v3'],
    ['Floor cleaner (eco)', 'Housekeeping', 'litres', 160, 180, 'v5'], ['Glass cleaner', 'Housekeeping', 'litres', 80, 150, 'v5'], ['LED bulb 9W', 'Engineering', 'pcs', 150, 120, 'v6'], ['AC filter', 'Engineering', 'pcs', 60, 650, 'v6'],
  ]
  const inventory: InventoryItem[] = []
  let iid = 1
  for (const h of HOTELS) {
    const scale = h.roomTypes.reduce((s, x) => s + x.count, 0) / 40
    for (const [name, category, unit, par, cost, vendorId] of ITEMS) {
      const p = Math.max(10, Math.round(par * scale))
      const low = r() < 0.14
      inventory.push({ id: `i${iid++}`, hotelId: h.id, name, category, unit, par: p, reorder: Math.round(p * 0.35), stock: low ? int(Math.round(p * 0.08), Math.round(p * 0.3)) : int(Math.round(p * 0.45), Math.round(p * 1.05)), cost, vendorId })
    }
  }
  const purchaseOrders: PurchaseOrder[] = [
    { id: 'PO-2041', hotelId: 'abp', vendorId: 'v1', items: [{ itemId: inventory.find((i) => i.hotelId === 'abp' && i.category === 'Linen')!.id, qty: 120, cost: 850 }], status: 'Sent', createdAt: iso(subDays(today, 2)), total: 102000 },
    { id: 'PO-2040', hotelId: 'jmn', vendorId: 'v2', items: [{ itemId: inventory.find((i) => i.hotelId === 'jmn' && i.category === 'Amenities')!.id, qty: 400, cost: 95 }], status: 'Received', createdAt: iso(subDays(today, 6)), total: 38000 },
    { id: 'PO-2039', hotelId: 'kvr', vendorId: 'v3', items: [{ itemId: inventory.find((i) => i.hotelId === 'kvr' && i.category === 'F&B')!.id, qty: 150, cost: 140 }], status: 'Received', createdAt: iso(subDays(today, 9)), total: 21000 },
  ]

  // ---- Leads
  const STAGES: LeadStage[] = ['New', 'Contacted', 'Site Visit', 'Proposal', 'Negotiation', 'Won', 'Lost']
  const leads: Lead[] = Array.from({ length: 34 }, (_, i) => {
    const type = pick(['Wedding', 'Wedding', 'Wedding', 'MICE', 'Corporate', 'Group', 'Social'] as Lead['type'][])
    const guestsN = type === 'Wedding' ? int(120, 600) : type === 'MICE' ? int(60, 250) : int(15, 80)
    const fn = pick(FIRST.slice(0, 35)), ln = pick(LAST.slice(0, 28))
    const company = type === 'Wedding' || type === 'Social' ? undefined : pick(COMPANIES)
    return {
      id: `l${i + 1}`,
      name: type === 'Wedding' ? `${fn} ${ln} & ${pick(FIRST.slice(12, 30))} ${pick(LAST.slice(0, 28))}` : `${fn} ${ln}`,
      company, email: `${fn.toLowerCase()}@${company ? company.split(' ')[0].toLowerCase() : 'gmail'}.com`, phone: `+91 9${int(100000000, 999999999)}`,
      type, hotelId: pick(['abp', 'abp', 'jmn', 'jmn', 'kvr', 'cfg', 'rls', 'ghv']),
      eventDate: iso(addDays(today, int(20, 300))), guests: guestsN,
      value: Math.round((type === 'Wedding' ? guestsN * int(18000, 42000) : guestsN * int(9000, 22000)) / 10000) * 10000,
      stage: STAGES[Math.min(6, Math.floor(r() * 7))], owner: pick(['Radhika Iyer', 'Sameer Khan', 'Anjali Menon']),
      source: pick(['Website enquiry', 'Instagram', 'Wedding planner', 'Referral', 'Corporate RFP', 'Trade fair']),
      createdAt: iso(subDays(today, int(1, 90))),
      notes: type === 'Wedding' ? 'Looking for a 3‑day celebration: mehendi, sangeet and pheras by the water.' : 'Offsite for leadership team, needs breakout rooms and AV.',
    }
  })

  // ---- Reviews
  const POS = [['An unforgettable stay', 'From the tilak welcome to the farewell garland, every detail was perfect. Our butler anticipated everything.'], ['Pure magic', 'The palace is breathtaking and the food at the signature restaurant was the best Indian meal we have ever had.'], ['Heritage done right', 'Beautifully restored without losing its soul. Staff are warm and genuinely proud of the history.'], ['Perfect honeymoon', 'The candlelit dinner and room decoration made our honeymoon special. Will return for our anniversary.']]
  const NEU = [['Beautiful but slow check-in', 'Lovely property, but check-in took almost 40 minutes. Rooms were stunning once we got there.'], ['Great location, dated bathroom', 'The views are spectacular. Our bathroom fixtures felt a little dated for the price.']]
  const NEG = [['Disappointed with service', 'Room service took over an hour and the AC was noisy. Management did respond quickly when we complained.']]
  const reviews: Review[] = Array.from({ length: 96 }, (_, i) => {
    const x = r()
    const [sentiment, pool, rating] = x < 0.8 ? ['positive', POS, int(4, 5)] as const : x < 0.94 ? ['neutral', NEU, 3] as const : ['negative', NEG, int(1, 2)] as const
    const [title, body] = pick(pool as string[][])
    const g = pick(guests)
    return {
      id: `rv${i + 1}`, hotelId: pick(HOTELS).id, guestName: `${g.firstName} ${g.lastName[0]}.`, rating, title, body,
      source: pick(['Google', 'TripAdvisor', 'Booking.com', 'Website'] as Review['source'][]), date: iso(subDays(today, int(0, 120))),
      sentiment, tags: sentiment === 'positive' ? [pick(['Service', 'Food', 'Views', 'Rooms', 'Spa'])] : [pick(['Check‑in', 'Room service', 'Maintenance', 'Value'])],
      reply: r() < 0.5 ? 'Thank you for staying with us — we look forward to welcoming you home again.' : undefined,
      nps: sentiment === 'positive' ? int(9, 10) : sentiment === 'neutral' ? int(7, 8) : int(2, 6),
    }
  })

  // ---- CRM config
  const segments: Segment[] = [
    { id: 'seg-vip', name: 'VIP & Maharaja', description: 'Top-tier loyalty members and flagged VIPs', rules: [{ field: 'tier', op: 'is', value: 'Maharaja' }], color: '#B08D57' },
    { id: 'seg-repeat', name: 'Loyal repeat guests', description: 'Two or more stays', rules: [{ field: 'stays', op: 'gte', value: 2 }], color: '#1F4E5A' },
    { id: 'seg-high', name: 'High spenders', description: 'Lifetime spend above ₹2 lakh', rules: [{ field: 'spend', op: 'gte', value: 200000 }], color: '#9E3B2A' },
    { id: 'seg-corp', name: 'Corporate travellers', description: 'Tagged corporate', rules: [{ field: 'tag', op: 'has', value: 'Corporate' }], color: '#4F6B3A' },
    { id: 'seg-intl', name: 'International guests', description: 'Guests residing outside India', rules: [{ field: 'country', op: 'is', value: '!India' }], color: '#6B6358' },
    { id: 'seg-optin', name: 'Newsletter subscribers', description: 'Opted in to marketing', rules: [{ field: 'optIn', op: 'is', value: true }], color: '#2B6676' },
  ]
  const campaigns: Campaign[] = [
    { id: 'c1', name: 'Diwali in the Palaces 2026', channel: 'Email', segmentId: 'seg-optin', subject: 'Ten thousand diyas await you', body: 'Celebrate the festival of lights at Amer Bagh Palace…', status: 'Scheduled', scheduledFor: iso(addDays(today, 5)), sent: 0, opened: 0, clicked: 0, bookings: 0, revenue: 0, createdAt: iso(subDays(today, 3)) },
    { id: 'c2', name: 'Monsoon Palaces — last call', channel: 'Email', segmentId: 'seg-repeat', subject: 'The lakes are full. Your suite is waiting.', body: '25% off stays of three nights…', status: 'Sent', sent: 4820, opened: 2217, clicked: 612, bookings: 48, revenue: 3840000, createdAt: iso(subDays(today, 28)) },
    { id: 'c3', name: 'VIP winter preview', channel: 'WhatsApp', segmentId: 'seg-vip', subject: 'A private invitation', body: 'Namaste {first_name}, our winter season opens…', status: 'Sent', sent: 186, opened: 171, clicked: 94, bookings: 21, revenue: 4620000, createdAt: iso(subDays(today, 14)) },
    { id: 'c4', name: 'Corporate offsites Q4', channel: 'Email', segmentId: 'seg-corp', subject: 'Leadership offsites, reimagined', body: 'Board rooms with a view of Amer Fort…', status: 'Sent', sent: 920, opened: 386, clicked: 88, bookings: 6, revenue: 2100000, createdAt: iso(subDays(today, 40)) },
    { id: 'c5', name: 'Ayurveda immersion', channel: 'Email', segmentId: 'seg-intl', subject: 'Seven days to begin again', body: 'Our vaidya invites you…', status: 'Draft', sent: 0, opened: 0, clicked: 0, bookings: 0, revenue: 0, createdAt: iso(subDays(today, 1)) },
  ]
  const automations: Automation[] = [
    { id: 'a1', name: 'Pre-arrival welcome', trigger: '3 days before check‑in', action: 'Send pre‑arrival email with preferences form', channel: 'Email', active: true, runs: 1842, conversions: 412 },
    { id: 'a2', name: 'Birthday greeting & offer', trigger: '7 days before birthday', action: 'Send 15% birthday stay offer', channel: 'WhatsApp', active: true, runs: 624, conversions: 58 },
    { id: 'a3', name: 'Post-stay review request', trigger: '1 day after check‑out', action: 'Request review on Google / TripAdvisor', channel: 'Email', active: true, runs: 2210, conversions: 684 },
    { id: 'a4', name: 'Win-back lapsed guests', trigger: 'No stay in 12 months', action: 'Send personalised return offer', channel: 'Email', active: false, runs: 310, conversions: 22 },
    { id: 'a5', name: 'Wedding lead follow-up', trigger: 'Lead idle for 3 days', action: 'Create task for wedding planner', channel: 'Task', active: true, runs: 96, conversions: 31 },
    { id: 'a6', name: 'Anniversary surprise', trigger: 'Stay overlaps anniversary', action: 'Alert front desk to arrange cake & décor', channel: 'Internal', active: true, runs: 142, conversions: 142 },
  ]

  // ---- Maintenance
  const tickets: Ticket[] = Array.from({ length: 16 }, (_, i) => {
    const room = pick(rooms)
    return {
      id: `T-${1100 + i}`, hotelId: room.hotelId, roomNo: room.number,
      title: pick(['Leaking shower mixer', 'AC not cooling', 'TV remote not working', 'Wi‑Fi dropping', 'Loose wardrobe hinge', 'Flickering lamp', 'Blocked washbasin', 'Safe locker jammed']),
      category: pick(['Plumbing', 'Electrical', 'HVAC', 'Furniture', 'IT'] as Ticket['category'][]),
      priority: pick(['Low', 'Medium', 'Medium', 'High', 'Urgent'] as Ticket['priority'][]),
      status: pick(['Open', 'Open', 'In Progress', 'Resolved'] as Ticket['status'][]),
      assignee: pick(['Mohan (Engg.)', 'Suresh (Engg.)', 'Vijay (IT)']),
      createdAt: iso(subDays(today, int(0, 6))),
    }
  })
  for (const t of tickets.filter((t) => t.priority === 'Urgent' && t.status !== 'Resolved').slice(0, 3)) {
    const room = rooms.find((x) => x.hotelId === t.hotelId && x.number === t.roomNo)
    if (room && !bookings.some((b) => b.hotelId === room.hotelId && b.roomNo === room.number && b.status === 'checked-in')) room.hk = 'out-of-order'
  }

  const audit: AuditEntry[] = [
    { id: 'au1', at: new Date(today.getTime() - 36e5).toISOString(), user: 'Front Desk', action: 'Check‑in', detail: 'Room 104 — Jal Mahal Niwas' },
    { id: 'au2', at: new Date(today.getTime() - 72e5).toISOString(), user: 'General Manager', action: 'Rate change', detail: 'Lake View Room +8% for Diwali week' },
    { id: 'au3', at: new Date(today.getTime() - 9e6).toISOString(), user: 'Sales & CRM', action: 'Lead won', detail: 'Wedding — Amer Bagh Palace, 420 guests' },
  ]
  const notices: Notice[] = [
    { id: 'n1', at: new Date(today.getTime() - 18e5).toISOString(), kind: 'stock', text: 'Bath towels below reorder level at Amer Bagh Palace', read: false },
    { id: 'n2', at: new Date(today.getTime() - 54e5).toISOString(), kind: 'review', text: 'New 5★ review on Google for Jal Mahal Niwas', read: false },
    { id: 'n3', at: new Date(today.getTime() - 1e7).toISOString(), kind: 'lead', text: 'Wedding enquiry: 350 guests, Udaipur, February', read: true },
  ]

  return { guests, rooms, bookings, staff, vendors, inventory, purchaseOrders, stockMoves: [], leads, reviews, segments, campaigns, automations, tickets, audit, notices, tableBookings: [], rateOverrides: {}, stopSell: [], seededOn: T }
}

export type SeedData = ReturnType<typeof generateSeed>
