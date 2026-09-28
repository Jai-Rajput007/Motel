import { useState } from 'react'
import { LogIn, LogOut, Plus, UserPlus } from 'lucide-react'
import { hotelById, roomTypeById, allRoomTypes } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { useScoped } from '../../lib/hooks'
import { availability } from '../../lib/pricing'
import { statusColor } from '../../lib/selectors'
import { addDaysISO, fmtDate, inr, nightsBetween, todayISO } from '../../lib/utils'
import { Avatar, Badge, Card, PageHeader, Stat, Tabs } from '../../components/admin/ui'
import BookingDrawer from '../../components/admin/BookingDrawer'
import { NewBooking } from './Reservations'

export default function FrontDesk() {
  const { bookings, rooms, property } = useScoped()
  const { guests, checkIn, stopSell } = useStore()
  const [tab, setTab] = useState<'Arrivals' | 'Departures' | 'In-house'>('Arrivals')
  const [open, setOpen] = useState<string | null>(null)
  const [walkin, setWalkin] = useState(false)
  const T = todayISO()
  const arrivals = bookings.filter((b) => b.checkIn === T && (b.status === 'confirmed' || b.status === 'checked-in'))
  const departures = bookings.filter((b) => b.checkOut === T && (b.status === 'checked-in' || b.status === 'checked-out'))
  const inHouse = bookings.filter((b) => b.status === 'checked-in')
  const list = tab === 'Arrivals' ? arrivals : tab === 'Departures' ? departures : inHouse
  const g = (id: string) => guests.find((x) => x.id === id)
  const types = allRoomTypes.filter((r) => property === 'all' || r.hotelId === property)
  const allRooms = useStore((s) => s.rooms)
  const allBookings = useStore((s) => s.bookings)

  return (
    <div className="space-y-6">
      <PageHeader title="Front Desk" sub={`${fmtDate(T, 'EEEE d MMMM')} · ${property === 'all' ? 'All properties' : hotelById(property).name}`} actions={<button onClick={() => setWalkin(true)} className="a-btn"><UserPlus size={14} /> Walk-in</button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Expected arrivals" value={arrivals.filter((b) => b.status === 'confirmed').length} hint={`${arrivals.filter((b) => b.status === 'checked-in').length} already arrived`} icon={<LogIn size={16} />} />
        <Stat label="Departures" value={departures.filter((b) => b.status === 'checked-in').length} hint={`${departures.filter((b) => b.status === 'checked-out').length} checked out`} icon={<LogOut size={16} />} tone="gold" />
        <Stat label="In-house guests" value={inHouse.reduce((a, b) => a + b.adults + b.children, 0)} hint={`${inHouse.length} rooms occupied`} tone="leaf" />
        <Stat label="Rooms ready" value={rooms.filter((r) => r.hk === 'inspected' || r.hk === 'clean').length} hint={`${rooms.filter((r) => r.hk === 'dirty').length} dirty`} tone="sindoor" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card title={<Tabs tabs={['Arrivals', 'Departures', 'In-house'] as const} value={tab} onChange={setTab} />} pad={false}>
          <ul className="divide-y divide-kohl/5 dark:divide-white/5">
            {list.slice(0, 40).map((b) => {
              const guest = g(b.guestId)
              const room = rooms.find((r) => r.hotelId === b.hotelId && r.number === b.roomNo)
              const balance = b.total + b.folio.filter((f) => f.type === 'charge').reduce((a, f) => a + f.amount, 0) - b.paid
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5 hover:bg-kohl/[0.02] dark:hover:bg-white/[0.03]">
                  <Avatar name={`${guest?.firstName} ${guest?.lastName}`} size={36} />
                  <button onClick={() => setOpen(b.id)} className="min-w-[180px] flex-1 text-left">
                    <p className="text-sm font-medium dark:text-ivory">{guest?.firstName} {guest?.lastName} {guest && guest.tier !== 'Member' && <Badge className="ml-1 bg-gold/15 text-[#8a6a36] dark:text-gold-2">{guest.tier}</Badge>}</p>
                    <p className="text-xs text-stone">{b.ref} · {roomTypeById(b.roomTypeId).name} · {nightsBetween(b.checkIn, b.checkOut)}n{property === 'all' && ` · ${hotelById(b.hotelId).city}`}</p>
                    {b.specialRequests && <p className="mt-0.5 truncate text-xs text-[#8a6a36] dark:text-gold-2">★ {b.specialRequests}</p>}
                  </button>
                  <div className="text-center text-xs"><p className="text-stone">Room</p><p className="font-semibold dark:text-ivory">{b.roomNo ?? '—'}</p>{room && <p className={room.hk === 'dirty' ? 'text-sindoor' : 'text-leaf'}>{room.hk}</p>}</div>
                  <div className="w-24 text-right text-xs"><p className="text-stone">Balance</p><p className="font-semibold dark:text-ivory">{inr(Math.max(0, balance))}</p></div>
                  <div className="w-28 text-right">
                    {b.status === 'confirmed' && <button onClick={() => checkIn(b.id)} className="a-btn py-1.5 text-xs"><LogIn size={13} /> Check in</button>}
                    {b.status === 'checked-in' && tab !== 'Arrivals' && <button onClick={() => setOpen(b.id)} className="a-btn-ghost py-1.5 text-xs"><LogOut size={13} /> Check out</button>}
                    {(b.status === 'checked-out' || (b.status === 'checked-in' && tab === 'Arrivals')) && <Badge className={statusColor[b.status]}>{b.status}</Badge>}
                  </div>
                </li>
              )
            })}
            {!list.length && <li className="p-8 text-center text-sm text-stone">Nothing here right now.</li>}
          </ul>
        </Card>
        <Card title="Availability tonight">
          <ul className="space-y-2.5 text-sm">
            {types.map((rt) => {
              const a = availability(rt.id, T, addDaysISO(T, 1), allBookings, allRooms, stopSell)
              return (
                <li key={rt.id} className="flex items-center justify-between dark:text-sand">
                  <span className="truncate">{rt.name}{property === 'all' && <span className="text-xs text-stone"> · {hotelById(rt.hotelId).city}</span>}</span>
                  <Badge className={a === 0 ? 'bg-sindoor/10 text-sindoor' : a <= 2 ? 'bg-gold/15 text-[#8a6a36]' : 'bg-leaf/15 text-leaf'}>{a === 0 ? 'Sold out' : `${a} left`}</Badge>
                </li>
              )
            })}
          </ul>
          <button onClick={() => setWalkin(true)} className="a-btn-ghost mt-5 w-full"><Plus size={14} /> Book a walk-in</button>
        </Card>
      </div>
      <BookingDrawer id={open} onClose={() => setOpen(null)} />
      <NewBooking open={walkin} onClose={() => setWalkin(false)} />
    </div>
  )
}
