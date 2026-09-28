import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight, Check, Gift, Mail, MapPin, Phone } from 'lucide-react'
import clsx from 'clsx'
import { HOTELS, hotelById, roomTypeById } from '../../data/hotels'
import { JOURNAL, LOYALTY_TIERS, RATE_PLANS, WEDDING_VENUES } from '../../data/content'
import { useStore } from '../../store/useStore'
import PageHero from '../../components/guest/PageHero'
import { Img, Logo, Money, Ornament, Reveal, SectionHeading } from '../../components/ui/primitives'
import { addDaysISO, fmtDate, nightsBetween, todayISO } from '../../lib/utils'
import { guestStats } from '../../lib/selectors'

export function Weddings() {
  const addLead = useStore((s) => s.addLead)
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ type: 'Wedding', hotelId: 'abp', eventDate: addDaysISO(todayISO(), 180), guests: 250, functions: ['Mehendi', 'Sangeet', 'Pheras'] as string[], budget: '₹1–2 Crore', name: '', email: '', phone: '', notes: '' })
  const fns = ['Haldi', 'Mehendi', 'Sangeet', 'Baraat', 'Pheras', 'Reception', 'Cocktail']
  const submit = () => {
    const perGuest = f.budget.startsWith('₹50') ? 18000 : f.budget.startsWith('₹1–2') ? 42000 : f.budget.startsWith('₹2') ? 80000 : 30000
    addLead({ name: f.name, email: f.email, phone: f.phone, type: f.type as 'Wedding', hotelId: f.hotelId, eventDate: f.eventDate, guests: f.guests, value: Math.round((f.guests * perGuest) / 10000) * 10000, source: 'Website enquiry', notes: `Functions: ${f.functions.join(', ')}. Budget: ${f.budget}. ${f.notes}` })
    setStep(3)
  }
  return (
    <>
      <PageHero image="amerLake" eyebrow="Weddings & Celebrations" title="The wedding of your ancestors’ dreams" text="Baraats through palace gates, pheras by the lake, sangeets beneath ten thousand lamps." />
      <section className="py-24">
        <div className="container-lux grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <SectionHeading center={false} eyebrow="Our Wedding Atelier" title="Twelve hundred celebrations, and counting" text="From an intimate ceremony for forty to a three-day celebration for eight hundred, our planners, florists, chefs and decorators work as one family — yours." />
            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-kohl/10 pt-8">
              {[['1,200+', 'weddings hosted'], ['800', 'guests, largest venue'], ['6', 'palace settings']].map(([n, l]) => <div key={l}><p className="font-display text-4xl">{n}</p><p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-stone">{l}</p></div>)}
            </div>
          </Reveal>
          <Reveal delay={0.1} className="grid grid-cols-2 gap-4">
            <Img k="rings" w={700} className="aspect-[3/4]" alt="" />
            <Img k="banquet" w={700} className="mt-12 aspect-[3/4]" alt="" />
          </Reveal>
        </div>
      </section>
      <section id="venues" className="scroll-mt-32 bg-sand/50 py-24">
        <div className="container-lux">
          <SectionHeading eyebrow="Venues" title="Where vows are taken" />
          <div className="mt-14 overflow-x-auto bg-ivory">
            <table className="w-full min-w-[640px] text-left">
              <thead><tr className="border-b border-kohl/10 text-[11px] uppercase tracking-[0.2em] text-stone"><th className="p-5">Venue</th><th className="p-5">Palace</th><th className="p-5">Setting</th><th className="p-5 text-right">Capacity</th></tr></thead>
              <tbody>
                {WEDDING_VENUES.map((v) => (
                  <tr key={v.venue} className="border-b border-kohl/5">
                    <td className="flex items-center gap-4 p-4"><Img k={v.image} w={200} h={140} className="h-14 w-20" /><span className="font-display text-xl">{v.venue}</span></td>
                    <td className="p-4 text-stone">{v.hotel}</td>
                    <td className="p-4 text-stone">{v.type}</td>
                    <td className="p-4 text-right font-display text-2xl">{v.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section id="enquire" className="scroll-mt-32 py-24">
        <div className="container-lux max-w-3xl">
          <SectionHeading eyebrow="Enquire" title="Begin planning" text="Three short steps. A dedicated planner will be in touch within a day." />
          <div className="mt-12 bg-white p-8 shadow-[0_30px_80px_-30px_rgba(28,26,23,0.3)] md:p-12">
            {step < 3 && <div className="mb-10 flex gap-2">{[0, 1, 2].map((i) => <span key={i} className={clsx('h-0.5 flex-1', i <= step ? 'bg-sindoor' : 'bg-kohl/10')} />)}</div>}
            {step === 0 && (
              <div className="space-y-8">
                <div>
                  <span className="field-label">Celebration</span>
                  <div className="mt-3 flex flex-wrap gap-2">{['Wedding', 'Social', 'MICE', 'Corporate'].map((t) => <button key={t} onClick={() => setF({ ...f, type: t })} className={clsx('px-4 py-2 text-sm', f.type === t ? 'bg-kohl text-ivory' : 'border border-kohl/15')}>{t === 'MICE' ? 'Conference' : t === 'Social' ? 'Anniversary / Birthday' : t}</button>)}</div>
                </div>
                <label className="block"><span className="field-label">Preferred palace</span><select className="field" value={f.hotelId} onChange={(e) => setF({ ...f, hotelId: e.target.value })}>{HOTELS.map((h) => <option key={h.id} value={h.id}>{h.name}, {h.city}</option>)}</select></label>
                <div className="grid gap-8 md:grid-cols-2">
                  <label><span className="field-label">Date (approx.)</span><input type="date" className="field" value={f.eventDate} onChange={(e) => setF({ ...f, eventDate: e.target.value })} /></label>
                  <label><span className="field-label">Guests: {f.guests}</span><input type="range" min={20} max={800} step={10} value={f.guests} onChange={(e) => setF({ ...f, guests: Number(e.target.value) })} className="mt-4 w-full accent-sindoor" /></label>
                </div>
                <button onClick={() => setStep(1)} className="btn-primary">Continue</button>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <span className="field-label">Functions</span>
                  <div className="mt-3 flex flex-wrap gap-2">{fns.map((x) => { const on = f.functions.includes(x); return <button key={x} onClick={() => setF({ ...f, functions: on ? f.functions.filter((y) => y !== x) : [...f.functions, x] })} className={clsx('flex items-center gap-1.5 px-4 py-2 text-sm', on ? 'bg-sindoor text-ivory' : 'border border-kohl/15')}>{on && <Check size={12} />}{x}</button> })}</div>
                </div>
                <div>
                  <span className="field-label">Approximate budget</span>
                  <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">{['₹50L–1 Crore', '₹1–2 Crore', '₹2–5 Crore', '₹5 Crore+'].map((b) => <button key={b} onClick={() => setF({ ...f, budget: b })} className={clsx('px-3 py-3 text-sm', f.budget === b ? 'bg-kohl text-ivory' : 'border border-kohl/15')}>{b}</button>)}</div>
                </div>
                <label className="block"><span className="field-label">Tell us your dream</span><textarea rows={3} className="field resize-none" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Pheras at sunset by the lake, a Rajasthani folk ensemble for the sangeet…" /></label>
                <div className="flex gap-4"><button onClick={() => setStep(0)} className="btn-outline">Back</button><button onClick={() => setStep(2)} className="btn-primary">Continue</button></div>
              </div>
            )}
            {step === 2 && (
              <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-8">
                <label className="block"><span className="field-label">Your name(s)</span><input required className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ananya & Rohan" /></label>
                <div className="grid gap-8 md:grid-cols-2">
                  <label><span className="field-label">Email</span><input required type="email" className="field" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
                  <label><span className="field-label">Phone</span><input required className="field" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
                </div>
                <div className="flex gap-4"><button type="button" onClick={() => setStep(1)} className="btn-outline">Back</button><button className="btn-primary">Send enquiry</button></div>
              </form>
            )}
            {step === 3 && (
              <div className="py-6 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-leaf text-ivory"><Check /></span>
                <h3 className="mt-6 text-4xl">Thank you, {f.name.split(' ')[0]}</h3>
                <p className="mt-3 text-stone">Your planner will be in touch within 24 hours with ideas, availability and a proposal.</p>
                <Link to="/admin/crm/pipeline" className="btn-dark mt-8">See the lead in the CRM →</Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

export function Circle() {
  const [nights, setNights] = useState(12)
  const [spend, setSpend] = useState(40000)
  const tier = nights >= 25 ? LOYALTY_TIERS[2] : nights >= 10 ? LOYALTY_TIERS[1] : LOYALTY_TIERS[0]
  const points = Math.round(((nights * spend) / 100) * tier.earn)
  return (
    <>
      <PageHero image="roomGold" eyebrow="Virasat Circle" title="Welcome to the family" text="Our loyalty programme rewards the guests who return to us — with recognition, privileges and moments money cannot buy." />
      <section className="py-24">
        <div className="container-lux">
          <SectionHeading eyebrow="Membership tiers" title="The more you return, the more we remember" />
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {LOYALTY_TIERS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.08} className={clsx('flex flex-col p-8', i === 3 ? 'bg-kohl text-ivory' : 'bg-white ring-1 ring-kohl/5')}>
                <p className={clsx('eyebrow', i === 3 && 'text-gold-2')}>{t.nights} nights / year</p>
                <h3 className="mt-3 text-4xl">{t.name}</h3>
                <p className={clsx('mt-1 text-sm', i === 3 ? 'text-ivory/60' : 'text-stone')}>Earn {t.earn} points per ₹100</p>
                <ul className="mt-6 space-y-3 text-sm">{t.perks.map((p) => <li key={p} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-gold" /> {p}</li>)}</ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-sand/50 py-24">
        <div className="container-lux grid items-center gap-16 lg:grid-cols-2">
          <SectionHeading center={false} eyebrow="Points calculator" title="See what your stays could earn" text="Points can be redeemed for free nights, spa rituals, private dining and experiences across all six homes." />
          <div className="bg-white p-8 shadow-xl md:p-10">
            <label className="block"><span className="field-label">Nights per year: {nights}</span><input type="range" min={1} max={60} value={nights} onChange={(e) => setNights(Number(e.target.value))} className="mt-3 w-full accent-sindoor" /></label>
            <label className="mt-8 block"><span className="field-label">Average nightly spend: <Money v={spend} /></span><input type="range" min={15000} max={150000} step={5000} value={spend} onChange={(e) => setSpend(Number(e.target.value))} className="mt-3 w-full accent-sindoor" /></label>
            <div className="mt-10 grid grid-cols-2 gap-6 border-t border-kohl/10 pt-8">
              <div><p className="field-label">Your tier</p><p className="font-display text-4xl text-sindoor">{tier.name}</p></div>
              <div><p className="field-label">Points per year</p><p className="font-display text-4xl">{points.toLocaleString('en-IN')}</p></div>
            </div>
            <p className="mt-4 text-sm text-stone">≈ {Math.floor(points / 30000)} complimentary night{Math.floor(points / 30000) === 1 ? '' : 's'} in a Heritage Room</p>
            <Link to="/my-stays" className="btn-dark mt-8 w-full">Join or sign in</Link>
          </div>
        </div>
      </section>
    </>
  )
}

export function Journal() {
  return (
    <>
      <PageHero image="tajArch" eyebrow="The Journal" title="Stories from the palaces" height="h-[70vh]" />
      <section className="py-24">
        <div className="container-lux">
          <Link to={`/journal/${JOURNAL[0].slug}`} className="group grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <Img k={JOURNAL[0].image} w={1600} className="aspect-[3/2]" zoom alt="" />
            <div>
              <p className="eyebrow">{JOURNAL[0].category} · {JOURNAL[0].read}</p>
              <h2 className="mt-3 text-5xl leading-tight group-hover:text-sindoor">{JOURNAL[0].title}</h2>
              <p className="mt-4 text-lg text-stone">{JOURNAL[0].excerpt}</p>
              <span className="link-lux mt-6">Read the story <ArrowRight size={14} /></span>
            </div>
          </Link>
          <Ornament className="my-20" />
          <div className="grid gap-12 md:grid-cols-3">
            {JOURNAL.slice(1).map((j, i) => (
              <Reveal key={j.slug} delay={i * 0.1}>
                <Link to={`/journal/${j.slug}`} className="group block">
                  <Img k={j.image} w={900} className="aspect-[4/3]" zoom alt="" />
                  <p className="eyebrow mt-5">{j.category} · {j.date}</p>
                  <h3 className="mt-2 text-3xl group-hover:text-sindoor">{j.title}</h3>
                  <p className="mt-2 text-stone">{j.excerpt}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export function Article() {
  const { slug } = useParams()
  const a = JOURNAL.find((j) => j.slug === slug)
  if (!a) return <Navigate to="/journal" replace />
  return (
    <article className="pb-24 pt-[160px]">
      <header className="container-lux max-w-3xl text-center">
        <p className="eyebrow">{a.category} · {a.date} · {a.read} read</p>
        <h1 className="mt-5 text-5xl leading-tight md:text-6xl">{a.title}</h1>
        <p className="mt-6 text-xl text-stone">{a.excerpt}</p>
      </header>
      <Img k={a.image} w={2000} className="container-lux mt-14 aspect-[21/9] !px-0" alt="" />
      <div className="container-lux max-w-2xl">
        {a.body.map((p, i) => <p key={i} className={clsx('mt-8 text-[18px] leading-[1.85] text-kohl/85', i === 0 && 'first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-7xl first-letter:leading-[0.8] first-letter:text-sindoor')}>{p}</p>)}
        <Ornament className="my-16" />
        <div className="flex justify-between"><Link to="/journal" className="link-lux">← All stories</Link><Link to="/book" className="link-lux">Plan your stay →</Link></div>
      </div>
    </article>
  )
}

export function GiftCards() {
  const [amt, setAmt] = useState(25000)
  const [design, setDesign] = useState(0)
  const [to, setTo] = useState('')
  const [msg, setMsg] = useState('With love — for a weekend by the lake.')
  const designs = [['bg-kohl', 'text-gold-2'], ['bg-sindoor', 'text-ivory'], ['bg-peacock', 'text-gold-2']]
  return (
    <div className="pb-24 pt-[160px]">
      <div className="container-lux">
        <SectionHeading eyebrow="Gift Cards" title="Give the gift of a palace" text="Redeemable for stays, dining, spa and experiences at every Virasat home. Delivered instantly by email." />
        <div className="mt-16 grid items-start gap-16 lg:grid-cols-2">
          <div className={clsx('relative aspect-[1.6/1] overflow-hidden p-8 shadow-2xl', designs[design][0])}>
            <div className="jaali-bg absolute inset-0 opacity-20" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between"><Logo light /><Gift className={designs[design][1]} /></div>
              <div>
                <p className={clsx('font-display text-5xl', designs[design][1])}><Money v={amt} /></p>
                <p className="mt-2 text-sm italic text-ivory/80">{msg}</p>
                {to && <p className="mt-1 text-xs uppercase tracking-[0.25em] text-ivory/60">For {to}</p>}
              </div>
            </div>
          </div>
          <div className="space-y-8">
            <div><span className="field-label">Amount</span><div className="mt-3 flex flex-wrap gap-2">{[10000, 25000, 50000, 100000].map((v) => <button key={v} onClick={() => setAmt(v)} className={clsx('px-5 py-3', amt === v ? 'bg-kohl text-ivory' : 'border border-kohl/15')}><Money v={v} /></button>)}</div></div>
            <div><span className="field-label">Design</span><div className="mt-3 flex gap-3">{designs.map((d, i) => <button key={i} aria-label={`Design ${i + 1}`} onClick={() => setDesign(i)} className={clsx('h-12 w-20', d[0], design === i && 'ring-2 ring-gold ring-offset-2')} />)}</div></div>
            <label className="block"><span className="field-label">Recipient name</span><input className="field" value={to} onChange={(e) => setTo(e.target.value)} /></label>
            <label className="block"><span className="field-label">Personal message</span><input className="field" value={msg} onChange={(e) => setMsg(e.target.value)} /></label>
            <button className="btn-primary" onClick={() => alert('Demo: in production this opens the secure payment gateway and emails the card.')}>Purchase gift card</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Contact() {
  const notify = useStore((s) => s.notify)
  const [sent, setSent] = useState(false)
  return (
    <div className="pb-24 pt-[160px]">
      <div className="container-lux">
        <SectionHeading eyebrow="Contact" title="We are at your service" text="Our reservations team is available 24 hours a day, in English, Hindi, French and Japanese." />
        <div className="mt-16 grid gap-16 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-6">
            <div className="bg-kohl p-8 text-ivory">
              <p className="eyebrow text-gold-2">Central reservations</p>
              <p className="mt-4 flex items-center gap-3"><Phone size={16} className="text-gold" /> +91 22 4000 1911</p>
              <p className="mt-2 flex items-center gap-3"><Mail size={16} className="text-gold" /> reservations@virasat.example</p>
              <p className="mt-2 flex items-center gap-3"><MapPin size={16} className="text-gold" /> Virasat House, Colaba, Mumbai</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {HOTELS.map((h) => <div key={h.id} className="border border-kohl/10 p-5"><p className="font-display text-xl">{h.name}</p><p className="text-xs text-stone">{h.phone}</p></div>)}
            </div>
          </div>
          <div className="bg-white p-8 ring-1 ring-kohl/5 md:p-12">
            {sent ? <p className="py-16 text-center font-display text-3xl">Thank you. We will reply within a few hours.</p> : (
              <form onSubmit={(e) => { e.preventDefault(); notify('system', 'New contact form enquiry'); setSent(true) }} className="grid gap-8 md:grid-cols-2">
                <label><span className="field-label">Name</span><input required className="field" /></label>
                <label><span className="field-label">Email</span><input required type="email" className="field" /></label>
                <label className="md:col-span-2"><span className="field-label">Subject</span><select className="field"><option>Reservations</option><option>Weddings & events</option><option>Feedback</option><option>Press</option><option>Careers</option></select></label>
                <label className="md:col-span-2"><span className="field-label">Message</span><textarea required rows={5} className="field resize-none" /></label>
                <button className="btn-primary md:col-span-2">Send message</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ManageBooking() {
  const { bookings, guests, cancelBooking, updateBooking } = useStore()
  const [ref, setRef] = useState('')
  const [email, setEmail] = useState('')
  const [found, setFound] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const b = bookings.find((x) => x.id === found)
  const g = b && guests.find((x) => x.id === b.guestId)
  const [req, setReq] = useState('')
  const lookup = (e: React.FormEvent) => {
    e.preventDefault()
    const m = bookings.find((x) => x.ref.toUpperCase() === ref.trim().toUpperCase())
    const mg = m && guests.find((x) => x.id === m.guestId)
    if (!m || !mg || mg.email.toLowerCase() !== email.trim().toLowerCase()) { setErr('We could not find a booking with those details.'); return }
    setErr(''); setFound(m.id); setReq(m.specialRequests ?? '')
  }
  const lastRef = useStore((s) => s.lastRef)
  const hint = lastRef && bookings.find((x) => x.ref === lastRef)
  const hintEmail = hint && guests.find((x) => x.id === hint.guestId)?.email
  return (
    <div className="pb-24 pt-[160px]">
      <div className="container-lux max-w-3xl">
        <SectionHeading eyebrow="Manage booking" title="Your reservation" />
        {!b ? (
          <form onSubmit={lookup} className="mt-12 grid gap-8 bg-white p-8 ring-1 ring-kohl/5 md:grid-cols-2 md:p-12">
            <label><span className="field-label">Confirmation number</span><input className="field uppercase" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="VRXXXXXX" /></label>
            <label><span className="field-label">Email</span><input type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            {err && <p className="text-sm text-sindoor md:col-span-2">{err}</p>}
            <button className="btn-dark md:col-span-2">Find booking</button>
            {hint && <button type="button" onClick={() => { setRef(hint.ref); setEmail(hintEmail ?? '') }} className="text-left text-xs text-peacock md:col-span-2">Demo: use your last booking ({hint.ref})</button>}
          </form>
        ) : (
          <div className="mt-12 bg-white p-8 ring-1 ring-kohl/5 md:p-12">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{b.ref}</p>
                <h2 className="mt-2 text-3xl">{hotelById(b.hotelId).name}</h2>
                <p className="text-stone">{roomTypeById(b.roomTypeId).name} · {fmtDate(b.checkIn)} – {fmtDate(b.checkOut)} · {g?.firstName} {g?.lastName}</p>
              </div>
              <span className={clsx('px-3 py-1 text-xs uppercase tracking-wider', b.status === 'cancelled' ? 'bg-sindoor/10 text-sindoor' : 'bg-leaf/15 text-leaf')}>{b.status}</span>
            </div>
            {b.status === 'confirmed' && (
              <>
                <label className="mt-8 block"><span className="field-label">Special requests</span><textarea rows={3} className="field resize-none" value={req} onChange={(e) => setReq(e.target.value)} /></label>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={() => updateBooking(b.id, { specialRequests: req })} className="btn-dark">Save requests</button>
                  <Link to={`/booking/${b.ref}`} className="btn-outline">View confirmation</Link>
                  {RATE_PLANS.find((p) => p.id === b.ratePlanId)?.refundable ? (
                    <button onClick={() => { if (confirm('Cancel this reservation? This cannot be undone.')) cancelBooking(b.id) }} className="btn text-sindoor hover:bg-sindoor/5">Cancel booking</button>
                  ) : <p className="self-center text-xs text-stone">Advance Purchase — non‑refundable</p>}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function MyStays() {
  const { guests, bookings, updateGuest } = useStore()
  const [email, setEmail] = useState('')
  const [gid, setGid] = useState<string | null>(null)
  const g = guests.find((x) => x.id === gid)
  const stats = useMemo(() => guestStats(bookings), [bookings])
  const mine = bookings.filter((b) => b.guestId === gid).sort((a, b) => b.checkIn.localeCompare(a.checkIn))
  const demo = guests.find((x) => x.tier === 'Platinum')
  const next = { Member: ['Silver', 3], Silver: ['Gold', 10], Gold: ['Platinum', 25], Platinum: ['Maharaja', 40], Maharaja: ['Maharaja', 40] } as const
  return (
    <div className="pb-24 pt-[160px]">
      <div className="container-lux max-w-5xl">
        {!g ? (
          <>
            <SectionHeading eyebrow="Virasat Circle" title="My stays" text="Sign in with the email you booked with." />
            <form onSubmit={(e) => { e.preventDefault(); const m = guests.find((x) => x.email.toLowerCase() === email.toLowerCase()); if (m) setGid(m.id); else alert('No member found — try the demo account below.') }} className="mx-auto mt-12 flex max-w-lg flex-col gap-6 bg-white p-8 ring-1 ring-kohl/5">
              <label><span className="field-label">Email</span><input type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <button className="btn-dark">Send magic link</button>
              {demo && <button type="button" onClick={() => setGid(demo.id)} className="text-xs text-peacock">Demo: sign in as {demo.firstName} {demo.lastName} (Platinum)</button>}
            </form>
          </>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
              <div className="relative overflow-hidden bg-kohl p-8 text-ivory">
                <div className="jaali-bg absolute inset-0 opacity-10" />
                <div className="relative">
                  <p className="eyebrow text-gold-2">Virasat Circle · {g.tier}</p>
                  <h1 className="mt-3 text-5xl">Namaste, {g.firstName}</h1>
                  <div className="mt-8 grid grid-cols-3 gap-6">
                    <div><p className="font-display text-4xl text-gold-2">{g.points.toLocaleString('en-IN')}</p><p className="text-[10px] uppercase tracking-widest text-ivory/60">Points</p></div>
                    <div><p className="font-display text-4xl">{stats.get(g.id)?.stays ?? 0}</p><p className="text-[10px] uppercase tracking-widest text-ivory/60">Stays</p></div>
                    <div><p className="font-display text-4xl">{stats.get(g.id)?.nights ?? 0}</p><p className="text-[10px] uppercase tracking-widest text-ivory/60">Nights</p></div>
                  </div>
                  {g.tier !== 'Maharaja' && (
                    <div className="mt-8">
                      <div className="h-1 bg-ivory/15"><div className="h-1 bg-gold" style={{ width: `${Math.min(100, ((stats.get(g.id)?.nights ?? 0) / next[g.tier][1]) * 100)}%` }} /></div>
                      <p className="mt-2 text-xs text-ivory/60">{Math.max(0, next[g.tier][1] - (stats.get(g.id)?.nights ?? 0))} nights to {next[g.tier][0]}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white p-8 ring-1 ring-kohl/5">
                <p className="eyebrow">My preferences</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Feather pillow', 'High floor', 'Vegetarian', 'Twin beds', 'Quiet room', 'Late checkout', 'Masala chai on arrival'].map((p) => {
                    const on = g.preferences.includes(p)
                    return <button key={p} onClick={() => updateGuest(g.id, { preferences: on ? g.preferences.filter((x) => x !== p) : [...g.preferences, p] })} className={clsx('px-3 py-1.5 text-xs', on ? 'bg-peacock text-ivory' : 'border border-kohl/15')}>{p}</button>
                  })}
                </div>
                <p className="mt-4 text-xs text-stone">Saved preferences are shared with every Virasat home before you arrive.</p>
              </div>
            </div>
            <h2 className="mt-14 text-3xl">Your journeys</h2>
            <div className="mt-6 space-y-4">
              {mine.length === 0 && <p className="text-stone">No stays yet — <Link to="/book" className="text-sindoor">plan your first</Link>.</p>}
              {mine.map((b) => (
                <div key={b.id} className="grid items-center gap-4 bg-white p-4 ring-1 ring-kohl/5 sm:grid-cols-[120px_1fr_auto]">
                  <Img k={hotelById(b.hotelId).hero} w={300} className="aspect-[4/3]" />
                  <div>
                    <p className="font-display text-xl">{hotelById(b.hotelId).name}</p>
                    <p className="text-sm text-stone">{roomTypeById(b.roomTypeId).name} · {fmtDate(b.checkIn)} · {nightsBetween(b.checkIn, b.checkOut)} nights</p>
                  </div>
                  <div className="text-right">
                    <Money v={b.total} className="font-display text-xl" />
                    <p className="text-xs capitalize text-stone">{b.status}</p>
                    {b.status === 'checked-out' && <button onClick={() => alert('Demo: downloads a GST invoice PDF')} className="text-xs text-peacock">Invoice</button>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
