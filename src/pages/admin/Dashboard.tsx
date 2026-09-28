import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ArrowRight, BedDouble, CalendarCheck, IndianRupee, LogIn, LogOut, Package, TrendingUp, Users, Wrench } from 'lucide-react'
import { HOTELS, hotelById, roomTypeById } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { useScoped } from '../../lib/hooks'
import { dayStats, isActive, series, statusColor } from '../../lib/selectors'
import { addDaysISO, fmtDate, inrC, todayISO } from '../../lib/utils'
import { Avatar, Badge, Card, PageHeader, Progress, Stat, chartColors } from '../../components/admin/ui'

export function ChartTip({ active, payload, label, money }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-kohl/10 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-[#1f1d1a] dark:text-sand">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => <p key={p.name} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}: <b>{money ? inrC(p.value) : p.value}</b></p>)}
    </div>
  )
}

export default function Dashboard() {
  const { bookings, rooms, inventory, tickets, reviews, property } = useScoped()
  const { guests, audit, role } = useStore()
  const T = todayISO()
  const today = dayStats(bookings, rooms, T)
  const lastWeek = dayStats(bookings, rooms, addDaysISO(T, -7))
  const trend = useMemo(() => series(bookings, rooms, -21, 21), [bookings, rooms])
  const arrivals = bookings.filter((b) => b.checkIn === T && b.status !== 'cancelled')
  const departures = bookings.filter((b) => b.checkOut === T && isActive(b))
  const inHouse = bookings.filter((b) => b.status === 'checked-in')
  const monthRev = bookings.filter((b) => isActive(b) && b.checkIn.slice(0, 7) === T.slice(0, 7)).reduce((a, b) => a + b.total, 0)
  const sources = useMemo(() => {
    const m = new Map<string, number>()
    bookings.filter((b) => isActive(b) && b.createdAt >= addDaysISO(T, -60)).forEach((b) => m.set(b.source, (m.get(b.source) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  }, [bookings, T])
  const byHotel = HOTELS.filter((h) => property === 'all' || h.id === property).map((h) => {
    const s = dayStats(bookings.filter((b) => b.hotelId === h.id), rooms.filter((r) => r.hotelId === h.id), T)
    return { name: h.city, occ: Math.round(s.occ * 100), revenue: Math.round(s.revenue) }
  })
  const hk = { clean: rooms.filter((r) => r.hk === 'clean').length, dirty: rooms.filter((r) => r.hk === 'dirty').length, inspected: rooms.filter((r) => r.hk === 'inspected').length, ooo: rooms.filter((r) => r.hk === 'out-of-order').length }
  const lowStock = inventory.filter((i) => i.stock <= i.reorder)
  const urgent = tickets.filter((t) => t.status !== 'Resolved' && (t.priority === 'Urgent' || t.priority === 'High'))
  const nps = reviews.length ? Math.round(((reviews.filter((r) => r.nps >= 9).length - reviews.filter((r) => r.nps <= 6).length) / reviews.length) * 100) : 0
  const gName = (id: string) => { const g = guests.find((x) => x.id === id); return g ? `${g.firstName} ${g.lastName}` : '—' }
  const hour = new Date().getHours()

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'} — here’s ${property === 'all' ? 'the group' : hotelById(property).name} today`}
        sub={`${fmtDate(T, 'EEEE, d MMMM yyyy')} · Signed in as ${role}`}
        actions={<><Link to="/admin/front-desk" className="a-btn-ghost">Front desk</Link><Link to="/admin/reports" className="a-btn">Reports <ArrowRight size={14} /></Link></>}
      />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Occupancy" value={`${(today.occ * 100).toFixed(1)}%`} delta={(today.occ - lastWeek.occ) * 100} hint="vs last week" icon={<BedDouble size={16} />} />
        <Stat label="ADR" value={inrC(today.adr)} delta={lastWeek.adr ? ((today.adr - lastWeek.adr) / lastWeek.adr) * 100 : 0} hint="avg daily rate" icon={<IndianRupee size={16} />} tone="gold" />
        <Stat label="RevPAR" value={inrC(today.revpar)} delta={lastWeek.revpar ? ((today.revpar - lastWeek.revpar) / lastWeek.revpar) * 100 : 0} hint="per available room" icon={<TrendingUp size={16} />} tone="leaf" />
        <Stat label="Revenue (month)" value={inrC(monthRev)} hint={`${today.sold} rooms sold tonight`} icon={<CalendarCheck size={16} />} tone="sindoor" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Occupancy & revenue — last 3 weeks and forecast" className="xl:col-span-2" actions={<span className="text-xs text-stone">Today marked</span>}>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ left: -10, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gOcc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1F4E5A" stopOpacity={0.35} /><stop offset="100%" stopColor="#1F4E5A" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#B08D57" stopOpacity={0.35} /><stop offset="100%" stopColor="#B08D57" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-kohl/10 dark:text-white/10" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B6358' }} interval={3} axisLine={false} tickLine={false} />
                <YAxis yAxisId="o" tick={{ fontSize: 11, fill: '#6B6358' }} unit="%" axisLine={false} tickLine={false} domain={[0, 100]} />
                <YAxis yAxisId="r" orientation="right" hide />
                <Tooltip content={<ChartTip />} />
                <Area yAxisId="r" type="monotone" dataKey="revenue" name="Room revenue ₹" stroke="#B08D57" fill="url(#gRev)" strokeWidth={2} />
                <Area yAxisId="o" type="monotone" dataKey="occ" name="Occupancy %" stroke="#1F4E5A" fill="url(#gOcc)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Booking channels (60 days)">
          <div className="h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={sources} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                  {sources.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs dark:text-sand">
            {sources.map((s, i) => <li key={s.name} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: chartColors[i % chartColors.length] }} />{s.name}<span className="ml-auto text-stone">{Math.round((s.value / sources.reduce((a, x) => a + x.value, 0)) * 100)}%</span></li>)}
          </ul>
          <p className="mt-4 rounded-lg bg-leaf/10 p-3 text-xs text-leaf dark:text-[#bcd6a6]">Direct website bookings save ~18% in OTA commission.</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title={`Arrivals today (${arrivals.length})`} pad={false} actions={<Link to="/admin/front-desk" className="text-xs text-peacock">Open front desk →</Link>}>
          <ul className="max-h-80 divide-y divide-kohl/5 overflow-y-auto dark:divide-white/5">
            {arrivals.slice(0, 12).map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={gName(b.guestId)} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium dark:text-ivory">{gName(b.guestId)}</p>
                  <p className="truncate text-xs text-stone">{roomTypeById(b.roomTypeId).name} · Rm {b.roomNo ?? '—'}{property === 'all' && ` · ${hotelById(b.hotelId).city}`}</p>
                </div>
                <Badge className={statusColor[b.status]}>{b.status}</Badge>
              </li>
            ))}
            {!arrivals.length && <li className="p-5 text-sm text-stone">No arrivals today.</li>}
          </ul>
        </Card>
        <Card title="Today at a glance">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[[LogIn, 'Arrivals', arrivals.length], [LogOut, 'Departures', departures.length], [Users, 'In-house', inHouse.length]].map(([I, l, v]) => {
              const Icon = I as typeof LogIn
              return <div key={l as string} className="rounded-xl bg-kohl/[0.03] p-3 dark:bg-white/5"><Icon size={16} className="mx-auto text-peacock dark:text-[#9fd0dc]" /><p className="mt-1 text-xl font-semibold dark:text-ivory">{v as number}</p><p className="text-[11px] text-stone">{l as string}</p></div>
            })}
          </div>
          <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-wider text-stone">Room status</p>
          {[['Clean', hk.clean, 'bg-peacock'], ['Inspected', hk.inspected, 'bg-leaf'], ['Dirty', hk.dirty, 'bg-sindoor'], ['Out of order', hk.ooo, 'bg-stone']].map(([l, v, c]) => (
            <div key={l as string} className="mb-2">
              <div className="mb-1 flex justify-between text-xs dark:text-sand"><span>{l}</span><span className="text-stone">{v}</span></div>
              <Progress value={((v as number) / Math.max(1, rooms.length)) * 100} tone={c as string} />
            </div>
          ))}
          <div className="mt-5 flex items-center justify-between rounded-xl bg-gold/10 p-3">
            <span className="text-xs text-[#8a6a36] dark:text-gold-2">Net Promoter Score</span>
            <span className="text-xl font-semibold text-[#8a6a36] dark:text-gold-2">{nps > 0 ? '+' : ''}{nps}</span>
          </div>
        </Card>
        <Card title="Needs attention" pad={false}>
          <ul className="divide-y divide-kohl/5 text-sm dark:divide-white/5 dark:text-sand">
            {lowStock.slice(0, 4).map((i) => (
              <li key={i.id} className="flex items-start gap-3 px-5 py-3"><Package size={15} className="mt-0.5 text-sindoor" /><span className="flex-1"><b className="font-medium">{i.name}</b> low at {hotelById(i.hotelId).city}<span className="block text-xs text-stone">{i.stock} {i.unit} left · reorder at {i.reorder}</span></span><Link to="/admin/inventory" className="text-xs text-peacock">Order</Link></li>
            ))}
            {urgent.slice(0, 3).map((t) => (
              <li key={t.id} className="flex items-start gap-3 px-5 py-3"><Wrench size={15} className="mt-0.5 text-gold" /><span className="flex-1"><b className="font-medium">{t.title}</b> · Rm {t.roomNo}<span className="block text-xs text-stone">{hotelById(t.hotelId).city} · {t.priority} · {t.assignee}</span></span><Link to="/admin/maintenance" className="text-xs text-peacock">View</Link></li>
            ))}
            {hk.dirty > 0 && <li className="flex items-start gap-3 px-5 py-3"><AlertTriangle size={15} className="mt-0.5 text-sindoor" /><span className="flex-1"><b className="font-medium">{hk.dirty} rooms</b> awaiting cleaning before arrivals</span><Link to="/admin/housekeeping" className="text-xs text-peacock">Assign</Link></li>}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Tonight by property" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byHotel} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-kohl/10 dark:text-white/10" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B6358' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B6358' }} unit="%" axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(176,141,87,0.08)' }} />
                <Bar dataKey="occ" name="Occupancy %" radius={[6, 6, 0, 0]} fill="#1F4E5A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Recent activity" pad={false}>
          <ul className="max-h-64 divide-y divide-kohl/5 overflow-y-auto text-sm dark:divide-white/5 dark:text-sand">
            {audit.slice(0, 10).map((a) => (
              <li key={a.id} className="px-5 py-2.5"><p><b className="font-medium">{a.action}</b> — {a.detail}</p><p className="text-xs text-stone">{a.user} · {new Date(a.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
