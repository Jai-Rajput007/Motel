import { lazy, Suspense, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, Clock, Copy } from 'lucide-react'
import clsx from 'clsx'
import { HOTELS } from '../../data/hotels'
import { OFFERS, SPA_THERAPIES } from '../../data/content'
import { useStore } from '../../store/useStore'
import PageHero from '../../components/guest/PageHero'
import { Img, Money, Ornament, Reveal, SectionHeading, Stars } from '../../components/ui/primitives'
import { addDaysISO, todayISO } from '../../lib/utils'

const IndiaMap = lazy(() => import('../../components/ui/IndiaMap'))

export function Destinations() {
  const [region, setRegion] = useState('All')
  const [active, setActive] = useState<string>()
  const regions = ['All', ...Array.from(new Set(HOTELS.map((h) => h.region)))]
  const list = HOTELS.filter((h) => region === 'All' || h.region === region)
  return (
    <>
      <PageHero image="amerFort" eyebrow="Destinations" title="From the Himalaya to the backwaters" text="Six homes, each rooted in the history and craft of its region." />
      <section className="py-20">
        <div className="container-lux">
          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {regions.map((r) => (
              <button key={r} onClick={() => setRegion(r)} className={clsx('px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] transition', region === r ? 'bg-kohl text-ivory' : 'border border-kohl/15 hover:border-kohl')}>{r}</button>
            ))}
          </div>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div className="space-y-6">
              {list.map((h) => (
                <Reveal key={h.id}>
                  <Link to={`/hotels/${h.slug}`} onMouseEnter={() => setActive(h.id)} className={clsx('group grid gap-5 bg-white p-4 ring-1 transition sm:grid-cols-[220px_1fr]', active === h.id ? 'ring-gold' : 'ring-kohl/5')}>
                    <Img k={h.hero} w={600} className="aspect-[4/3]" zoom alt={h.name} />
                    <div className="flex flex-col py-1">
                      <p className="eyebrow">{h.city}, {h.state}</p>
                      <h3 className="mt-2 text-3xl">{h.name}</h3>
                      <p className="mt-1 text-sm text-stone">{h.type} · since {h.established}</p>
                      <p className="mt-3 line-clamp-2 text-sm text-stone">{h.intro}</p>
                      <div className="mt-auto flex items-center justify-between pt-4">
                        <span className="flex items-center gap-2 text-sm"><Stars n={h.rating} /> {h.rating}</span>
                        <span className="link-lux">Explore <ArrowRight size={13} /></span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
            <div className="lg:sticky lg:top-36 lg:self-start">
              <Suspense fallback={<div className="h-[640px] bg-sand" />}>
                <IndiaMap hotels={list} active={active} onHover={setActive} className="h-[480px] lg:h-[calc(100vh-180px)]" />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export function Experiences() {
  const all = HOTELS.flatMap((h) => h.experiences.map((e) => ({ ...e, hotel: h })))
  const cats = ['All', ...Array.from(new Set(all.map((e) => e.category)))]
  const [cat, setCat] = useState('All')
  const [sent, setSent] = useState<string | null>(null)
  const notify = useStore((s) => s.notify)
  return (
    <>
      <PageHero image="keralaBoatman" eyebrow="Experiences" title="Journeys into living heritage" text="Curated by our resident historians, artisans and naturalists — each one private, each one unhurried." />
      <section className="py-20">
        <div className="container-lux">
          <div className="mb-14 flex flex-wrap justify-center gap-2">
            {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={clsx('px-5 py-2.5 text-[11px] uppercase tracking-[0.2em]', cat === c ? 'bg-kohl text-ivory' : 'border border-kohl/15 hover:border-kohl')}>{c}</button>)}
          </div>
          <div className="grid gap-x-8 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
            {all.filter((e) => cat === 'All' || e.category === cat).map((e, i) => (
              <Reveal key={e.id} delay={(i % 3) * 0.1}>
                <Img k={e.image} w={900} className="aspect-[4/5]" alt={e.name} />
                <p className="eyebrow mt-6">{e.hotel.city} · {e.category}</p>
                <h3 className="mt-2 text-3xl">{e.name}</h3>
                <p className="mt-2 text-stone">{e.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-kohl/10 pt-4">
                  <div>
                    <Money v={e.price} className="font-display text-2xl" />
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-stone"><Clock size={12} /> {e.duration}</span>
                  </div>
                  {sent === e.id ? <span className="flex items-center gap-1 text-sm text-leaf"><Check size={14} /> Request sent</span> : (
                    <button onClick={() => { setSent(e.id); notify('booking', `Experience request: ${e.name} at ${e.hotel.name}`) }} className="link-lux">Request</button>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export function Dining() {
  const [sp] = useSearchParams()
  const venues = HOTELS.flatMap((h) => h.dining.map((d) => ({ ...d, hotel: h })))
  const addTable = useStore((s) => s.addTableBooking)
  const [form, setForm] = useState({ venue: sp.get('venue') ?? venues[0].name, name: '', email: '', date: addDaysISO(todayISO(), 2), time: '20:00', guests: 2 })
  const [done, setDone] = useState(false)
  return (
    <>
      <PageHero image="fineDining" eyebrow="Dining" title="Recipes from the royal kitchens" text="Our chefs spent years with the families of palace cooks, recovering dishes that had never been written down." />
      <section className="py-24">
        <div className="container-lux space-y-24">
          {venues.map((v, i) => (
            <Reveal key={v.name}>
              <div className={clsx('grid items-center gap-10 lg:grid-cols-2', i % 2 && 'lg:[&>*:first-child]:order-2')}>
                <Img k={v.image} w={1300} className="aspect-[3/2]" alt={v.name} />
                <div className="lg:px-10">
                  <p className="eyebrow">{v.hotel.name} · {v.hotel.city}</p>
                  <h2 className="mt-3 text-5xl">{v.name}</h2>
                  <p className="mt-2 font-display text-xl italic text-sindoor">{v.cuisine}</p>
                  <p className="mt-5 text-stone">{v.description}</p>
                  <p className="mt-4 text-xs uppercase tracking-widest text-stone">{v.hours}</p>
                  <a href="#reserve" onClick={() => setForm({ ...form, venue: v.name })} className="btn-outline mt-8">Reserve a table</a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      <section id="reserve" className="scroll-mt-32 bg-kohl py-24 text-ivory">
        <div className="container-lux max-w-3xl">
          <SectionHeading light eyebrow="Reservations" title="Reserve a table" />
          {done ? (
            <p className="mt-10 text-center font-display text-3xl text-gold-2">Your table is reserved. A confirmation is on its way to {form.email}.</p>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); const v = venues.find((x) => x.name === form.venue)!; addTable({ hotelId: v.hotel.id, venue: form.venue, name: form.name, email: form.email, date: form.date, time: form.time, guests: form.guests }); setDone(true) }} className="mt-10 grid gap-8 text-ivory md:grid-cols-2 [&_.field]:border-ivory/30 [&_.field]:text-ivory [&_.field-label]:text-ivory/60">
              <label className="md:col-span-2"><span className="field-label">Restaurant</span><select className="field [&>option]:text-kohl" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}>{venues.map((v) => <option key={v.name} value={v.name}>{v.name} — {v.hotel.city}</option>)}</select></label>
              <label><span className="field-label">Name</span><input required className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label><span className="field-label">Email</span><input required type="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <label><span className="field-label">Date</span><input type="date" min={todayISO()} className="field [color-scheme:dark]" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-6">
                <label><span className="field-label">Time</span><select className="field [&>option]:text-kohl" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>{['12:30', '13:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'].map((t) => <option key={t}>{t}</option>)}</select></label>
                <label><span className="field-label">Guests</span><select className="field [&>option]:text-kohl" value={form.guests} onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 6, 8, 10].map((t) => <option key={t}>{t}</option>)}</select></label>
              </div>
              <button className="btn-primary md:col-span-2">Confirm reservation</button>
            </form>
          )}
        </div>
      </section>
    </>
  )
}

export function Wellness() {
  const notify = useStore((s) => s.notify)
  const [booked, setBooked] = useState<string | null>(null)
  return (
    <>
      <PageHero image="yogaMeditate" eyebrow="Ayurveda & Wellness" title="Return to balance" text="Our Ayurveda physicians trace their lineage back eight generations. Every programme begins with a consultation and pulse reading." />
      <section className="py-24">
        <div className="container-lux grid items-center gap-16 lg:grid-cols-2">
          <Reveal><Img k="spaStones" w={1200} className="arch aspect-[4/5]" alt="" /></Reveal>
          <Reveal delay={0.1}>
            <SectionHeading center={false} eyebrow="The Philosophy" title="Classical Ayurveda, without compromise" text="We do not offer ‘Ayurveda-inspired’ treatments. Our therapies follow the classical texts, our oils are prepared in-house over days, and our kitchen cooks for your constitution." />
            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-kohl/10 pt-8 text-center">
              {[['8', 'generations of vaidyas'], ['42', 'classical therapies'], ['120', 'herbs grown on site']].map(([n, l]) => <div key={l}><p className="font-display text-4xl">{n}</p><p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-stone">{l}</p></div>)}
            </div>
          </Reveal>
        </div>
      </section>
      <section className="bg-sand/50 py-24">
        <div className="container-lux">
          <SectionHeading eyebrow="Therapies" title="Signature rituals" />
          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {SPA_THERAPIES.map((t) => (
              <Reveal key={t.name} className="flex flex-col bg-ivory">
                <Img k={t.image} w={700} className="aspect-[4/3]" alt={t.name} />
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-2xl">{t.name}</h3>
                  <p className="text-xs uppercase tracking-widest text-stone">{t.duration}</p>
                  <p className="mt-3 text-sm text-stone">{t.description}</p>
                  <div className="mt-auto flex items-center justify-between pt-5">
                    <Money v={t.price} className="font-display text-xl" />
                    {booked === t.name ? <span className="text-sm text-leaf">✓ Requested</span> : <button onClick={() => { setBooked(t.name); notify('booking', `Spa request: ${t.name}`) }} className="link-lux">Book</button>}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export function Offers() {
  const [copied, setCopied] = useState('')
  return (
    <>
      <PageHero image="poolDusk" eyebrow="Offers" title="Invitations for the season" height="h-[70vh]" />
      <section className="py-24">
        <div className="container-lux space-y-10">
          {OFFERS.map((o, i) => (
            <Reveal key={o.id}>
              <div className={clsx('grid overflow-hidden bg-white ring-1 ring-kohl/5 lg:grid-cols-2', i % 2 && 'lg:[&>*:first-child]:order-2')}>
                <Img k={o.image} w={1200} className="aspect-[3/2] h-full" alt={o.title} />
                <div className="flex flex-col justify-center p-8 md:p-14">
                  <p className="eyebrow">{o.hotels} · {o.valid}</p>
                  <h2 className="mt-3 text-4xl md:text-5xl">{o.title}</h2>
                  <p className="mt-3 text-lg text-stone">{o.subtitle}</p>
                  <ul className="mt-6 space-y-2">{o.perks.map((p) => <li key={p} className="flex items-center gap-3 text-stone"><Check size={15} className="text-gold" /> {p}</li>)}</ul>
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <Link to={`/book?promo=${o.code}`} className="btn-primary">Book this offer</Link>
                    <button onClick={() => { navigator.clipboard?.writeText(o.code); setCopied(o.code) }} className="flex items-center gap-2 border border-dashed border-gold px-4 py-3 font-mono text-sm">
                      <Copy size={13} /> {copied === o.code ? 'Copied!' : o.code}
                    </button>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
          <Ornament />
        </div>
      </section>
    </>
  )
}

export function NotFound() {
  return (
    <div className="container-lux flex min-h-[70vh] flex-col items-center justify-center pt-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 text-6xl">This corridor leads nowhere</h1>
      <p className="mt-4 text-stone">Even palaces have a few locked doors. Let us take you somewhere lovelier.</p>
      <Link to="/" className="btn-dark mt-10">Return home</Link>
    </div>
  )
}
