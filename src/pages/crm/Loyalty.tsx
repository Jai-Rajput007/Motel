import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../../store/useStore'
import { guestStats } from '../../lib/selectors'
import { LOYALTY_TIERS } from '../../data/content'
import { Avatar, Badge, Card, Field, Modal, PageHeader, Stat } from '../../components/admin/ui'
import { ChartTip } from '../admin/Dashboard'
import { tierColor } from './Guests'
import type { Guest } from '../../types'

const TIERS: Guest['tier'][] = ['Member', 'Silver', 'Gold', 'Platinum', 'Maharaja']
const COLORS = ['#6B6358', '#a8a8a8', '#B08D57', '#1F4E5A', '#1C1A17']

export default function Loyalty() {
  const { guests, bookings, updateGuest, log } = useStore()
  const stats = useMemo(() => guestStats(bookings), [bookings])
  const [adj, setAdj] = useState<Guest | null>(null)
  const [pts, setPts] = useState(5000)
  const [reason, setReason] = useState('Service recovery')
  const members = guests.filter((g) => g.tier !== 'Member')
  const dist = TIERS.map((t) => ({ name: t, value: guests.filter((g) => g.tier === t).length }))
  const liability = guests.reduce((a, g) => a + g.points, 0)
  const top = [...guests].sort((a, b) => b.points - a.points).slice(0, 15)
  const upgrades = guests.filter((g) => g.tier === 'Gold' && (stats.get(g.id)?.nights ?? 0) >= 8).slice(0, 5)
  return (
    <div className="space-y-6">
      <PageHeader title="Virasat Circle — Loyalty" sub="Tiers, points ledger and member recognition" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Circle members" value={members.length} hint={`${Math.round((members.length / guests.length) * 100)}% of guests`} />
        <Stat label="Points outstanding" value={(liability / 1e6).toFixed(2) + 'M'} hint={`≈ ₹${Math.round(liability * 0.25 / 1e5)}L liability`} tone="gold" />
        <Stat label="Maharaja members" value={guests.filter((g) => g.tier === 'Maharaja').length} tone="sindoor" />
        <Stat label="Member revenue share" value="64%" hint="vs 38% industry avg." tone="leaf" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Tier distribution">
          <div className="h-60"><ResponsiveContainer><BarChart data={dist}><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B6358' }} axisLine={false} tickLine={false} /><YAxis hide /><Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(176,141,87,0.08)' }} /><Bar dataKey="value" name="Guests" radius={[6, 6, 0, 0]}>{dist.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Bar></BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Tier rules" className="xl:col-span-2" pad={false}>
          <table className="w-full"><thead><tr><th className="a-th">Tier</th><th className="a-th">Qualification</th><th className="a-th">Earn / ₹100</th><th className="a-th">Key benefits</th></tr></thead>
            <tbody className="dark:text-sand">{LOYALTY_TIERS.map((t) => <tr key={t.name}><td className="a-td"><Badge className={tierColor[t.name as Guest['tier']]}>{t.name}</Badge></td><td className="a-td">{t.nights} nights</td><td className="a-td">{t.earn} pts</td><td className="a-td text-xs text-stone">{t.perks.slice(-2).join(' · ')}</td></tr>)}</tbody>
          </table>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Top members by points" className="xl:col-span-2" pad={false}>
          <table className="w-full"><tbody className="dark:text-sand">
            {top.map((g) => (
              <tr key={g.id}>
                <td className="a-td"><div className="flex items-center gap-3"><Avatar name={`${g.firstName} ${g.lastName}`} size={28} /><span className="font-medium dark:text-ivory">{g.firstName} {g.lastName}</span></div></td>
                <td className="a-td"><Badge className={tierColor[g.tier]}>{g.tier}</Badge></td>
                <td className="a-td">{stats.get(g.id)?.nights ?? 0} nights</td>
                <td className="a-td text-right font-semibold">{g.points.toLocaleString('en-IN')} pts</td>
                <td className="a-td text-right"><button onClick={() => setAdj(g)} className="a-btn-ghost py-1 text-xs">Adjust</button></td>
              </tr>
            ))}
          </tbody></table>
        </Card>
        <Card title="Suggested upgrades">
          <p className="mb-3 text-xs text-stone">Gold members close to Platinum — a surprise upgrade builds loyalty.</p>
          <ul className="space-y-3">
            {upgrades.map((g) => (
              <li key={g.id} className="flex items-center gap-3 text-sm dark:text-sand">
                <Avatar name={`${g.firstName} ${g.lastName}`} size={28} />
                <span className="flex-1">{g.firstName} {g.lastName}<span className="block text-xs text-stone">{stats.get(g.id)?.nights} nights this year</span></span>
                <button onClick={() => { updateGuest(g.id, { tier: 'Platinum' }); log('Tier upgrade', `${g.firstName} ${g.lastName} → Platinum`) }} className="a-btn py-1 text-xs">Upgrade</button>
              </li>
            ))}
            {!upgrades.length && <li className="text-sm text-stone">No candidates right now.</li>}
          </ul>
        </Card>
      </div>
      <Modal open={!!adj} onClose={() => setAdj(null)} title={`Adjust points — ${adj?.firstName} ${adj?.lastName}`}>
        <div className="space-y-3">
          <p className="text-sm dark:text-sand">Current balance: <b>{adj?.points.toLocaleString('en-IN')}</b></p>
          <Field label="Points (+/−)"><input type="number" className="a-input" value={pts} onChange={(e) => setPts(Number(e.target.value))} /></Field>
          <Field label="Reason"><select className="a-input" value={reason} onChange={(e) => setReason(e.target.value)}>{['Service recovery', 'Goodwill', 'Missing stay credit', 'Redemption', 'Promotion'].map((r) => <option key={r}>{r}</option>)}</select></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2"><button onClick={() => setAdj(null)} className="a-btn-ghost">Cancel</button><button onClick={() => { if (adj) { updateGuest(adj.id, { points: Math.max(0, adj.points + pts) }); log('Points adjusted', `${adj.firstName} ${adj.lastName} ${pts > 0 ? '+' : ''}${pts} · ${reason}`) } setAdj(null) }} className="a-btn">Apply</button></div>
      </Modal>
    </div>
  )
}
