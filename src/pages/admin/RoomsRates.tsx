import { useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { Ban, Save } from 'lucide-react'
import clsx from 'clsx'
import { HOTELS, hotelById } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { availability, nightlyRate, season } from '../../lib/pricing'
import { addDaysISO, iso, inr, todayISO } from '../../lib/utils'
import { Card, PageHeader } from '../../components/admin/ui'

export default function RoomsRates() {
  const { property, rateOverrides, setRateOverride, bookings, rooms, stopSell, toggleStopSell } = useStore()
  const [local, setLocal] = useState(property === 'all' ? HOTELS[0].id : property)
  const hotel = hotelById(property === 'all' ? local : property)
  const [edit, setEdit] = useState<Record<string, number>>({})
  const [start, setStart] = useState(todayISO())
  const days = Array.from({ length: 14 }, (_, i) => iso(addDays(parseISO(start), i)))

  return (
    <div className="space-y-6">
      <PageHeader title="Rooms & Rates" sub={`${hotel.name} · base rates, seasonal pricing and inventory controls`} actions={property === 'all' && <select className="a-input w-auto" value={local} onChange={(e) => setLocal(e.target.value)}>{HOTELS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>} />
      <Card title="Room types & base rates" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead><tr><th className="a-th">Room type</th><th className="a-th">Category</th><th className="a-th">Inventory</th><th className="a-th">Size</th><th className="a-th">Max</th><th className="a-th">Base rate (₹)</th><th className="a-th" /></tr></thead>
            <tbody className="dark:text-sand">
              {hotel.roomTypes.map((rt) => {
                const cur = rateOverrides[rt.id] ?? rt.baseRate
                const v = edit[rt.id] ?? cur
                return (
                  <tr key={rt.id}>
                    <td className="a-td font-medium dark:text-ivory">{rt.name}</td>
                    <td className="a-td">{rt.category}</td>
                    <td className="a-td">{rooms.filter((r) => r.roomTypeId === rt.id).length} rooms</td>
                    <td className="a-td">{rt.size} m²</td>
                    <td className="a-td">{rt.maxGuests}</td>
                    <td className="a-td"><input type="number" step={500} className="a-input w-32" value={v} onChange={(e) => setEdit({ ...edit, [rt.id]: Number(e.target.value) })} /></td>
                    <td className="a-td text-right">{v !== cur && <button onClick={() => { setRateOverride(rt.id, v); setEdit({ ...edit, [rt.id]: undefined as unknown as number }) }} className="a-btn py-1.5 text-xs"><Save size={13} /> Save</button>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-kohl/5 px-5 py-3 text-xs text-stone dark:border-white/5">Changes flow instantly to the booking engine on the website. Seasonal multipliers: Festive ×1.45 · Diwali ×1.35 · Peak ×1.2 · Monsoon ×0.82 · Weekends +12%.</p>
      </Card>

      <Card title="Rate & availability calendar" actions={<div className="flex gap-1"><button onClick={() => setStart(addDaysISO(start, -14))} disabled={start <= todayISO()} className="a-btn-ghost py-1 text-xs">← Prev</button><button onClick={() => setStart(addDaysISO(start, 14))} className="a-btn-ghost py-1 text-xs">Next →</button></div>} pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-center text-xs">
            <thead>
              <tr>
                <th className="a-th w-44">Room type</th>
                {days.map((d) => { const s = season(parseISO(d), hotel.id); return <th key={d} className="px-1 py-2 font-normal"><p className="font-medium dark:text-ivory">{format(parseISO(d), 'EEE d')}</p><p className={clsx('text-[10px]', s.factor > 1.2 ? 'text-sindoor' : s.factor < 1 ? 'text-peacock' : 'text-stone')}>{s.label}</p></th> })}
              </tr>
            </thead>
            <tbody className="dark:text-sand">
              {hotel.roomTypes.map((rt) => (
                <tr key={rt.id} className="border-t border-kohl/5 dark:border-white/5">
                  <td className="px-4 py-2 text-left text-sm font-medium dark:text-ivory">{rt.name}</td>
                  {days.map((d) => {
                    const key = `${rt.id}|${d}`
                    const stopped = stopSell.includes(key)
                    const a = availability(rt.id, d, addDaysISO(d, 1), bookings, rooms)
                    return (
                      <td key={d} className="p-1">
                        <button onClick={() => toggleStopSell(key)} title="Toggle stop-sell" className={clsx('w-full rounded-md px-1 py-1.5 transition', stopped ? 'bg-kohl text-ivory' : a === 0 ? 'bg-sindoor/10 text-sindoor' : a <= 2 ? 'bg-gold/15' : 'bg-leaf/10 hover:bg-leaf/20')}>
                          <p className="font-medium">{stopped ? <Ban size={12} className="mx-auto" /> : inr(nightlyRate(rt.id, parseISO(d), rateOverrides)).replace('₹', '')}</p>
                          <p className="text-[10px] opacity-70">{stopped ? 'closed' : `${a} left`}</p>
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-kohl/5 px-5 py-3 text-xs text-stone dark:border-white/5">Click any cell to toggle stop-sell — the date immediately shows as unavailable on the website.</p>
      </Card>
    </div>
  )
}
