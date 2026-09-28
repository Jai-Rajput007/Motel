import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { Download, Printer } from 'lucide-react'
import { HOTELS } from '../../data/hotels'
import { useScoped } from '../../lib/hooks'
import { useStore } from '../../store/useStore'
import { isActive, series } from '../../lib/selectors'
import { addDaysISO, downloadCSV, inr, inrC, nightsBetween, todayISO } from '../../lib/utils'
import { Card, PageHeader, Stat, Tabs, chartColors } from '../../components/admin/ui'
import { ChartTip } from './Dashboard'

export default function Reports() {
  const { bookings, rooms, property } = useScoped()
  const guests = useStore((s) => s.guests)
  const [days, setDays] = useState<'7' | '14' | '30'>('30')
  const [tab, setTab] = useState<'Revenue' | 'Occupancy' | 'Channels' | 'Guests'>('Revenue')
  const n = Number(days)
  const T = todayISO()
  const from = addDaysISO(T, -n)
  const data = useMemo(() => series(bookings, rooms, -n, 0), [bookings, rooms, n])
  const inRange = bookings.filter((b) => isActive(b) && b.checkIn >= from && b.checkIn <= T)
  const revenue = inRange.reduce((a, b) => a + b.total, 0)
  const roomNights = inRange.reduce((a, b) => a + nightsBetween(b.checkIn, b.checkOut), 0)
  const avgOcc = data.reduce((a, d) => a + d.occ, 0) / Math.max(1, data.length)
  const cancel = bookings.filter((b) => b.status === 'cancelled' && b.checkIn >= from && b.checkIn <= T).length
  const byHotel = HOTELS.filter((h) => property === 'all' || h.id === property).map((h) => ({ name: h.city, revenue: inRange.filter((b) => b.hotelId === h.id).reduce((a, b) => a + b.total, 0), nights: inRange.filter((b) => b.hotelId === h.id).reduce((a, b) => a + nightsBetween(b.checkIn, b.checkOut), 0) }))
  const bySource = Object.entries(inRange.reduce<Record<string, number>>((m, b) => ((m[b.source] = (m[b.source] ?? 0) + b.total), m), {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  const gmap = new Map(guests.map((g) => [g.id, g]))
  const byCountry = Object.entries(inRange.reduce<Record<string, number>>((m, b) => { const c = gmap.get(b.guestId)?.country ?? '—'; m[c] = (m[c] ?? 0) + 1; return m }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)
  const lead = Math.round(inRange.reduce((a, b) => a + Math.max(0, nightsBetween(b.createdAt, b.checkIn)), 0) / Math.max(1, inRange.length))
  const los = (roomNights / Math.max(1, inRange.length)).toFixed(1)

  const exportCSV = () => downloadCSV(`virasat-${tab.toLowerCase()}-${days}d.csv`, tab === 'Revenue' || tab === 'Occupancy' ? data.map((d) => ({ date: d.date, occupancy_pct: d.occ, adr: d.adr, revpar: d.revpar, room_revenue: d.revenue, rooms_sold: d.sold })) : tab === 'Channels' ? bySource.map((s) => ({ channel: s.name, revenue: s.value })) : byCountry.map((s) => ({ country: s.name, bookings: s.value })))

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" sub="Performance across revenue, occupancy, channels and guest mix" actions={
        <>
          <select className="a-input w-auto" value={days} onChange={(e) => setDays(e.target.value as typeof days)}><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option></select>
          <button onClick={exportCSV} className="a-btn-ghost"><Download size={14} /> CSV</button>
          <button onClick={() => window.print()} className="a-btn-ghost"><Printer size={14} /> PDF</button>
        </>
      } />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Total revenue" value={inrC(revenue)} />
        <Stat label="Room nights" value={roomNights.toLocaleString()} tone="gold" />
        <Stat label="Avg. occupancy" value={`${avgOcc.toFixed(1)}%`} tone="leaf" />
        <Stat label="Avg. length of stay" value={`${los} n`} hint={`lead time ${lead} days`} />
        <Stat label="Cancellations" value={cancel} tone="sindoor" />
      </div>
      <Tabs tabs={['Revenue', 'Occupancy', 'Channels', 'Guests'] as const} value={tab} onChange={setTab} />
      {tab === 'Revenue' && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card title="Daily room revenue, ADR & RevPAR" className="xl:col-span-2">
            <div className="h-80"><ResponsiveContainer><LineChart data={data} margin={{ left: 0, right: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-kohl/10 dark:text-white/10" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B6358' }} interval={4} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#6B6358' }} tickFormatter={(v) => inrC(v)} axisLine={false} tickLine={false} width={70} /><Tooltip content={<ChartTip money />} /><Legend wrapperStyle={{ fontSize: 12 }} /><Line dataKey="revenue" name="Room revenue" stroke="#1F4E5A" strokeWidth={2} dot={false} /><Line dataKey="adr" name="ADR" stroke="#B08D57" strokeWidth={2} dot={false} /><Line dataKey="revpar" name="RevPAR" stroke="#9E3B2A" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
          </Card>
          <Card title="Revenue by property">
            <div className="h-80"><ResponsiveContainer><BarChart data={byHotel} layout="vertical" margin={{ left: 10 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#6B6358' }} width={80} axisLine={false} tickLine={false} /><Tooltip content={<ChartTip money />} cursor={{ fill: 'rgba(176,141,87,0.08)' }} /><Bar dataKey="revenue" name="Revenue" fill="#B08D57" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
          </Card>
        </div>
      )}
      {tab === 'Occupancy' && (
        <Card title="Occupancy % and rooms sold">
          <div className="h-96"><ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-kohl/10 dark:text-white/10" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B6358' }} interval={3} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#6B6358' }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(176,141,87,0.08)' }} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="occ" name="Occupancy %" fill="#1F4E5A" radius={[4, 4, 0, 0]} /><Bar dataKey="sold" name="Rooms sold" fill="#C9A978" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
      )}
      {tab === 'Channels' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Revenue by channel"><div className="h-80"><ResponsiveContainer><PieChart><Pie data={bySource} dataKey="value" nameKey="name" innerRadius={70} outerRadius={120} paddingAngle={2} stroke="none">{bySource.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}</Pie><Tooltip content={<ChartTip money />} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer></div></Card>
          <Card title="Channel table" pad={false}><table className="w-full"><tbody className="dark:text-sand">{bySource.map((s) => <tr key={s.name}><td className="a-td">{s.name}</td><td className="a-td text-right">{inr(s.value)}</td><td className="a-td text-right text-stone">{Math.round((s.value / Math.max(1, revenue)) * 100)}%</td></tr>)}</tbody></table></Card>
        </div>
      )}
      {tab === 'Guests' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Source markets (bookings)"><div className="h-80"><ResponsiveContainer><BarChart data={byCountry} layout="vertical" margin={{ left: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#6B6358' }} width={110} axisLine={false} tickLine={false} /><Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(176,141,87,0.08)' }} /><Bar dataKey="value" name="Bookings" fill="#1F4E5A" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div></Card>
          <Card title="Room nights by property"><div className="h-80"><ResponsiveContainer><PieChart><Pie data={byHotel} dataKey="nights" nameKey="name" outerRadius={120} stroke="none">{byHotel.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}</Pie><Tooltip content={<ChartTip />} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer></div></Card>
        </div>
      )}
    </div>
  )
}
