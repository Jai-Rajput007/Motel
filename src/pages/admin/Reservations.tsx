import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Plus, Search } from 'lucide-react'
import { HOTELS, hotelById, roomTypeById } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { useScoped } from '../../lib/hooks'
import { statusColor } from '../../lib/selectors'
import { addDaysISO, downloadCSV, fmtDate, inr, nightsBetween, todayISO } from '../../lib/utils'
import { Badge, Card, Field, Modal, PageHeader } from '../../components/admin/ui'
import BookingDrawer from '../../components/admin/BookingDrawer'
import type { BookingSource } from '../../types'

export function NewBooking({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { property, createBooking } = useStore()
  const [f, setF] = useState({ hotelId: property === 'all' ? HOTELS[0].id : property, roomTypeId: '', checkIn: todayISO(), checkOut: addDaysISO(todayISO(), 2), adults: 2, firstName: '', lastName: '', email: '', phone: '', source: 'Walk-in' as BookingSource, ratePlanId: 'bb' })
  const [err, setErr] = useState('')
  const hotel = hotelById(f.hotelId)
  const rtId = f.roomTypeId || hotel.roomTypes[0].id
  const submit = () => {
    if (!f.firstName || !f.email) return setErr('Guest name and email are required')
    const b = createBooking({ hotelId: f.hotelId, roomTypeId: rtId, checkIn: f.checkIn, checkOut: f.checkOut, adults: f.adults, children: 0, ratePlanId: f.ratePlanId, addOns: [], guest: { firstName: f.firstName, lastName: f.lastName, email: f.email, phone: f.phone, country: 'India' }, source: f.source })
    if (!b) return setErr('No rooms of this type available for these dates')
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="New reservation">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Field label="Property"><select className="a-input" value={f.hotelId} onChange={(e) => setF({ ...f, hotelId: e.target.value, roomTypeId: '' })}>{HOTELS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field></div>
        <div className="col-span-2"><Field label="Room type"><select className="a-input" value={rtId} onChange={(e) => setF({ ...f, roomTypeId: e.target.value })}>{hotel.roomTypes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field></div>
        <Field label="Check-in"><input type="date" className="a-input" value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value })} /></Field>
        <Field label="Check-out"><input type="date" className="a-input" value={f.checkOut} onChange={(e) => setF({ ...f, checkOut: e.target.value })} /></Field>
        <Field label="First name"><input className="a-input" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></Field>
        <Field label="Last name"><input className="a-input" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></Field>
        <Field label="Email"><input className="a-input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Phone"><input className="a-input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Source"><select className="a-input" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as BookingSource })}>{['Walk-in', 'Phone', 'Corporate', 'Website'].map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Rate plan"><select className="a-input" value={f.ratePlanId} onChange={(e) => setF({ ...f, ratePlanId: e.target.value })}><option value="bb">Bed & Breakfast</option><option value="ro">Room Only</option><option value="hb">Half Board</option></select></Field>
      </div>
      {err && <p className="mt-3 text-sm text-sindoor">{err}</p>}
      <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="a-btn-ghost">Cancel</button><button onClick={submit} className="a-btn">Create booking</button></div>
    </Modal>
  )
}

export default function Reservations() {
  const [sp] = useSearchParams()
  const { bookings } = useScoped()
  const guests = useStore((s) => s.guests)
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [status, setStatus] = useState('all')
  const [source, setSource] = useState('all')
  const [range, setRange] = useState<'upcoming' | 'past' | 'all'>(sp.get('q') ? 'all' : 'upcoming')
  const [open, setOpen] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [page, setPage] = useState(0)
  const gmap = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests])
  const T = todayISO()
  const rows = useMemo(() => {
    const s = q.toLowerCase()
    return bookings
      .filter((b) => (range === 'all' ? true : range === 'upcoming' ? b.checkOut >= T : b.checkOut < T))
      .filter((b) => status === 'all' || b.status === status)
      .filter((b) => source === 'all' || b.source === source)
      .filter((b) => {
        if (!s) return true
        const g = gmap.get(b.guestId)
        return b.ref.toLowerCase().includes(s) || `${g?.firstName} ${g?.lastName} ${g?.email}`.toLowerCase().includes(s) || (b.roomNo ?? '').includes(s)
      })
      .sort((a, b) => (range === 'past' ? b.checkIn.localeCompare(a.checkIn) : b.createdAt.localeCompare(a.createdAt) || a.checkIn.localeCompare(b.checkIn)))
  }, [bookings, q, status, source, range, gmap, T])
  const PER = 25
  const view = rows.slice(page * PER, page * PER + PER)

  return (
    <div>
      <PageHeader title="Reservations" sub={`${rows.length.toLocaleString()} bookings`} actions={
        <>
          <button onClick={() => downloadCSV('reservations.csv', rows.map((b) => ({ ref: b.ref, guest: `${gmap.get(b.guestId)?.firstName} ${gmap.get(b.guestId)?.lastName}`, hotel: hotelById(b.hotelId).name, room: b.roomNo, checkIn: b.checkIn, checkOut: b.checkOut, status: b.status, source: b.source, total: b.total })))} className="a-btn-ghost"><Download size={14} /> Export CSV</button>
          <button onClick={() => setNewOpen(true)} className="a-btn"><Plus size={14} /> New booking</button>
        </>
      } />
      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-kohl/5 p-4 dark:border-white/5">
          <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Ref, guest, room…" className="a-input w-56 pl-8" /></div>
          <select className="a-input w-auto" value={range} onChange={(e) => { setRange(e.target.value as typeof range); setPage(0) }}><option value="upcoming">Current & upcoming</option><option value="past">Past</option><option value="all">All dates</option></select>
          <select className="a-input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}><option value="all">All statuses</option>{['confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show'].map((s) => <option key={s}>{s}</option>)}</select>
          <select className="a-input w-auto" value={source} onChange={(e) => { setSource(e.target.value); setPage(0) }}><option value="all">All channels</option>{['Website', 'Booking.com', 'MakeMyTrip', 'Expedia', 'Agoda', 'Corporate', 'Phone', 'Walk-in'].map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead><tr><th className="a-th">Ref</th><th className="a-th">Guest</th><th className="a-th">Property / Room</th><th className="a-th">Stay</th><th className="a-th">Channel</th><th className="a-th">Status</th><th className="a-th text-right">Total</th></tr></thead>
            <tbody className="dark:text-sand">
              {view.map((b) => {
                const g = gmap.get(b.guestId)
                return (
                  <tr key={b.id} onClick={() => setOpen(b.id)} className="cursor-pointer hover:bg-kohl/[0.02] dark:hover:bg-white/[0.03]">
                    <td className="a-td font-mono text-xs">{b.ref}{b.createdAt === T && <Badge className="ml-2 bg-sindoor text-white">new</Badge>}</td>
                    <td className="a-td"><span className="font-medium dark:text-ivory">{g?.firstName} {g?.lastName}</span><span className="block text-xs text-stone">{g?.tier !== 'Member' && g?.tier}</span></td>
                    <td className="a-td">{hotelById(b.hotelId).name}<span className="block text-xs text-stone">{roomTypeById(b.roomTypeId).name} · {b.roomNo ?? '—'}</span></td>
                    <td className="a-td">{fmtDate(b.checkIn, 'd MMM')} → {fmtDate(b.checkOut, 'd MMM')}<span className="block text-xs text-stone">{nightsBetween(b.checkIn, b.checkOut)} nights</span></td>
                    <td className="a-td text-stone">{b.source}</td>
                    <td className="a-td"><Badge className={statusColor[b.status]}>{b.status}</Badge></td>
                    <td className="a-td text-right font-medium">{inr(b.total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-kohl/5 px-4 py-3 text-sm text-stone dark:border-white/5">
          <span>Showing {rows.length ? page * PER + 1 : 0}–{Math.min(rows.length, page * PER + PER)} of {rows.length}</span>
          <div className="flex gap-2"><button disabled={page === 0} onClick={() => setPage(page - 1)} className="a-btn-ghost py-1">Prev</button><button disabled={(page + 1) * PER >= rows.length} onClick={() => setPage(page + 1)} className="a-btn-ghost py-1">Next</button></div>
        </div>
      </Card>
      <BookingDrawer id={open} onClose={() => setOpen(null)} />
      <NewBooking open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}
