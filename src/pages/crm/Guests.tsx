import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Cake, Download, Heart, Mail, MessageCircle, Phone, Search, Tag, X } from 'lucide-react'
import clsx from 'clsx'
import { hotelById, roomTypeById } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { guestStats, statusColor } from '../../lib/selectors'
import { downloadCSV, fmtDate, inr, inrC, nightsBetween } from '../../lib/utils'
import { Avatar, Badge, Card, Drawer, PageHeader, Stat } from '../../components/admin/ui'
import type { Guest } from '../../types'

export const tierColor: Record<Guest['tier'], string> = {
  Member: 'bg-kohl/5 text-stone dark:bg-white/10 dark:text-sand',
  Silver: 'bg-[#e6e6e6] text-[#555] dark:bg-white/15 dark:text-sand',
  Gold: 'bg-gold/20 text-[#8a6a36] dark:text-gold-2',
  Platinum: 'bg-peacock/15 text-peacock dark:text-[#9fd0dc]',
  Maharaja: 'bg-kohl text-gold-2 dark:bg-gold/20',
}

function Guest360({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { guests, bookings, reviews, leads, updateGuest } = useStore()
  const [tag, setTag] = useState('')
  const [note, setNote] = useState('')
  const g = guests.find((x) => x.id === id)
  const mine = useMemo(() => bookings.filter((b) => b.guestId === id).sort((a, b) => b.checkIn.localeCompare(a.checkIn)), [bookings, id])
  if (!g) return <Drawer open={false} onClose={onClose} title=""><></></Drawer>
  const active = mine.filter((b) => b.status !== 'cancelled' && b.status !== 'no-show')
  const spend = active.reduce((a, b) => a + b.total + b.folio.filter((f) => f.type === 'charge').reduce((x, f) => x + f.amount, 0), 0)
  const nights = active.reduce((a, b) => a + nightsBetween(b.checkIn, b.checkOut), 0)
  const favHotel = Object.entries(active.reduce<Record<string, number>>((m, b) => ((m[b.hotelId] = (m[b.hotelId] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1])[0]
  const myReviews = reviews.filter((r) => r.guestName.startsWith(g.firstName) && r.guestName.includes(g.lastName[0] + '.'))
  const myLeads = leads.filter((l) => l.email.toLowerCase() === g.email.toLowerCase())
  const timeline = [
    ...mine.map((b) => ({ at: b.createdAt, text: `Booked ${roomTypeById(b.roomTypeId).name} at ${hotelById(b.hotelId).name} (${b.ref})`, kind: 'booking' })),
    ...mine.filter((b) => b.status === 'checked-out').map((b) => ({ at: b.checkOut, text: `Checked out of ${hotelById(b.hotelId).name} · spent ${inr(b.total)}`, kind: 'stay' })),
    { at: g.createdAt, text: 'Profile created', kind: 'system' },
  ].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <Drawer open={!!id} onClose={onClose} width="max-w-3xl" title="Guest profile">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={`${g.firstName} ${g.lastName}`} size={64} />
          <div className="flex-1">
            <p className="text-2xl font-semibold dark:text-ivory">{g.firstName} {g.lastName}</p>
            <p className="text-sm text-stone">{g.city}{g.city && ', '}{g.country}{g.company && ` · ${g.company}`}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge className={tierColor[g.tier]}>{g.tier}</Badge>
              {g.tags.map((t) => <Badge key={t} className="bg-peacock/10 text-peacock dark:text-[#9fd0dc]">{t}<button onClick={() => updateGuest(g.id, { tags: g.tags.filter((x) => x !== t) })} aria-label={`Remove ${t}`}><X size={10} /></button></Badge>)}
              <form onSubmit={(e) => { e.preventDefault(); if (tag) { updateGuest(g.id, { tags: [...g.tags, tag] }); setTag('') } }}><input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="+ tag" className="w-16 rounded-full border border-dashed border-kohl/20 bg-transparent px-2 py-0.5 text-[11px] outline-none dark:border-white/20" /></form>
            </div>
          </div>
          <div className="flex gap-2">
            <a href={`mailto:${g.email}`} className="a-btn-ghost p-2" aria-label="Email"><Mail size={16} /></a>
            <a href={`https://wa.me/${g.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="a-btn-ghost p-2" aria-label="WhatsApp"><MessageCircle size={16} /></a>
            <a href={`tel:${g.phone}`} className="a-btn-ghost p-2" aria-label="Call"><Phone size={16} /></a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[['Lifetime value', inrC(spend)], ['Stays', active.length], ['Nights', nights], ['Points', g.points.toLocaleString('en-IN')]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-kohl/[0.03] p-3 dark:bg-white/5"><p className="text-xs text-stone">{l}</p><p className="text-xl font-semibold dark:text-ivory">{v}</p></div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Contact & dates">
            <ul className="space-y-2 text-sm dark:text-sand">
              <li className="flex items-center gap-2"><Mail size={14} className="text-stone" /> {g.email}</li>
              <li className="flex items-center gap-2"><Phone size={14} className="text-stone" /> {g.phone || '—'}</li>
              {g.birthday && <li className="flex items-center gap-2"><Cake size={14} className="text-stone" /> Birthday {fmtDate(g.birthday, 'd MMMM')}</li>}
              {g.anniversary && <li className="flex items-center gap-2"><Heart size={14} className="text-stone" /> Anniversary {fmtDate(g.anniversary, 'd MMMM')}</li>}
              <li className="flex items-center gap-2"><Tag size={14} className="text-stone" /> Marketing: {g.marketingOptIn ? 'opted in' : 'opted out'}</li>
              {favHotel && <li className="text-xs text-stone">Favourite: {hotelById(favHotel[0]).name}</li>}
            </ul>
          </Card>
          <Card title="Preferences">
            <div className="flex flex-wrap gap-1.5">{g.preferences.length ? g.preferences.map((p) => <Badge key={p} className="bg-gold/15 text-[#8a6a36] dark:text-gold-2">{p}</Badge>) : <span className="text-sm text-stone">None recorded</span>}</div>
            <p className="mt-4 text-xs font-medium text-stone">Staff notes</p>
            <p className="mt-1 text-sm dark:text-sand">{g.notes || '—'}</p>
            <form onSubmit={(e) => { e.preventDefault(); if (note) { updateGuest(g.id, { notes: `${g.notes ? g.notes + '\n' : ''}${note}` }); setNote('') } }} className="mt-2 flex gap-2"><input className="a-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for all properties…" /><button className="a-btn">Add</button></form>
          </Card>
        </div>
        <Card title={`Stay history (${mine.length})`} pad={false}>
          <table className="w-full"><tbody className="dark:text-sand">
            {mine.slice(0, 10).map((b) => (
              <tr key={b.id}><td className="a-td font-mono text-xs">{b.ref}</td><td className="a-td">{hotelById(b.hotelId).name}<span className="block text-xs text-stone">{roomTypeById(b.roomTypeId).name}</span></td><td className="a-td">{fmtDate(b.checkIn, 'd MMM yy')}</td><td className="a-td"><Badge className={statusColor[b.status]}>{b.status}</Badge></td><td className="a-td text-right">{inr(b.total)}</td></tr>
            ))}
          </tbody></table>
        </Card>
        {(myLeads.length > 0 || myReviews.length > 0) && (
          <Card title="Leads & feedback">
            {myLeads.map((l) => <p key={l.id} className="text-sm dark:text-sand">Lead: {l.type} for {l.guests} guests · <b>{l.stage}</b></p>)}
            {myReviews.map((r) => <p key={r.id} className="text-sm dark:text-sand">Review: {r.rating}★ “{r.title}”</p>)}
          </Card>
        )}
        <Card title="Activity timeline">
          <ol className="relative space-y-4 border-l border-kohl/10 pl-5 dark:border-white/10">
            {timeline.slice(0, 12).map((t, i) => (
              <li key={i} className="relative text-sm dark:text-sand">
                <span className={clsx('absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full', t.kind === 'booking' ? 'bg-peacock' : t.kind === 'stay' ? 'bg-gold' : 'bg-stone')} />
                {t.text}<span className="block text-xs text-stone">{fmtDate(t.at)}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </Drawer>
  )
}

export default function Guests() {
  const [sp, setSp] = useSearchParams()
  const { guests, bookings } = useStore()
  const [q, setQ] = useState('')
  const [tier, setTier] = useState('All')
  const [sort, setSort] = useState<'recent' | 'spend' | 'stays'>('recent')
  const [page, setPage] = useState(0)
  const stats = useMemo(() => guestStats(bookings), [bookings])
  const rows = useMemo(() => {
    const s = q.toLowerCase()
    return guests
      .filter((g) => (tier === 'All' || g.tier === tier) && `${g.firstName} ${g.lastName} ${g.email} ${g.city} ${g.company ?? ''}`.toLowerCase().includes(s))
      .sort((a, b) => sort === 'spend' ? (stats.get(b.id)?.spend ?? 0) - (stats.get(a.id)?.spend ?? 0) : sort === 'stays' ? (stats.get(b.id)?.stays ?? 0) - (stats.get(a.id)?.stays ?? 0) : b.createdAt.localeCompare(a.createdAt))
  }, [guests, q, tier, sort, stats])
  const PER = 20
  const repeat = guests.filter((g) => (stats.get(g.id)?.stays ?? 0) >= 2).length
  const ltv = [...stats.values()].reduce((a, s) => a + s.spend, 0) / Math.max(1, stats.size)
  const openId = sp.get('id')

  return (
    <div className="space-y-6">
      <PageHeader title="Guests" sub="A single profile for every guest, across every property" actions={<button onClick={() => downloadCSV('guests.csv', rows.map((g) => ({ name: `${g.firstName} ${g.lastName}`, email: g.email, phone: g.phone, country: g.country, tier: g.tier, points: g.points, stays: stats.get(g.id)?.stays ?? 0, spend: stats.get(g.id)?.spend ?? 0, optIn: g.marketingOptIn })))} className="a-btn-ghost"><Download size={14} /> Export</button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Guest profiles" value={guests.length.toLocaleString()} hint={`${guests.filter((g) => g.createdAt >= new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)).length} new in 30 days`} />
        <Stat label="Repeat guests" value={`${Math.round((repeat / guests.length) * 100)}%`} hint={`${repeat} guests`} tone="leaf" />
        <Stat label="Avg. lifetime value" value={inrC(ltv)} tone="gold" />
        <Stat label="Marketing opt-in" value={`${Math.round((guests.filter((g) => g.marketingOptIn).length / guests.length) * 100)}%`} tone="sindoor" />
      </div>
      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-kohl/5 p-4 dark:border-white/5">
          <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Name, email, city, company…" className="a-input w-64 pl-8" /></div>
          <select className="a-input w-auto" value={tier} onChange={(e) => { setTier(e.target.value); setPage(0) }}>{['All', 'Member', 'Silver', 'Gold', 'Platinum', 'Maharaja'].map((t) => <option key={t}>{t}</option>)}</select>
          <select className="a-input w-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="recent">Newest</option><option value="spend">Highest spend</option><option value="stays">Most stays</option></select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead><tr><th className="a-th">Guest</th><th className="a-th">Tier</th><th className="a-th">Location</th><th className="a-th text-right">Stays</th><th className="a-th text-right">Lifetime spend</th><th className="a-th">Last stay</th><th className="a-th">Tags</th></tr></thead>
            <tbody className="dark:text-sand">
              {rows.slice(page * PER, page * PER + PER).map((g) => {
                const s = stats.get(g.id)
                return (
                  <tr key={g.id} onClick={() => setSp({ id: g.id })} className="cursor-pointer hover:bg-kohl/[0.02] dark:hover:bg-white/[0.03]">
                    <td className="a-td"><div className="flex items-center gap-3"><Avatar name={`${g.firstName} ${g.lastName}`} size={32} /><div><p className="font-medium dark:text-ivory">{g.firstName} {g.lastName}</p><p className="text-xs text-stone">{g.email}</p></div></div></td>
                    <td className="a-td"><Badge className={tierColor[g.tier]}>{g.tier}</Badge></td>
                    <td className="a-td">{g.city || '—'}<span className="block text-xs text-stone">{g.country}</span></td>
                    <td className="a-td text-right">{s?.stays ?? 0}</td>
                    <td className="a-td text-right font-medium">{inr(s?.spend ?? 0)}</td>
                    <td className="a-td">{s?.next ? <span className="text-peacock">Upcoming {fmtDate(s.next, 'd MMM')}</span> : s?.last ? fmtDate(s.last, 'd MMM yy') : '—'}</td>
                    <td className="a-td"><div className="flex flex-wrap gap-1">{g.tags.slice(0, 2).map((t) => <Badge key={t}>{t}</Badge>)}</div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-kohl/5 px-4 py-3 text-sm text-stone dark:border-white/5">
          <span>{rows.length} guests</span>
          <div className="flex gap-2"><button disabled={page === 0} onClick={() => setPage(page - 1)} className="a-btn-ghost py-1">Prev</button><button disabled={(page + 1) * PER >= rows.length} onClick={() => setPage(page + 1)} className="a-btn-ghost py-1">Next</button></div>
        </div>
      </Card>
      <Guest360 id={openId} onClose={() => setSp({})} />
    </div>
  )
}
