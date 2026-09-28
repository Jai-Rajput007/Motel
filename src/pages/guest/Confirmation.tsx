import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { CalendarPlus, Check, LayoutDashboard, Mail, Printer } from 'lucide-react'
import { hotelById, roomTypeById } from '../../data/hotels'
import { ADD_ONS, RATE_PLANS } from '../../data/content'
import { useStore } from '../../store/useStore'
import { fmtDate, nightsBetween } from '../../lib/utils'
import { Img, Logo, Money, Ornament } from '../../components/ui/primitives'
import type { Booking, Guest } from '../../types'

function ics(b: Booking, hotelName: string, address: string) {
  const d = (s: string) => s.replace(/-/g, '')
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Virasat//Booking//EN', 'BEGIN:VEVENT', `UID:${b.ref}@virasat`, `DTSTART;VALUE=DATE:${d(b.checkIn)}`, `DTEND;VALUE=DATE:${d(b.checkOut)}`, `SUMMARY:Stay at ${hotelName} (${b.ref})`, `LOCATION:${address}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }))
  a.download = `virasat-${b.ref}.ics`
  a.click()
}

export function EmailPreview({ b, g }: { b: Booking; g: Guest }) {
  const h = hotelById(b.hotelId)
  const rt = roomTypeById(b.roomTypeId)
  return (
    <div className="mx-auto max-w-[600px] bg-white text-left shadow-xl ring-1 ring-kohl/10">
      <div className="border-b border-kohl/10 bg-ivory px-6 py-3 text-xs text-stone">
        <p><b>From:</b> Virasat Reservations &lt;stay@virasat.example&gt;</p>
        <p><b>To:</b> {g.email}</p>
        <p><b>Subject:</b> Your stay at {h.name} is confirmed — {b.ref}</p>
      </div>
      <div className="bg-kohl py-8"><Logo light /></div>
      <Img k={h.hero} w={1200} h={500} className="aspect-[12/5]" />
      <div className="px-8 py-10">
        <p className="font-display text-3xl">Namaste {g.firstName},</p>
        <p className="mt-4 text-[15px] leading-relaxed text-stone">We are delighted to confirm your stay at {h.name}. Our team has begun preparing for your arrival — should you wish us to arrange anything at all, simply reply to this letter.</p>
        <table className="mt-8 w-full text-sm">
          <tbody>
            {[['Confirmation', b.ref], ['Room', rt.name], ['Arrival', fmtDate(b.checkIn, 'EEEE, d MMMM yyyy')], ['Departure', fmtDate(b.checkOut, 'EEEE, d MMMM yyyy')], ['Guests', `${b.adults} adults${b.children ? `, ${b.children} children` : ''}`]].map(([k, v]) => (
              <tr key={k} className="border-b border-kohl/10"><td className="py-2.5 text-stone">{k}</td><td className="py-2.5 text-right font-medium">{v}</td></tr>
            ))}
            <tr><td className="py-3 text-stone">Total</td><td className="py-3 text-right font-display text-2xl"><Money v={b.total} /></td></tr>
          </tbody>
        </table>
        <div className="mt-8 text-center"><span className="btn-primary">Manage your booking</span></div>
        <Ornament className="mt-10" />
        <p className="mt-6 text-center text-xs text-stone">{h.address} · {h.phone}</p>
      </div>
    </div>
  )
}

export default function Confirmation() {
  const { ref } = useParams()
  const { bookings, guests } = useStore()
  const [email, setEmail] = useState(false)
  const b = bookings.find((x) => x.ref === ref)
  if (!b) return <div className="container-lux pb-32 pt-48 text-center"><h1 className="text-4xl">Booking not found</h1><Link to="/manage-booking" className="link-lux mt-6">Find your booking</Link></div>
  const g = guests.find((x) => x.id === b.guestId)!
  const h = hotelById(b.hotelId)
  const rt = roomTypeById(b.roomTypeId)
  const plan = RATE_PLANS.find((p) => p.id === b.ratePlanId)!
  const n = nightsBetween(b.checkIn, b.checkOut)

  return (
    <div className="bg-sand/40 pb-24 pt-[140px]">
      <div className="container-lux max-w-5xl">
        <div className="no-print text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-leaf text-ivory"><Check size={28} /></span>
          <p className="eyebrow mt-6">Reservation confirmed</p>
          <h1 className="mt-3 text-5xl">Thank you, {g.firstName}</h1>
          <p className="mx-auto mt-4 max-w-xl text-stone">A confirmation has been sent to <b className="text-kohl">{g.email}</b>. We look forward to welcoming you to {h.name}.</p>
        </div>

        <div className="mt-12 grid overflow-hidden bg-white shadow-[0_30px_80px_-30px_rgba(28,26,23,0.35)] md:grid-cols-[1fr_280px]">
          <div>
            <Img k={h.hero} w={1200} h={420} className="aspect-[3/1]" />
            <div className="p-8">
              <p className="eyebrow">{h.city}, {h.state}</p>
              <h2 className="mt-2 text-3xl">{h.name}</h2>
              <div className="mt-6 grid grid-cols-2 gap-6 border-y border-kohl/10 py-6 text-sm md:grid-cols-4">
                <div><p className="field-label">Check‑in</p><p className="font-display text-xl">{fmtDate(b.checkIn, 'EEE d MMM')}</p><p className="text-xs text-stone">from 2:00 pm</p></div>
                <div><p className="field-label">Check‑out</p><p className="font-display text-xl">{fmtDate(b.checkOut, 'EEE d MMM')}</p><p className="text-xs text-stone">until 12:00 pm</p></div>
                <div><p className="field-label">Stay</p><p className="font-display text-xl">{n} night{n > 1 && 's'}</p></div>
                <div><p className="field-label">Guests</p><p className="font-display text-xl">{b.adults + b.children}</p></div>
              </div>
              <div className="mt-6 space-y-2 text-sm">
                <p className="flex justify-between"><span className="text-stone">{rt.name} · {plan.name}</span><Money v={b.roomTotal} /></p>
                {b.addOns.map((id) => { const a = ADD_ONS.find((x) => x.id === id)!; return <p key={id} className="flex justify-between"><span className="text-stone">{a.name}</span><span>included</span></p> })}
                {b.discount > 0 && <p className="flex justify-between text-leaf"><span>Promo {b.promo}</span><span>−<Money v={b.discount} /></span></p>}
                <p className="flex justify-between"><span className="text-stone">Taxes (GST)</span><Money v={b.tax} /></p>
                <p className="flex items-baseline justify-between border-t border-kohl/10 pt-3"><span>Total</span><Money v={b.total} className="font-display text-3xl" /></p>
                <p className="text-right text-xs text-stone">{b.paid >= b.total ? 'Paid in full' : 'To be settled at the hotel'}</p>
              </div>
              {b.specialRequests && <p className="mt-6 bg-sand/50 p-4 text-sm text-stone"><b className="text-kohl">Your requests:</b> {b.specialRequests}</p>}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 border-t border-dashed border-kohl/20 bg-ivory p-8 text-center md:border-l md:border-t-0">
            <p className="field-label">Confirmation number</p>
            <p className="font-mono text-2xl tracking-widest">{b.ref}</p>
            <QRCodeSVG value={`VIRASAT:${b.ref}:${b.checkIn}`} size={150} fgColor="#1C1A17" bgColor="transparent" />
            <p className="text-xs text-stone">Show this code at check‑in for express arrival</p>
            <p className="text-xs text-stone">{b.roomNo ? `Room ${b.roomNo} provisionally assigned` : 'Your room will be assigned on arrival'}</p>
          </div>
        </div>

        <div className="no-print mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={() => window.print()} className="btn-outline"><Printer size={14} /> Print voucher</button>
          <button onClick={() => ics(b, h.name, h.address)} className="btn-outline"><CalendarPlus size={14} /> Add to calendar</button>
          <button onClick={() => setEmail(!email)} className="btn-outline"><Mail size={14} /> {email ? 'Hide' : 'Preview'} confirmation email</button>
          <Link to={`/admin/reservations?q=${b.ref}`} className="btn-dark"><LayoutDashboard size={14} /> See it in the Hotel Admin</Link>
        </div>
        {email && <div className="no-print mt-10"><EmailPreview b={b} g={g} /></div>}
      </div>
    </div>
  )
}
