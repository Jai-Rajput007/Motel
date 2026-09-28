import { hotelById, roomTypeById } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { fmtDate, inr, nightsBetween } from '../../lib/utils'
import type { Booking } from '../../types'
import { Logo } from '../ui/primitives'

const GSTIN: Record<string, string> = { jmn: '08AAVCV1911J1Z4', abp: '08AAVCV1911J2Z3', ghv: '09AAVCV1911J1Z2', kvr: '32AAVCV1911J1Z7', cfg: '30AAVCV1911J1Z1', rls: '02AAVCV1911J1Z6' }

export function Invoice({ b }: { b: Booking }) {
  const g = useStore((s) => s.guests.find((x) => x.id === b.guestId))
  const h = hotelById(b.hotelId)
  const rt = roomTypeById(b.roomTypeId)
  const n = nightsBetween(b.checkIn, b.checkOut)
  const extras = b.folio.filter((f) => f.type === 'charge')
  const extraTax = Math.round(extras.reduce((a, f) => a + f.amount, 0) * 0.18 / 1.18)
  const taxable = b.roomTotal - b.discount + b.addOnTotal
  const totalTax = b.tax + extraTax
  const grand = b.total + extras.reduce((a, f) => a + f.amount, 0)
  return (
    <div className="bg-white p-8 text-[13px] text-kohl shadow-sm ring-1 ring-kohl/10">
      <div className="flex items-start justify-between border-b border-kohl/10 pb-6">
        <Logo className="items-start" />
        <div className="text-right">
          <p className="text-lg font-semibold">TAX INVOICE</p>
          <p>No. INV/{b.hotelId.toUpperCase()}/{b.ref.slice(2)}</p>
          <p>Date: {fmtDate(b.checkOut)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 border-b border-kohl/10 py-5">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-stone">Supplier</p>
          <p className="font-semibold">{h.name} (Virasat Hotels Pvt. Ltd.)</p>
          <p>{h.address}</p>
          <p>GSTIN: {GSTIN[h.id]}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-stone">Bill to</p>
          <p className="font-semibold">{g ? `${g.firstName} ${g.lastName}` : 'Guest'}{g?.company ? ` — ${g.company}` : ''}</p>
          <p>{g?.email}</p>
          <p>Booking {b.ref} · Room {b.roomNo ?? '—'}</p>
          <p>{fmtDate(b.checkIn)} to {fmtDate(b.checkOut)} ({n} nights)</p>
        </div>
      </div>
      <table className="mt-4 w-full">
        <thead><tr className="border-b border-kohl/20 text-left text-[11px] uppercase tracking-wider text-stone"><th className="py-2">Description</th><th>SAC</th><th className="text-right">Amount</th></tr></thead>
        <tbody>
          <tr className="border-b border-kohl/5"><td className="py-2">{rt.name} accommodation × {n} nights</td><td>996311</td><td className="text-right">{inr(b.roomTotal)}</td></tr>
          {b.discount > 0 && <tr className="border-b border-kohl/5"><td className="py-2">Discount ({b.promo})</td><td /><td className="text-right">−{inr(b.discount)}</td></tr>}
          {b.addOnTotal > 0 && <tr className="border-b border-kohl/5"><td className="py-2">Packages & add-ons</td><td>996334</td><td className="text-right">{inr(b.addOnTotal)}</td></tr>}
          {extras.map((f) => <tr key={f.id} className="border-b border-kohl/5"><td className="py-2">{f.description} ({fmtDate(f.date, 'd MMM')}) — incl. GST</td><td>996332</td><td className="text-right">{inr(f.amount)}</td></tr>)}
        </tbody>
      </table>
      <div className="ml-auto mt-4 w-72 space-y-1">
        <p className="flex justify-between"><span>Taxable value</span><span>{inr(taxable)}</span></p>
        <p className="flex justify-between"><span>CGST</span><span>{inr(Math.round(totalTax / 2))}</span></p>
        <p className="flex justify-between"><span>SGST</span><span>{inr(totalTax - Math.round(totalTax / 2))}</span></p>
        <p className="flex justify-between border-t border-kohl/20 pt-2 text-base font-semibold"><span>Grand total</span><span>{inr(grand)}</span></p>
        <p className="flex justify-between text-leaf"><span>Paid</span><span>{inr(b.paid)}</span></p>
      </div>
      <p className="mt-8 text-[11px] text-stone">Accommodation above ₹7,500 per night attracts GST at 18%. This is a computer-generated invoice and does not require a signature.</p>
    </div>
  )
}
