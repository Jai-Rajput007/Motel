import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { useScoped } from '../../lib/hooks'
import { isActive } from '../../lib/selectors'
import { nightlyRate } from '../../lib/pricing'
import { useStore } from '../../store/useStore'
import { HOTELS } from '../../data/hotels'
import { addDaysISO, inr, inrC, todayISO } from '../../lib/utils'
import { Badge, Card, PageHeader, Stat } from '../../components/admin/ui'

const CHANNELS = [
  { name: 'Website', commission: 0, color: '#9E3B2A' },
  { name: 'Booking.com', commission: 18, color: '#1F4E5A' },
  { name: 'MakeMyTrip', commission: 20, color: '#B08D57' },
  { name: 'Expedia', commission: 18, color: '#4F6B3A' },
  { name: 'Agoda', commission: 17, color: '#6B6358' },
  { name: 'Corporate', commission: 0, color: '#2B6676' },
  { name: 'Google Hotel Ads', commission: 12, color: '#C9A978' },
]

export default function Channels() {
  const { bookings } = useScoped()
  const { rateOverrides } = useStore()
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(new Date())
  const [enabled, setEnabled] = useState<Record<string, boolean>>(Object.fromEntries(CHANNELS.map((c) => [c.name, c.name !== 'Google Hotel Ads'])))
  const T = todayISO()
  const stats = useMemo(() => CHANNELS.map((c) => {
    const bs = bookings.filter((b) => isActive(b) && b.source === c.name && b.createdAt >= addDaysISO(T, -30))
    const rev = bs.reduce((a, b) => a + b.total, 0)
    return { ...c, bookings: bs.length, revenue: rev, cost: Math.round((rev * c.commission) / 100) }
  }), [bookings, T])
  const totalCost = stats.reduce((a, s) => a + s.cost, 0)
  const direct = stats.filter((s) => s.commission === 0).reduce((a, s) => a + s.revenue, 0)
  const total = stats.reduce((a, s) => a + s.revenue, 0)
  const rt = HOTELS[0].roomTypes[1]
  const base = nightlyRate(rt.id, new Date(), rateOverrides)

  return (
    <div className="space-y-6">
      <PageHeader title="Channel Manager" sub={`Two-way sync of rates & availability · last sync ${synced.toLocaleTimeString('en-IN')}`} actions={<button onClick={() => { setSyncing(true); setTimeout(() => { setSyncing(false); setSynced(new Date()) }, 1400) }} className="a-btn"><RefreshCw size={14} className={clsx(syncing && 'animate-spin')} /> {syncing ? 'Syncing…' : 'Sync now'}</button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Revenue (30 days)" value={inrC(total)} />
        <Stat label="Direct share" value={`${Math.round((direct / Math.max(1, total)) * 100)}%`} hint="website + corporate" tone="leaf" />
        <Stat label="OTA commission" value={inrC(totalCost)} hint="last 30 days" tone="sindoor" />
        <Stat label="Connected channels" value={Object.values(enabled).filter(Boolean).length} tone="gold" />
      </div>
      <Card title="Connections" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr><th className="a-th">Channel</th><th className="a-th">Status</th><th className="a-th text-right">Commission</th><th className="a-th text-right">Bookings (30d)</th><th className="a-th text-right">Revenue</th><th className="a-th text-right">Cost</th><th className="a-th text-center">Enabled</th></tr></thead>
            <tbody className="dark:text-sand">
              {stats.map((c) => (
                <tr key={c.name}>
                  <td className="a-td"><span className="flex items-center gap-3"><span className="h-3 w-3 rounded-full" style={{ background: c.color }} /><span className="font-medium dark:text-ivory">{c.name}</span></span></td>
                  <td className="a-td">{enabled[c.name] ? <Badge className="bg-leaf/15 text-leaf">● Live{syncing && ' · syncing'}</Badge> : <Badge>Disconnected</Badge>}</td>
                  <td className="a-td text-right">{c.commission}%</td>
                  <td className="a-td text-right">{c.bookings}</td>
                  <td className="a-td text-right">{inr(c.revenue)}</td>
                  <td className="a-td text-right text-sindoor">{c.cost ? inr(c.cost) : '—'}</td>
                  <td className="a-td text-center"><button onClick={() => setEnabled({ ...enabled, [c.name]: !enabled[c.name] })} className={clsx('relative h-5 w-9 rounded-full transition', enabled[c.name] ? 'bg-peacock' : 'bg-kohl/20')} aria-label={`Toggle ${c.name}`}><span className={clsx('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', enabled[c.name] ? 'left-4.5' : 'left-0.5')} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title={`Rate parity check — ${rt.name}, tonight`}>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CHANNELS.filter((c) => c.name !== 'Corporate').map((c, i) => {
            const price = c.name === 'Website' ? Math.round(base * 0.95) : Math.round(base * (1 + (i % 3 === 0 ? 0.02 : 0)))
            const parity = c.name === 'Website' || price === base
            return (
              <div key={c.name} className={clsx('rounded-xl border p-4', c.name === 'Website' ? 'border-leaf/40 bg-leaf/5' : 'border-kohl/10 dark:border-white/10')}>
                <p className="text-xs text-stone">{c.name}</p>
                <p className="mt-1 text-lg font-semibold dark:text-ivory">{inr(price)}</p>
                <p className={clsx('text-[11px]', c.name === 'Website' ? 'text-leaf' : parity ? 'text-stone' : 'text-sindoor')}>{c.name === 'Website' ? 'Best rate — 5% member discount' : parity ? 'In parity' : 'Above parity +2%'}</p>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
