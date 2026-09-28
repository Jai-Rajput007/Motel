import { useMemo, useState } from 'react'
import { MessageSquareReply, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { hotelById } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { useScoped } from '../../lib/hooks'
import { fmtDate } from '../../lib/utils'
import { Badge, Card, PageHeader, Progress, Stat } from '../../components/admin/ui'
import { Stars } from '../../components/ui/primitives'

export default function Reviews() {
  const { reviews } = useScoped()
  const replyReview = useStore((s) => s.replyReview)
  const [filter, setFilter] = useState<'all' | 'positive' | 'neutral' | 'negative' | 'unanswered'>('all')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const list = useMemo(() => reviews.filter((r) => filter === 'all' || (filter === 'unanswered' ? !r.reply : r.sentiment === filter)).sort((a, b) => b.date.localeCompare(a.date)), [reviews, filter])
  const avg = reviews.reduce((a, r) => a + r.rating, 0) / Math.max(1, reviews.length)
  const promoters = reviews.filter((r) => r.nps >= 9).length
  const detractors = reviews.filter((r) => r.nps <= 6).length
  const nps = Math.round(((promoters - detractors) / Math.max(1, reviews.length)) * 100)
  const tagCounts = Object.entries(reviews.reduce<Record<string, number>>((m, r) => { r.tags.forEach((t) => (m[t] = (m[t] ?? 0) + 1)); return m }, {})).sort((a, b) => b[1] - a[1])
  const suggest = (sentiment: string, name: string) => sentiment === 'positive'
    ? `Dear ${name.split(' ')[0]}, thank you for your generous words — it was a privilege to host you. We have shared your note with the team, and we look forward to welcoming you home again soon.`
    : `Dear ${name.split(' ')[0]}, thank you for your candid feedback, and please accept our apologies. Our General Manager has personally reviewed your stay and we would welcome the chance to make it right — we will be in touch directly.`

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews & NPS" sub="Every review from Google, TripAdvisor, Booking.com and our own post-stay survey" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Average rating" value={avg.toFixed(2)} hint={`${reviews.length} reviews`} />
        <Stat label="Net Promoter Score" value={`${nps > 0 ? '+' : ''}${nps}`} hint="world-class > 70" tone="leaf" />
        <Stat label="Response rate" value={`${Math.round((reviews.filter((r) => r.reply).length / Math.max(1, reviews.length)) * 100)}%`} tone="gold" />
        <Stat label="Needs reply" value={reviews.filter((r) => !r.reply).length} tone="sindoor" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(['all', 'unanswered', 'positive', 'neutral', 'negative'] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={clsx('rounded-full px-3 py-1.5 text-xs capitalize', filter === f ? 'bg-kohl text-ivory dark:bg-ivory dark:text-kohl' : 'bg-kohl/5 text-stone dark:bg-white/5')}>{f}</button>)}
          </div>
          {list.slice(0, 30).map((r) => (
            <div key={r.id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><Stars n={r.rating} /><p className="mt-1 font-semibold dark:text-ivory">{r.title}</p></div>
                <div className="flex gap-1.5"><Badge>{r.source}</Badge><Badge className={r.sentiment === 'positive' ? 'bg-leaf/15 text-leaf' : r.sentiment === 'negative' ? 'bg-sindoor/10 text-sindoor' : 'bg-gold/15 text-[#8a6a36]'}>{r.sentiment}</Badge></div>
              </div>
              <p className="mt-2 text-sm text-kohl/80 dark:text-sand">{r.body}</p>
              <p className="mt-2 text-xs text-stone">{r.guestName} · {hotelById(r.hotelId).name} · {fmtDate(r.date)} · tags: {r.tags.join(', ')}</p>
              {r.reply ? (
                <p className="mt-3 rounded-lg border-l-2 border-peacock bg-peacock/5 p-3 text-sm dark:text-sand"><b className="text-peacock">Management response:</b> {r.reply}</p>
              ) : (
                <div className="mt-3 space-y-2">
                  <textarea rows={2} className="a-input" placeholder="Write a response…" value={drafts[r.id] ?? ''} onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })} />
                  <div className="flex gap-2">
                    <button onClick={() => setDrafts({ ...drafts, [r.id]: suggest(r.sentiment, r.guestName) })} className="a-btn-ghost py-1.5 text-xs"><Sparkles size={13} /> Suggest reply</button>
                    <button disabled={!drafts[r.id]} onClick={() => replyReview(r.id, drafts[r.id])} className="a-btn py-1.5 text-xs"><MessageSquareReply size={13} /> Publish</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <Card title="Rating breakdown">
            {[5, 4, 3, 2, 1].map((s) => {
              const c = reviews.filter((r) => r.rating === s).length
              return <div key={s} className="mb-2 flex items-center gap-3 text-sm dark:text-sand"><span className="w-6">{s}★</span><Progress value={(c / Math.max(1, reviews.length)) * 100} className="flex-1" tone="bg-gold" /><span className="w-8 text-right text-xs text-stone">{c}</span></div>
            })}
          </Card>
          <Card title="What guests talk about">
            <div className="flex flex-wrap gap-2">{tagCounts.map(([t, c]) => <Badge key={t} className="bg-peacock/10 text-peacock dark:text-[#9fd0dc]">{t} · {c}</Badge>)}</div>
          </Card>
          <Card title="NPS mix">
            <div className="flex h-3 overflow-hidden rounded-full">
              <div className="bg-leaf" style={{ width: `${(promoters / reviews.length) * 100}%` }} />
              <div className="bg-gold" style={{ width: `${((reviews.length - promoters - detractors) / reviews.length) * 100}%` }} />
              <div className="bg-sindoor" style={{ width: `${(detractors / reviews.length) * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-stone"><span>Promoters {promoters}</span><span>Passives {reviews.length - promoters - detractors}</span><span>Detractors {detractors}</span></div>
          </Card>
        </div>
      </div>
    </div>
  )
}
