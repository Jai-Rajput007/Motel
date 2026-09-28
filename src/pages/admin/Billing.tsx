import { useMemo, useState } from 'react'
import { hotelById } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { useScoped } from '../../lib/hooks'
import { statusColor } from '../../lib/selectors'
import { addDaysISO, fmtDate, inr, inrC, todayISO } from '../../lib/utils'
import { Badge, Card, PageHeader, Stat, Tabs } from '../../components/admin/ui'
import BookingDrawer from '../../components/admin/BookingDrawer'

export default function Billing() {
  const { bookings } = useScoped()
  const guests = useStore((s) => s.guests)
  const [tab, setTab] = useState<'Open folios' | 'Settled (30 days)'>('Open folios')
  const [open, setOpen] = useState<string | null>(null)
  const T = todayISO()
  const charges = (b: (typeof bookings)[number]) => b.folio.filter((f) => f.type === 'charge').reduce((a, f) => a + f.amount, 0)
  const openF = bookings.filter((b) => b.status === 'checked-in')
  const settled = bookings.filter((b) => b.status === 'checked-out' && b.checkOut >= addDaysISO(T, -30))
  const rows = tab === 'Open folios' ? openF : settled.sort((a, b) => b.checkOut.localeCompare(a.checkOut))
  const outstanding = openF.reduce((a, b) => a + b.total + charges(b) - b.paid, 0)
  const month = useMemo(() => bookings.filter((b) => b.status === 'checked-out' && b.checkOut.slice(0, 7) === T.slice(0, 7)), [bookings, T])
  const gst = month.reduce((a, b) => a + b.tax, 0)
  const collected = month.reduce((a, b) => a + b.paid, 0)
  const g = (id: string) => guests.find((x) => x.id === id)
  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Folios" sub="Guest folios, settlements and GST-compliant invoices" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open folios" value={openF.length} hint="in-house guests" />
        <Stat label="Outstanding" value={inrC(outstanding)} hint="to be settled" tone="sindoor" />
        <Stat label="Collected (month)" value={inrC(collected)} tone="leaf" />
        <Stat label="GST liability (month)" value={inrC(gst)} hint="CGST + SGST" tone="gold" />
      </div>
      <Card title={<Tabs tabs={['Open folios', 'Settled (30 days)'] as const} value={tab} onChange={setTab} />} pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead><tr><th className="a-th">Folio</th><th className="a-th">Guest</th><th className="a-th">Property</th><th className="a-th">Stay</th><th className="a-th">Status</th><th className="a-th text-right">Charges</th><th className="a-th text-right">Paid</th><th className="a-th text-right">Balance</th></tr></thead>
            <tbody className="dark:text-sand">
              {rows.slice(0, 60).map((b) => {
                const total = b.total + charges(b)
                return (
                  <tr key={b.id} onClick={() => setOpen(b.id)} className="cursor-pointer hover:bg-kohl/[0.02] dark:hover:bg-white/[0.03]">
                    <td className="a-td font-mono text-xs">F-{b.ref.slice(2)}</td>
                    <td className="a-td font-medium dark:text-ivory">{g(b.guestId)?.firstName} {g(b.guestId)?.lastName}</td>
                    <td className="a-td">{hotelById(b.hotelId).name} · {b.roomNo}</td>
                    <td className="a-td">{fmtDate(b.checkIn, 'd MMM')} → {fmtDate(b.checkOut, 'd MMM')}</td>
                    <td className="a-td"><Badge className={statusColor[b.status]}>{b.status}</Badge></td>
                    <td className="a-td text-right">{inr(total)}</td>
                    <td className="a-td text-right text-leaf">{inr(b.paid)}</td>
                    <td className="a-td text-right font-semibold">{inr(Math.max(0, total - b.paid))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <BookingDrawer id={open} onClose={() => setOpen(null)} />
    </div>
  )
}
