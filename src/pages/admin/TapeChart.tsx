import { useMemo, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import clsx from 'clsx'
import { HOTELS, hotelById } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { addDaysISO, iso, nightsBetween, todayISO } from '../../lib/utils'
import { PageHeader } from '../../components/admin/ui'
import BookingDrawer from '../../components/admin/BookingDrawer'

const DAYS = 18
const COL = 64

const barColor: Record<string, string> = {
  confirmed: 'bg-peacock text-white',
  'checked-in': 'bg-leaf text-white',
  'checked-out': 'bg-stone/40 text-kohl dark:text-ivory',
  'no-show': 'bg-gold/50 text-kohl',
}

export default function TapeChart() {
  const { property, bookings, rooms, guests, moveBooking, setUI } = useStore()
  const [local, setLocal] = useState(property === 'all' ? HOTELS[0].id : property)
  const hotelId = property === 'all' ? local : property
  const hotel = hotelById(hotelId)
  const [start, setStart] = useState(addDaysISO(todayISO(), -3))
  const [open, setOpen] = useState<string | null>(null)
  const [drag, setDrag] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const days = Array.from({ length: DAYS }, (_, i) => iso(addDays(parseISO(start), i)))
  const end = days[days.length - 1]
  const T = todayISO()
  const hRooms = rooms.filter((r) => r.hotelId === hotelId)
  const gmap = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests])
  const hBookings = bookings.filter((b) => b.hotelId === hotelId && b.roomNo && b.status !== 'cancelled' && b.checkOut > start && b.checkIn <= end)
  const flash = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 3000) }

  const onDrop = (roomNo: string, date: string) => {
    if (!drag) return
    const b = bookings.find((x) => x.id === drag)
    const err = moveBooking(drag, roomNo, b?.status === 'checked-in' || !b?.roomNo ? b!.checkIn : date)
    setDrag(null)
    setHover(null)
    flash(!err, err ?? `Moved to room ${roomNo}`)
  }

  const unassigned = bookings.filter((b) => b.hotelId === hotelId && !b.roomNo && (b.status === 'confirmed' || b.status === 'checked-in') && b.checkOut > T)
  const occTonight = hBookings.filter((b) => b.checkIn <= T && T < b.checkOut && b.status !== 'no-show').length

  return (
    <div>
      <PageHeader
        title="Tape Chart"
        sub={<>Drag a booking to another room or date · {occTonight}/{hRooms.length} rooms occupied tonight</>}
        actions={
          <>
            {property === 'all' && (
              <select className="a-input w-auto" value={local} onChange={(e) => setLocal(e.target.value)}>
                {HOTELS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            )}
            {property === 'all' && <button onClick={() => setUI({ property: local })} className="a-btn-ghost text-xs">Pin property</button>}
            <div className="flex items-center gap-1">
              <button onClick={() => setStart(addDaysISO(start, -7))} className="a-btn-ghost px-2" aria-label="Previous week"><ChevronLeft size={16} /></button>
              <button onClick={() => setStart(addDaysISO(todayISO(), -3))} className="a-btn-ghost">Today</button>
              <button onClick={() => setStart(addDaysISO(start, 7))} className="a-btn-ghost px-2" aria-label="Next week"><ChevronRight size={16} /></button>
            </div>
          </>
        }
      />
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-stone">
        {[['Confirmed', 'bg-peacock'], ['In-house', 'bg-leaf'], ['Departed', 'bg-stone/40'], ['Out of order', 'bg-kohl/20 dark:bg-white/20']].map(([l, c]) => <span key={l} className="flex items-center gap-1.5"><span className={clsx('h-3 w-5 rounded', c)} /> {l}</span>)}
      </div>
      {unassigned.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-sindoor/40 bg-sindoor/5 p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-sindoor">Unassigned ({unassigned.length}) — drag onto a room</span>
          {unassigned.map((b) => {
            const g = gmap.get(b.guestId)
            return (
              <button key={b.id} draggable onDragStart={() => setDrag(b.id)} onDragEnd={() => { setDrag(null); setHover(null) }} onClick={() => setOpen(b.id)} className="flex cursor-grab items-center gap-1 rounded-md bg-sindoor px-2.5 py-1 text-[11px] font-medium text-white shadow-sm">
                <GripVertical size={11} className="opacity-70" /> {g?.lastName}, {g?.firstName?.[0]}. · {format(parseISO(b.checkIn), 'd MMM')} · {nightsBetween(b.checkIn, b.checkOut)}n
              </button>
            )
          })}
        </div>
      )}
      <div className="panel overflow-x-auto">
        <div style={{ minWidth: 180 + DAYS * COL }}>
          <div className="sticky top-0 z-10 flex border-b border-kohl/10 bg-white dark:border-white/10 dark:bg-[#1f1d1a]">
            <div className="w-[180px] shrink-0 px-4 py-2 text-xs font-medium text-stone">{hotel.name}</div>
            {days.map((d) => {
              const dt = parseISO(d)
              const we = dt.getDay() === 5 || dt.getDay() === 6
              return (
                <div key={d} style={{ width: COL }} className={clsx('shrink-0 border-l border-kohl/5 py-1.5 text-center text-[11px] dark:border-white/5', d === T && 'bg-sindoor/10 font-semibold text-sindoor', we && d !== T && 'bg-gold/5')}>
                  <p className="uppercase text-stone">{format(dt, 'EEE')}</p>
                  <p className="text-sm dark:text-ivory">{format(dt, 'd')}</p>
                </div>
              )
            })}
          </div>
          {hotel.roomTypes.map((rt) => (
            <div key={rt.id}>
              <div className="border-b border-kohl/5 bg-kohl/[0.03] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone dark:border-white/5 dark:bg-white/[0.03]">{rt.name}</div>
              {hRooms.filter((r) => r.roomTypeId === rt.id).map((room) => {
                const rowBookings = hBookings.filter((b) => b.roomNo === room.number)
                return (
                  <div key={room.id} className="relative flex h-11 overflow-hidden border-b border-kohl/5 dark:border-white/5">
                    <div className="flex w-[180px] shrink-0 items-center gap-2 px-4 text-sm dark:text-sand">
                      <span className="font-medium">{room.number}</span>
                      <span className={clsx('h-1.5 w-1.5 rounded-full', room.hk === 'dirty' ? 'bg-sindoor' : room.hk === 'out-of-order' ? 'bg-kohl dark:bg-white' : 'bg-leaf')} title={room.hk} />
                      <span className="text-[11px] text-stone">{room.hk}</span>
                    </div>
                    {days.map((d) => (
                      <div
                        key={d}
                        style={{ width: COL }}
                        onDragOver={(e) => { e.preventDefault(); setHover(`${room.number}|${d}`) }}
                        onDrop={() => onDrop(room.number, d)}
                        className={clsx('shrink-0 border-l border-kohl/5 dark:border-white/5', d === T && 'bg-sindoor/5', room.hk === 'out-of-order' && 'bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(28,26,23,0.07)_6px,rgba(28,26,23,0.07)_12px)]', hover === `${room.number}|${d}` && 'bg-peacock/15')}
                      />
                    ))}
                    {rowBookings.map((b) => {
                      const s = Math.max(0, nightsBetween(start, b.checkIn))
                      const e = Math.min(DAYS, nightsBetween(start, b.checkOut))
                      if (e <= 0 || s >= DAYS) return null
                      const g = gmap.get(b.guestId)
                      return (
                        <button
                          key={b.id}
                          draggable={b.status !== 'checked-out'}
                          onDragStart={() => setDrag(b.id)}
                          onDragEnd={() => { setDrag(null); setHover(null) }}
                          onClick={() => setOpen(b.id)}
                          title={`${b.ref} · ${g?.firstName} ${g?.lastName}`}
                          style={{ left: 180 + s * COL + COL / 2, width: (e - s) * COL - 4 }}
                          className={clsx('absolute top-1.5 flex h-8 items-center gap-1 overflow-hidden rounded-md px-2 text-left text-[11px] font-medium shadow-sm transition hover:brightness-110', barColor[b.status] ?? 'bg-peacock text-white', drag === b.id && 'opacity-50', b.status !== 'checked-out' && 'cursor-grab active:cursor-grabbing')}
                        >
                          {b.status !== 'checked-out' && <GripVertical size={11} className="shrink-0 opacity-60" />}
                          <span className="truncate">{g?.lastName}, {g?.firstName?.[0]}. · {b.adults + b.children}p</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {toast && <div className={clsx('fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm text-white shadow-xl', toast.ok ? 'bg-leaf' : 'bg-sindoor')}>{toast.text}</div>}
      <BookingDrawer id={open} onClose={() => setOpen(null)} />
    </div>
  )
}
