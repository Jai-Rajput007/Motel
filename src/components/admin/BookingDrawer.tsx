import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, CalendarDays, CreditCard, LogIn, LogOut, Mail, Phone, Plus, Printer, XCircle } from 'lucide-react'
import { hotelById, roomTypeById } from '../../data/hotels'
import { ADD_ONS, RATE_PLANS } from '../../data/content'
import { useStore } from '../../store/useStore'
import { statusColor } from '../../lib/selectors'
import { fmtDate, inr, nightsBetween, overlaps, todayISO } from '../../lib/utils'
import { Avatar, Badge, Drawer, Field } from './ui'
import type { Booking } from '../../types'
import { Invoice } from './Invoice'

export default function BookingDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { bookings, guests, rooms, checkIn, checkOut, cancelBooking, markNoShow, addFolio } = useStore()
  const b = bookings.find((x) => x.id === id)
  const [room, setRoom] = useState('')
  const [charge, setCharge] = useState({ description: 'In-room dining', amount: 2400 })
  const [invoice, setInvoice] = useState(false)
  if (!b) return <Drawer open={false} onClose={onClose} title=""><></></Drawer>
  const g = guests.find((x) => x.id === b.guestId)
  const h = hotelById(b.hotelId)
  const rt = roomTypeById(b.roomTypeId)
  const plan = RATE_PLANS.find((p) => p.id === b.ratePlanId)
  const charges = b.folio.filter((f) => f.type === 'charge').reduce((a, f) => a + f.amount, 0)
  const balance = b.total + charges - b.paid
  const free = rooms.filter((r) => r.hotelId === b.hotelId && r.roomTypeId === b.roomTypeId && r.hk !== 'out-of-order' && !bookings.some((x) => x.id !== b.id && x.hotelId === b.hotelId && x.roomNo === r.number && x.status !== 'cancelled' && x.status !== 'no-show' && overlaps(x.checkIn, x.checkOut, b.checkIn, b.checkOut)))
  const assigned = rooms.find((r) => r.hotelId === b.hotelId && r.number === b.roomNo)

  return (
    <Drawer open={!!id} onClose={() => { setInvoice(false); onClose() }} title={<span className="flex items-center gap-3">{b.ref} <Badge className={statusColor[b.status]}>{b.status}</Badge></span>}>
      {invoice ? (
        <div>
          <div className="no-print mb-4 flex gap-2"><button onClick={() => setInvoice(false)} className="a-btn-ghost">← Back</button><button onClick={() => window.print()} className="a-btn"><Printer size={14} /> Print</button></div>
          <Invoice b={b} />
        </div>
      ) : (
        <div className="space-y-6">
          {g && (
            <div className="flex items-start gap-4 rounded-xl bg-kohl/[0.03] p-4 dark:bg-white/5">
              <Avatar name={`${g.firstName} ${g.lastName}`} size={44} />
              <div className="flex-1 text-sm">
                <p className="text-base font-semibold dark:text-ivory">{g.firstName} {g.lastName} <Badge className="ml-1 bg-gold/15 text-[#8a6a36] dark:text-gold-2">{g.tier}</Badge></p>
                <p className="mt-1 flex items-center gap-2 text-stone"><Mail size={13} /> {g.email}</p>
                <p className="flex items-center gap-2 text-stone"><Phone size={13} /> {g.phone}</p>
                {g.preferences.length > 0 && <p className="mt-2 text-xs"><b>Preferences:</b> {g.preferences.join(', ')}</p>}
                <Link to={`/admin/crm/guests?id=${g.id}`} className="mt-2 inline-block text-xs text-peacock">Open guest profile →</Link>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-stone">Property</p><p className="font-medium dark:text-ivory">{h.name}</p></div>
            <div><p className="text-xs text-stone">Room type</p><p className="font-medium dark:text-ivory">{rt.name}</p></div>
            <div><p className="flex items-center gap-1 text-xs text-stone"><CalendarDays size={12} /> Stay</p><p className="font-medium dark:text-ivory">{fmtDate(b.checkIn, 'd MMM')} → {fmtDate(b.checkOut, 'd MMM yyyy')} · {nightsBetween(b.checkIn, b.checkOut)}n</p></div>
            <div><p className="flex items-center gap-1 text-xs text-stone"><BedDouble size={12} /> Room</p><p className="font-medium dark:text-ivory">{b.roomNo ?? 'Unassigned'} {assigned && <span className="text-xs text-stone">({assigned.hk})</span>}</p></div>
            <div><p className="text-xs text-stone">Guests</p><p className="font-medium dark:text-ivory">{b.adults} adults{b.children ? `, ${b.children} children` : ''}</p></div>
            <div><p className="text-xs text-stone">Rate plan · Source</p><p className="font-medium dark:text-ivory">{plan?.name} · {b.source}</p></div>
          </div>
          {b.addOns.length > 0 && <p className="text-sm"><b>Add-ons:</b> {b.addOns.map((a) => ADD_ONS.find((x) => x.id === a)?.name).join(', ')}</p>}
          {b.specialRequests && <p className="rounded-lg border-l-2 border-gold bg-gold/10 p-3 text-sm">{b.specialRequests}</p>}

          {b.status === 'confirmed' && (
            <div className="rounded-xl border border-kohl/10 p-4 dark:border-white/10">
              <p className="mb-3 text-sm font-semibold dark:text-ivory">Check-in</p>
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Assign room">
                  <select className="a-input w-40" value={room || b.roomNo || ''} onChange={(e) => setRoom(e.target.value)}>
                    {b.roomNo && <option value={b.roomNo}>{b.roomNo} (assigned)</option>}
                    {free.filter((r) => r.number !== b.roomNo).map((r) => <option key={r.id} value={r.number}>{r.number} · {r.hk}</option>)}
                  </select>
                </Field>
                <button disabled={b.checkIn > todayISO()} onClick={() => checkIn(b.id, room || b.roomNo || undefined)} className="a-btn"><LogIn size={14} /> Check in</button>
                <button onClick={() => markNoShow(b.id)} className="a-btn-ghost">No-show</button>
                <button onClick={() => { if (confirm('Cancel this booking?')) cancelBooking(b.id) }} className="a-btn-ghost text-sindoor"><XCircle size={14} /> Cancel</button>
              </div>
              {b.checkIn > todayISO() && <p className="mt-2 text-xs text-stone">Check-in opens on the arrival date.</p>}
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold dark:text-ivory">Folio</p>
              <button onClick={() => setInvoice(true)} className="text-xs text-peacock">View GST invoice →</button>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-kohl/5 dark:border-white/5"><td className="py-2">Room charges · {nightsBetween(b.checkIn, b.checkOut)} nights</td><td className="py-2 text-right">{inr(b.roomTotal - b.discount)}</td></tr>
                {b.addOnTotal > 0 && <tr className="border-b border-kohl/5 dark:border-white/5"><td className="py-2">Packages & add-ons</td><td className="py-2 text-right">{inr(b.addOnTotal)}</td></tr>}
                <tr className="border-b border-kohl/5 dark:border-white/5"><td className="py-2">GST</td><td className="py-2 text-right">{inr(b.tax)}</td></tr>
                {b.folio.map((f) => (
                  <tr key={f.id} className="border-b border-kohl/5 dark:border-white/5"><td className="py-2">{f.description} <span className="text-xs text-stone">{fmtDate(f.date, 'd MMM')}</span></td><td className={`py-2 text-right ${f.type === 'payment' ? 'text-leaf' : ''}`}>{f.type === 'payment' ? '−' : ''}{inr(f.amount)}</td></tr>
                ))}
                <tr><td className="pt-3 font-semibold">Balance due</td><td className={`pt-3 text-right text-lg font-semibold ${balance > 0 ? 'text-sindoor' : 'text-leaf'}`}>{inr(Math.max(0, balance))}</td></tr>
              </tbody>
            </table>
            {b.status === 'checked-in' && (
              <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl bg-kohl/[0.03] p-3 dark:bg-white/5">
                <Field label="Post charge"><select className="a-input w-44" value={charge.description} onChange={(e) => setCharge({ ...charge, description: e.target.value })}>{['In-room dining', 'Minibar', 'Laundry', 'Spa — Abhyanga', 'Bar', 'Airport transfer', 'Experience'].map((c) => <option key={c}>{c}</option>)}</select></Field>
                <Field label="Amount ₹"><input type="number" className="a-input w-28" value={charge.amount} onChange={(e) => setCharge({ ...charge, amount: Number(e.target.value) })} /></Field>
                <button onClick={() => addFolio(b.id, { date: todayISO(), description: charge.description, amount: charge.amount, type: 'charge' })} className="a-btn-ghost"><Plus size={14} /> Post</button>
                <button onClick={() => addFolio(b.id, { date: todayISO(), description: 'Payment — card', amount: Math.max(0, balance), type: 'payment' })} disabled={balance <= 0} className="a-btn-ghost"><CreditCard size={14} /> Take payment</button>
              </div>
            )}
          </div>

          {b.status === 'checked-in' && <button onClick={() => checkOut(b.id)} className="a-btn w-full"><LogOut size={14} /> Settle {balance > 0 ? inr(balance) : ''} & check out</button>}
        </div>
      )}
    </Drawer>
  )
}

export type { Booking }
