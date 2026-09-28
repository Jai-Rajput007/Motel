export type RoomType = {
  id: string
  name: string
  category: 'Room' | 'Suite' | 'Villa'
  size: number
  bed: string
  view: string
  maxGuests: number
  baseRate: number
  count: number
  images: string[]
  description: string
  amenities: string[]
}

export type Venue = { name: string; cuisine: string; description: string; image: string; hours: string }
export type Experience = { id: string; name: string; description: string; image: string; price: number; duration: string; category: string }

export type Hotel = {
  id: string
  slug: string
  name: string
  city: string
  state: string
  region: string
  type: string
  established: number
  tagline: string
  intro: string
  story: string
  hero: string
  gallery: string[]
  coords: [number, number]
  rating: number
  reviews: number
  roomTypes: RoomType[]
  dining: Venue[]
  experiences: Experience[]
  highlights: string[]
  amenities: string[]
  address: string
  phone: string
}

export type BookingStatus = 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled' | 'no-show'
export type BookingSource = 'Website' | 'Booking.com' | 'Expedia' | 'MakeMyTrip' | 'Agoda' | 'Walk-in' | 'Corporate' | 'Phone'

export type RatePlan = { id: string; name: string; description: string; modifier: number; refundable: boolean; includes: string[] }

export type AddOn = { id: string; name: string; price: number; per: 'stay' | 'night' | 'guest'; description: string }

export type Booking = {
  id: string
  ref: string
  hotelId: string
  roomTypeId: string
  roomNo: string | null
  guestId: string
  checkIn: string // yyyy-MM-dd
  checkOut: string
  adults: number
  children: number
  ratePlanId: string
  addOns: string[]
  roomTotal: number
  addOnTotal: number
  discount: number
  tax: number
  total: number
  paid: number
  status: BookingStatus
  source: BookingSource
  createdAt: string
  specialRequests?: string
  promo?: string
  folio: FolioLine[]
}

export type FolioLine = { id: string; date: string; description: string; amount: number; type: 'charge' | 'payment' }

export type Guest = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  city: string
  country: string
  tier: 'Member' | 'Silver' | 'Gold' | 'Platinum' | 'Maharaja'
  points: number
  tags: string[]
  preferences: string[]
  birthday?: string
  anniversary?: string
  notes: string
  createdAt: string
  marketingOptIn: boolean
  company?: string
}

export type HKStatus = 'clean' | 'dirty' | 'inspected' | 'out-of-order'
export type Room = { id: string; hotelId: string; roomTypeId: string; number: string; floor: number; hk: HKStatus; attendant?: string }

export type Staff = {
  id: string
  name: string
  hotelId: string
  department: 'Front Office' | 'Housekeeping' | 'F&B' | 'Kitchen' | 'Spa' | 'Engineering' | 'Security' | 'Sales' | 'Management'
  role: string
  phone: string
  email: string
  joined: string
  status: 'On duty' | 'Off' | 'On leave'
  shift: Record<string, 'M' | 'E' | 'N' | 'O'>
  rating: number
  avatar: string
}

export type InventoryItem = {
  id: string
  hotelId: string
  name: string
  category: 'Linen' | 'Amenities' | 'Minibar' | 'F&B' | 'Housekeeping' | 'Engineering'
  unit: string
  stock: number
  par: number
  reorder: number
  cost: number
  vendorId: string
}

export type Vendor = { id: string; name: string; category: string; contact: string; phone: string; rating: number }

export type PurchaseOrder = {
  id: string
  hotelId: string
  vendorId: string
  items: { itemId: string; qty: number; cost: number }[]
  status: 'Draft' | 'Sent' | 'Received'
  createdAt: string
  total: number
}

export type StockMove = { id: string; itemId: string; qty: number; reason: string; date: string }

export type LeadStage = 'New' | 'Contacted' | 'Site Visit' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost'
export type Lead = {
  id: string
  name: string
  company?: string
  email: string
  phone: string
  type: 'Wedding' | 'MICE' | 'Corporate' | 'Group' | 'Social'
  hotelId: string
  eventDate: string
  guests: number
  value: number
  stage: LeadStage
  owner: string
  source: string
  createdAt: string
  notes: string
}

export type Review = {
  id: string
  hotelId: string
  guestName: string
  rating: number
  title: string
  body: string
  source: 'Google' | 'TripAdvisor' | 'Booking.com' | 'Website'
  date: string
  sentiment: 'positive' | 'neutral' | 'negative'
  tags: string[]
  reply?: string
  nps: number
}

export type Campaign = {
  id: string
  name: string
  channel: 'Email' | 'WhatsApp' | 'SMS'
  segmentId: string
  subject: string
  body: string
  status: 'Draft' | 'Scheduled' | 'Sent'
  scheduledFor?: string
  sent: number
  opened: number
  clicked: number
  bookings: number
  revenue: number
  createdAt: string
}

export type SegmentRule = { field: 'tier' | 'stays' | 'spend' | 'tag' | 'country' | 'lastStayDays' | 'optIn'; op: 'is' | 'gte' | 'lte' | 'has'; value: string | number | boolean }
export type Segment = { id: string; name: string; description: string; rules: SegmentRule[]; color: string }

export type Automation = { id: string; name: string; trigger: string; action: string; channel: string; active: boolean; runs: number; conversions: number }

export type Ticket = {
  id: string
  hotelId: string
  roomNo: string
  title: string
  category: 'Plumbing' | 'Electrical' | 'HVAC' | 'Furniture' | 'IT' | 'Other'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  status: 'Open' | 'In Progress' | 'Resolved'
  assignee: string
  createdAt: string
}

export type AuditEntry = { id: string; at: string; user: string; action: string; detail: string }
export type Notice = { id: string; at: string; kind: 'booking' | 'lead' | 'stock' | 'review' | 'system'; text: string; read: boolean }

export type Role = 'Owner' | 'General Manager' | 'Front Desk' | 'Housekeeping' | 'Sales & CRM'

export type TableBooking = { id: string; hotelId: string; venue: string; name: string; email: string; date: string; time: string; guests: number; createdAt: string }
