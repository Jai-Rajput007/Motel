import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Mail, MessageCircle, Plus, Send, Smartphone } from 'lucide-react'
import clsx from 'clsx'
import { useStore } from '../../store/useStore'
import { guestStats, inSegment } from '../../lib/selectors'
import { fmtDate, inrC, pct, todayISO, uid } from '../../lib/utils'
import { Badge, Card, Field, PageHeader, Stat } from '../../components/admin/ui'
import { img } from '../../data/images'
import type { Campaign } from '../../types'

const TEMPLATES = [
  { name: 'Festive invitation', subject: 'Ten thousand diyas await you', body: 'Namaste {first_name},\n\nThis Diwali, Amer Bagh Palace will glow with ten thousand clay lamps. Join us for three nights of Lakshmi puja, rangoli at dawn and a royal feast — with 20% off for our Circle members.\n\nWith warm regards,\nThe Virasat family', image: 'amerLake' },
  { name: 'Win-back', subject: 'It has been too long, {first_name}', body: 'Namaste {first_name},\n\nThe lake is full and the terraces are quiet. We would love to welcome you home — enjoy a complimentary third night on your next stay.\n\nThe Virasat family', image: 'udaipurLake' },
  { name: 'Wellness launch', subject: 'Seven days to begin again', body: 'Namaste {first_name},\n\nOur vaidyas have composed a new seven-day Ayurveda immersion at Kettuvallam Retreat. Consultations, daily therapies and sattvic cuisine, from ₹1,45,000.\n\nThe Virasat family', image: 'spaOil' },
]

export default function Campaigns() {
  const [sp] = useSearchParams()
  const { campaigns, segments, guests, bookings, saveCampaign, sendCampaign } = useStore()
  const stats = useMemo(() => guestStats(bookings), [bookings])
  const size = (segId: string) => { const s = segments.find((x) => x.id === segId); return s ? guests.filter((g) => inSegment(s, g, stats.get(g.id)) && g.marketingOptIn).length : 0 }
  const [editing, setEditing] = useState<Campaign | null>(sp.get('segment') ? { id: '', name: '', channel: 'Email', segmentId: sp.get('segment')!, subject: TEMPLATES[0].subject, body: TEMPLATES[0].body, status: 'Draft', sent: 0, opened: 0, clicked: 0, bookings: 0, revenue: 0, createdAt: todayISO() } : null)
  const [tpl, setTpl] = useState(0)
  const sent = campaigns.filter((c) => c.status === 'Sent')
  const totals = sent.reduce((a, c) => ({ sent: a.sent + c.sent, opened: a.opened + c.opened, clicked: a.clicked + c.clicked, rev: a.rev + c.revenue, bookings: a.bookings + c.bookings }), { sent: 0, opened: 0, clicked: 0, rev: 0, bookings: 0 })
  const newCampaign = () => setEditing({ id: '', name: '', channel: 'Email', segmentId: segments[0].id, subject: TEMPLATES[0].subject, body: TEMPLATES[0].body, status: 'Draft', sent: 0, opened: 0, clicked: 0, bookings: 0, revenue: 0, createdAt: todayISO() })
  const preview = (s: string) => s.replace(/\{first_name\}/g, 'Ananya')

  return (
    <div className="space-y-6">
      <PageHeader title="Campaigns" sub="Email & WhatsApp marketing to your segments, with revenue attribution" actions={<button onClick={newCampaign} className="a-btn"><Plus size={14} /> New campaign</button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Messages sent" value={totals.sent.toLocaleString()} />
        <Stat label="Open rate" value={pct(totals.opened / Math.max(1, totals.sent), 1)} tone="leaf" />
        <Stat label="Click rate" value={pct(totals.clicked / Math.max(1, totals.sent), 1)} tone="gold" />
        <Stat label="Attributed revenue" value={inrC(totals.rev)} hint={`${totals.bookings} bookings`} tone="sindoor" />
      </div>

      {editing ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title={editing.id ? 'Edit campaign' : 'New campaign'}>
            <div className="space-y-4">
              <Field label="Campaign name"><input className="a-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Diwali 2026 — Circle members" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Channel">
                  <div className="flex gap-2">{(['Email', 'WhatsApp', 'SMS'] as const).map((c) => <button key={c} onClick={() => setEditing({ ...editing, channel: c })} className={clsx('flex-1 rounded-lg border px-2 py-2 text-sm', editing.channel === c ? 'border-peacock bg-peacock/10 text-peacock' : 'border-kohl/10 dark:border-white/10 dark:text-sand')}>{c}</button>)}</div>
                </Field>
                <Field label="Audience"><select className="a-input" value={editing.segmentId} onChange={(e) => setEditing({ ...editing, segmentId: e.target.value })}>{segments.map((s) => <option key={s.id} value={s.id}>{s.name} ({size(s.id)})</option>)}</select></Field>
              </div>
              <Field label="Template"><div className="flex flex-wrap gap-2">{TEMPLATES.map((t, i) => <button key={t.name} onClick={() => { setTpl(i); setEditing({ ...editing, subject: t.subject, body: t.body }) }} className={clsx('rounded-lg border px-3 py-1.5 text-xs', tpl === i ? 'border-gold bg-gold/10' : 'border-kohl/10 dark:border-white/10 dark:text-sand')}>{t.name}</button>)}</div></Field>
              {editing.channel === 'Email' && <Field label="Subject"><input className="a-input" value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} /></Field>}
              <Field label="Message"><textarea rows={8} className="a-input font-mono text-xs" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></Field>
              <p className="text-xs text-stone">Personalisation: {'{first_name}'} · only opted-in guests receive marketing.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setEditing(null)} className="a-btn-ghost">Cancel</button>
                <button onClick={() => { saveCampaign({ ...editing, id: editing.id || uid('c'), name: editing.name || 'Untitled campaign' }); setEditing(null) }} className="a-btn-ghost">Save draft</button>
                <button onClick={() => { const id = editing.id || uid('c'); saveCampaign({ ...editing, id, name: editing.name || 'Untitled campaign' }); sendCampaign(id, size(editing.segmentId)); setEditing(null) }} className="a-btn"><Send size={14} /> Send to {size(editing.segmentId)} guests</button>
              </div>
            </div>
          </Card>
          <Card title="Preview">
            {editing.channel === 'Email' ? (
              <div className="mx-auto max-w-md overflow-hidden rounded-lg bg-white text-kohl shadow ring-1 ring-kohl/10">
                <p className="border-b border-kohl/10 px-4 py-2 text-xs text-stone"><b>Subject:</b> {preview(editing.subject)}</p>
                <div className="bg-kohl py-4 text-center font-display text-xl tracking-[0.3em] text-ivory">VIRASAT</div>
                <img src={img(TEMPLATES[tpl].image, 800, 360)} alt="" className="h-44 w-full object-cover" />
                <p className="whitespace-pre-line p-5 text-sm leading-relaxed">{preview(editing.body)}</p>
                <div className="px-5 pb-6"><span className="inline-block bg-sindoor px-5 py-2.5 text-xs uppercase tracking-widest text-ivory">Reserve now</span></div>
              </div>
            ) : (
              <div className="mx-auto w-72 rounded-[32px] border-[8px] border-kohl bg-[#e5ddd5] p-3">
                <p className="mb-2 flex items-center gap-2 rounded-lg bg-[#1f7a4d] px-3 py-2 text-xs text-white">{editing.channel === 'WhatsApp' ? <MessageCircle size={13} /> : <Smartphone size={13} />} Virasat Palaces ✓</p>
                <div className="rounded-lg bg-white p-2 text-kohl shadow-sm">
                  {editing.channel === 'WhatsApp' && <img src={img(TEMPLATES[tpl].image, 500, 260)} alt="" className="mb-2 rounded" />}
                  <p className="whitespace-pre-line text-[12px] leading-snug">{preview(editing.body).slice(0, editing.channel === 'SMS' ? 160 : 600)}</p>
                  <p className="mt-1 text-right text-[10px] text-stone">10:42</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead><tr><th className="a-th">Campaign</th><th className="a-th">Audience</th><th className="a-th">Status</th><th className="a-th text-right">Sent</th><th className="a-th text-right">Open</th><th className="a-th text-right">Click</th><th className="a-th text-right">Bookings</th><th className="a-th text-right">Revenue</th></tr></thead>
              <tbody className="dark:text-sand">
                {campaigns.map((c) => (
                  <tr key={c.id} onClick={() => c.status !== 'Sent' && setEditing(c)} className={clsx(c.status !== 'Sent' && 'cursor-pointer hover:bg-kohl/[0.02]')}>
                    <td className="a-td"><p className="flex items-center gap-2 font-medium dark:text-ivory">{c.channel === 'Email' ? <Mail size={14} className="text-stone" /> : <MessageCircle size={14} className="text-leaf" />}{c.name}</p><p className="text-xs text-stone">{c.subject}</p></td>
                    <td className="a-td">{segments.find((s) => s.id === c.segmentId)?.name}</td>
                    <td className="a-td"><Badge className={c.status === 'Sent' ? 'bg-leaf/15 text-leaf' : c.status === 'Scheduled' ? 'bg-peacock/10 text-peacock' : undefined}>{c.status}{c.scheduledFor && c.status === 'Scheduled' && ` · ${fmtDate(c.scheduledFor, 'd MMM')}`}</Badge></td>
                    <td className="a-td text-right">{c.sent.toLocaleString()}</td>
                    <td className="a-td text-right">{c.sent ? pct(c.opened / c.sent) : '—'}</td>
                    <td className="a-td text-right">{c.sent ? pct(c.clicked / c.sent, 1) : '—'}</td>
                    <td className="a-td text-right">{c.bookings || '—'}</td>
                    <td className="a-td text-right font-medium">{c.revenue ? inrC(c.revenue) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
