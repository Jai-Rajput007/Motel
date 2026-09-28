import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { parseISO } from 'date-fns'
import { ArrowLeft, Building2, Check, CreditCard, Landmark, Lock, ShieldCheck, Smartphone, Tag } from 'lucide-react'
import clsx from 'clsx'
import { HOTELS, hotelById } from '../../data/hotels'
import { ADD_ONS, RATE_PLANS } from '../../data/content'
import { availability, nightlyRate, quote } from '../../lib/pricing'
import { addDaysISO, fmtDate, nightsBetween, todayISO } from '../../lib/utils'
import { useStore } from '../../store/useStore'
import RangeCalendar from '../../components/ui/RangeCalendar'
import { Stepper } from '../../components/guest/BookingBar'
import { Img, Money } from '../../components/ui/primitives'

const STEPS = ['Dates', 'Room & rate', 'Enhance', 'Details', 'Payment']

export default function Book() {
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { bookings, rooms, rateOverrides, stopSell, createBooking } = useStore()
  const [hotelId, setHotelId] = useState(sp.get('hotel') ?? '')
  const [ci, setCi] = useState<string | null>(sp.get('in') ?? addDaysISO(todayISO(), 14))
  const [co, setCo] = useState<string | null>(sp.get('out') ?? addDaysISO(todayISO(), 17))
  const [adults, setAdults] = useState(Number(sp.get('adults') ?? 2))
  const [children, setChildren] = useState(Number(sp.get('children') ?? 0))
  const [roomTypeId, setRoomTypeId] = useState(sp.get('room') ?? '')
  const [planId, setPlanId] = useState('bb')
  const [addOns, setAddOns] = useState<string[]>([])
  const [promo, setPromo] = useState(sp.get('promo') ?? '')
  const [promoInput, setPromoInput] = useState(sp.get('promo') ?? '')
  const [step, setStep] = useState(sp.get('hotel') && sp.get('in') ? 1 : 0)
  const [guest, setGuest] = useState({ title: 'Mr', firstName: '', lastName: '', email: '', phone: '', country: 'India', city: '', requests: '', arrival: '14:00', company: '', gstin: '', occasion: '' })
  const [pay, setPay] = useState<'card' | 'upi' | 'netbanking' | 'hotel'>('card')
  const [card, setCard] = useState({ number: '4111 1111 1111 1111', name: '', exp: '12/28', cvv: '123' })
  const [processing, setProcessing] = useState(false)
  const [err, setErr] = useState('')

  const hotel = hotelId ? hotelById(hotelId) : null
  const roomType = hotel?.roomTypes.find((r) => r.id === roomTypeId)
  const q = useMemo(() => (roomType && ci && co ? quote({ roomTypeId: roomType.id, checkIn: ci, checkOut: co, ratePlanId: planId, addOns, adults, children, promo, overrides: rateOverrides }) : null), [roomType, ci, co, planId, addOns, adults, children, promo, rateOverrides])
  const nights = ci && co ? nightsBetween(ci, co) : 0
  const plan = RATE_PLANS.find((p) => p.id === planId)!
  const minPrice = (d: string) => (hotel ? Math.min(...hotel.roomTypes.map((r) => nightlyRate(r.id, parseISO(d), rateOverrides))) : null)

  const validDetails = guest.firstName && guest.lastName && /\S+@\S+\.\S+/.test(guest.email) && guest.phone.length >= 8
  const next = () => { setErr(''); setStep((s) => s + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const confirm = () => {
    if (!hotel || !roomType || !ci || !co) return
    setProcessing(true)
    setTimeout(() => {
      const b = createBooking({
        hotelId: hotel.id, roomTypeId: roomType.id, checkIn: ci, checkOut: co, adults, children, ratePlanId: planId, addOns, promo,
        guest: { firstName: guest.firstName, lastName: guest.lastName, email: guest.email, phone: guest.phone, country: guest.country, city: guest.city, company: guest.company || undefined },
        specialRequests: [guest.requests, guest.occasion && `Occasion: ${guest.occasion}`].filter(Boolean).join(' · '), arrival: guest.arrival, payNow: pay !== 'hotel',
      })
      setProcessing(false)
      if (!b) { setErr('Sorry — that room was just booked by another guest. Please choose another.'); setStep(1); return }
      nav(`/booking/${b.ref}`)
    }, 1600)
  }

  return (
    <div className="min-h-screen bg-ivory pb-24 pt-[120px]">
      <div className="border-b border-kohl/10 bg-white/60">
        <div className="container-lux flex flex-wrap items-center justify-between gap-4 py-5">
          <h1 className="text-3xl">Reserve your stay</h1>
          <ol className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <button disabled={i > step} onClick={() => setStep(i)} className={clsx('flex items-center gap-2', i === step ? 'text-sindoor' : i < step ? 'text-kohl' : 'text-stone/50')}>
                  <span className={clsx('grid h-6 w-6 place-items-center rounded-full border text-[10px]', i < step ? 'border-kohl bg-kohl text-ivory' : i === step ? 'border-sindoor' : 'border-stone/30')}>{i < step ? <Check size={11} /> : i + 1}</span>
                  <span className="hidden sm:inline">{s}</span>
                </button>
                {i < STEPS.length - 1 && <span className="h-px w-5 bg-kohl/20" />}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="container-lux mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          {err && <p className="mb-6 border-l-2 border-sindoor bg-sindoor/5 p-4 text-sm text-sindoor">{err}</p>}
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              {step === 0 && (
                <div className="space-y-10">
                  <div>
                    <h2 className="text-3xl">Where would you like to stay?</h2>
                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                      {HOTELS.map((h) => (
                        <button key={h.id} onClick={() => setHotelId(h.id)} className={clsx('group relative text-left ring-offset-4 ring-offset-ivory transition', hotelId === h.id && 'ring-2 ring-sindoor')}>
                          <Img k={h.hero} w={600} h={420} className="aspect-[3/2]" zoom alt={h.name} />
                          <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-gold">{h.city}</p>
                          <p className="font-display text-lg leading-tight">{h.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-10 md:grid-cols-[1fr_260px]">
                    <div className="bg-white p-6 ring-1 ring-kohl/5">
                      <p className="eyebrow mb-4">Dates {hotel && '· lowest nightly rate shown'}</p>
                      <RangeCalendar checkIn={ci} checkOut={co} onChange={(a, b) => { setCi(a); setCo(b) }} priceFor={hotel ? minPrice : undefined} />
                    </div>
                    <div className="bg-white p-6 ring-1 ring-kohl/5">
                      <p className="eyebrow mb-2">Guests</p>
                      <Stepper label="Adults" value={adults} set={setAdults} min={1} max={4} />
                      <Stepper label="Children" sub="0–12 years" value={children} set={setChildren} max={3} />
                    </div>
                  </div>
                  <button disabled={!hotel || !ci || !co} onClick={next} className="btn-primary disabled:opacity-40">See rooms & rates</button>
                </div>
              )}

              {step === 1 && hotel && ci && co && (
                <div>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="eyebrow">{hotel.name}, {hotel.city}</p>
                      <h2 className="mt-2 text-3xl">{fmtDate(ci, 'EEE d MMM')} — {fmtDate(co, 'EEE d MMM')} · {nights} night{nights > 1 && 's'}</h2>
                    </div>
                    <button onClick={() => setStep(0)} className="link-lux">Change search</button>
                  </div>
                  <div className="mt-8 space-y-8">
                    {hotel.roomTypes.map((r) => {
                      const avail = availability(r.id, ci, co, bookings, rooms, stopSell)
                      const fits = r.maxGuests >= adults + children
                      return (
                        <div key={r.id} className={clsx('grid bg-white ring-1 ring-kohl/5 md:grid-cols-[300px_1fr]', (!avail || !fits) && 'opacity-60')}>
                          <Img k={r.images[0]} w={700} className="aspect-[4/3] h-full md:aspect-auto" alt={r.name} />
                          <div className="p-6">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="text-2xl">{r.name}</h3>
                                <p className="mt-1 text-sm text-stone">{r.size} m² · {r.bed} · {r.view} view · up to {r.maxGuests}</p>
                              </div>
                              {avail > 0 && avail <= 3 && fits && <span className="bg-sindoor/10 px-3 py-1 text-xs text-sindoor">Only {avail} left</span>}
                            </div>
                            {!fits ? <p className="mt-4 text-sm text-sindoor">This room accommodates up to {r.maxGuests} guests.</p> : avail === 0 ? <p className="mt-4 text-sm text-sindoor">Sold out for your dates.</p> : (
                              <div className="mt-5 divide-y divide-kohl/10 border-t border-kohl/10">
                                {RATE_PLANS.map((p) => {
                                  const pq = quote({ roomTypeId: r.id, checkIn: ci, checkOut: co, ratePlanId: p.id, addOns: [], adults, children, promo, overrides: rateOverrides })
                                  return (
                                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                                      <div className="max-w-sm">
                                        <p className="font-medium">{p.name} {!p.refundable && <span className="ml-2 bg-gold/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#8a6a36]">Save 15%</span>}</p>
                                        <p className="text-xs text-stone">{p.includes.join(' · ')}</p>
                                      </div>
                                      <div className="flex items-center gap-5">
                                        <div className="text-right">
                                          {pq.discount > 0 && <p className="text-xs text-stone line-through"><Money v={pq.roomTotal} /></p>}
                                          <Money v={pq.roomTotal - pq.discount} className="font-display text-2xl" />
                                          <p className="text-[11px] text-stone">{nights} nights · excl. taxes</p>
                                        </div>
                                        <button onClick={() => { setRoomTypeId(r.id); setPlanId(p.id); next() }} className="btn-dark px-5 py-3">Select</button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="text-3xl">Enhance your stay</h2>
                  <p className="mt-2 text-stone">Thoughtful additions, arranged before you arrive.</p>
                  <div className="mt-8 grid gap-4 md:grid-cols-2">
                    {ADD_ONS.map((a) => {
                      const on = addOns.includes(a.id)
                      return (
                        <button key={a.id} onClick={() => setAddOns(on ? addOns.filter((x) => x !== a.id) : [...addOns, a.id])} className={clsx('flex items-start gap-4 bg-white p-5 text-left ring-1 transition', on ? 'ring-2 ring-sindoor' : 'ring-kohl/5 hover:ring-kohl/20')}>
                          <span className={clsx('mt-1 grid h-5 w-5 shrink-0 place-items-center border', on ? 'border-sindoor bg-sindoor text-ivory' : 'border-kohl/30')}>{on && <Check size={12} />}</span>
                          <span className="flex-1">
                            <span className="block font-medium">{a.name}</span>
                            <span className="block text-sm text-stone">{a.description}</span>
                          </span>
                          <span className="text-right"><Money v={a.price} className="font-display text-xl" /><span className="block text-[11px] text-stone">per {a.per}</span></span>
                        </button>
                      )
                    })}
                  </div>
                  <button onClick={next} className="btn-primary mt-10">Continue to guest details</button>
                </div>
              )}

              {step === 3 && (
                <div className="bg-white p-6 ring-1 ring-kohl/5 md:p-10">
                  <h2 className="text-3xl">Guest details</h2>
                  <div className="mt-8 grid gap-6 md:grid-cols-[120px_1fr_1fr]">
                    <label><span className="field-label">Title</span><select className="field" value={guest.title} onChange={(e) => setGuest({ ...guest, title: e.target.value })}>{['Mr', 'Ms', 'Mrs', 'Dr'].map((t) => <option key={t}>{t}</option>)}</select></label>
                    <label><span className="field-label">First name *</span><input className="field" value={guest.firstName} onChange={(e) => setGuest({ ...guest, firstName: e.target.value })} /></label>
                    <label><span className="field-label">Last name *</span><input className="field" value={guest.lastName} onChange={(e) => setGuest({ ...guest, lastName: e.target.value })} /></label>
                  </div>
                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <label><span className="field-label">Email *</span><input type="email" className="field" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} /></label>
                    <label><span className="field-label">Mobile (WhatsApp) *</span><input className="field" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} placeholder="+91" /></label>
                    <label><span className="field-label">Country of residence</span><input className="field" value={guest.country} onChange={(e) => setGuest({ ...guest, country: e.target.value })} /></label>
                    <label><span className="field-label">City</span><input className="field" value={guest.city} onChange={(e) => setGuest({ ...guest, city: e.target.value })} /></label>
                    <label><span className="field-label">Estimated arrival</span><select className="field" value={guest.arrival} onChange={(e) => setGuest({ ...guest, arrival: e.target.value })}>{['09:00', '11:00', '14:00', '16:00', '18:00', '21:00', 'After 22:00'].map((t) => <option key={t}>{t}</option>)}</select></label>
                    <label><span className="field-label">Celebrating an occasion?</span><select className="field" value={guest.occasion} onChange={(e) => setGuest({ ...guest, occasion: e.target.value })}>{['', 'Birthday', 'Anniversary', 'Honeymoon', 'Proposal', 'Business'].map((t) => <option key={t} value={t}>{t || 'None'}</option>)}</select></label>
                  </div>
                  <label className="mt-6 block"><span className="field-label">Special requests</span><textarea rows={3} className="field resize-none" value={guest.requests} onChange={(e) => setGuest({ ...guest, requests: e.target.value })} placeholder="Dietary preferences, bed type, accessibility needs…" /></label>
                  <details className="mt-6">
                    <summary className="cursor-pointer text-sm text-peacock">Booking for business? Add GST details</summary>
                    <div className="mt-4 grid gap-6 md:grid-cols-2">
                      <label><span className="field-label">Company name</span><input className="field" value={guest.company} onChange={(e) => setGuest({ ...guest, company: e.target.value })} /></label>
                      <label><span className="field-label">GSTIN</span><input className="field uppercase" value={guest.gstin} onChange={(e) => setGuest({ ...guest, gstin: e.target.value })} placeholder="27AAAAA0000A1Z5" /></label>
                    </div>
                  </details>
                  <button disabled={!validDetails} onClick={next} className="btn-primary mt-10 disabled:opacity-40">Continue to payment</button>
                  {!validDetails && <p className="mt-3 text-xs text-stone">Please complete the required fields (*) to continue.</p>}
                </div>
              )}

              {step === 4 && (
                <div className="bg-white p-6 ring-1 ring-kohl/5 md:p-10">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl">Payment</h2>
                    <span className="flex items-center gap-2 bg-gold/15 px-3 py-1 text-[11px] uppercase tracking-wider text-[#8a6a36]"><ShieldCheck size={13} /> Demo — test mode</span>
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {([['card', 'Card', CreditCard], ['upi', 'UPI', Smartphone], ['netbanking', 'Net banking', Landmark], ['hotel', 'Pay at hotel', Building2]] as const).map(([id, label, Icon]) => (
                      <button key={id} disabled={id === 'hotel' && !plan.refundable} onClick={() => setPay(id)} className={clsx('flex flex-col items-center gap-2 border p-4 text-sm transition disabled:opacity-30', pay === id ? 'border-sindoor bg-sindoor/5' : 'border-kohl/15 hover:border-kohl/40')}>
                        <Icon size={20} /> {label}
                      </button>
                    ))}
                  </div>
                  {pay === 'card' && (
                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                      <label className="md:col-span-2"><span className="field-label">Card number</span><input className="field font-mono" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} /></label>
                      <label className="md:col-span-2"><span className="field-label">Name on card</span><input className="field" value={card.name || `${guest.firstName} ${guest.lastName}`} onChange={(e) => setCard({ ...card, name: e.target.value })} /></label>
                      <label><span className="field-label">Expiry</span><input className="field font-mono" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} /></label>
                      <label><span className="field-label">CVV</span><input className="field font-mono" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} /></label>
                    </div>
                  )}
                  {pay === 'upi' && <label className="mt-8 block"><span className="field-label">UPI ID</span><input className="field" defaultValue={`${guest.firstName.toLowerCase() || 'guest'}@okbank`} /></label>}
                  {pay === 'netbanking' && <label className="mt-8 block"><span className="field-label">Bank</span><select className="field">{['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra'].map((b) => <option key={b}>{b}</option>)}</select></label>}
                  {pay === 'hotel' && <p className="mt-8 text-sm text-stone">Your card will only be used to guarantee the reservation. Payment is taken on departure.</p>}
                  <p className="mt-8 text-xs leading-relaxed text-stone">
                    {plan.refundable ? 'Free cancellation until 48 hours before arrival; thereafter one night is charged.' : 'Advance Purchase rates are non‑refundable and non‑changeable.'} By confirming you agree to our booking terms and privacy policy.
                  </p>
                  <button onClick={confirm} disabled={processing} className="btn-primary mt-8 w-full md:w-auto">
                    <Lock size={14} /> {processing ? 'Securing your reservation…' : q ? <>Confirm & {pay === 'hotel' ? 'guarantee' : 'pay'} <Money v={q.total} /></> : 'Confirm'}
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          {step > 0 && <button onClick={() => setStep(step - 1)} className="link-lux mt-8"><ArrowLeft size={14} /> Back</button>}
        </div>

        <aside className="lg:sticky lg:top-36 lg:self-start">
          <div className="bg-kohl p-6 text-ivory">
            <p className="eyebrow text-gold-2">Your stay</p>
            {hotel ? (
              <>
                <p className="mt-3 font-display text-2xl">{hotel.name}</p>
                <p className="text-sm text-ivory/60">{hotel.city}, {hotel.state}</p>
              </>
            ) : <p className="mt-3 text-ivory/60">Select a palace to begin</p>}
            <div className="mt-5 space-y-2 border-t border-ivory/10 pt-5 text-sm">
              {ci && co && <p className="flex justify-between"><span className="text-ivory/60">Dates</span><span>{fmtDate(ci, 'd MMM')} – {fmtDate(co, 'd MMM yyyy')}</span></p>}
              <p className="flex justify-between"><span className="text-ivory/60">Guests</span><span>{adults} adults{children ? `, ${children} children` : ''}</span></p>
              {roomType && <p className="flex justify-between"><span className="text-ivory/60">Room</span><span>{roomType.name}</span></p>}
              {roomType && <p className="flex justify-between"><span className="text-ivory/60">Rate</span><span>{plan.name}</span></p>}
            </div>
            {q && (
              <div className="mt-5 space-y-2 border-t border-ivory/10 pt-5 text-sm">
                <details>
                  <summary className="flex cursor-pointer justify-between"><span className="text-ivory/60">Room · {q.n} nights</span><Money v={q.roomTotal} /></summary>
                  <div className="mt-2 space-y-1 pl-3 text-xs text-ivory/50">{q.nights.map((n) => <p key={n.date} className="flex justify-between"><span>{fmtDate(n.date, 'EEE d MMM')}</span><Money v={n.rate} /></p>)}</div>
                </details>
                {q.addOnTotal > 0 && <p className="flex justify-between"><span className="text-ivory/60">Enhancements</span><Money v={q.addOnTotal} /></p>}
                {q.discount > 0 && <p className="flex justify-between text-gold-2"><span>Promo {promo}</span><span>−<Money v={q.discount} /></span></p>}
                <p className="flex justify-between"><span className="text-ivory/60">GST (18%)</span><Money v={q.tax} /></p>
                <p className="flex items-baseline justify-between border-t border-ivory/10 pt-3"><span>Total</span><Money v={q.total} className="font-display text-3xl text-gold-2" /></p>
                <p className="text-xs text-ivory/50">Earn {Math.round(q.roomTotal / 100) * 5} Virasat Circle points</p>
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); setPromo(promoInput.trim().toUpperCase()) }} className="mt-5 flex border-b border-ivory/30">
              <Tag size={14} className="mt-3 text-gold" />
              <input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Promo code (try VIRASAT10)" className="w-full bg-transparent px-3 py-2 text-sm uppercase outline-none placeholder:normal-case placeholder:text-ivory/40" />
              <button className="text-[11px] uppercase tracking-widest text-gold-2">Apply</button>
            </form>
            {q?.promoError && <p className="mt-2 text-xs text-[#f2b3a6]">{q.promoError}</p>}
            {q?.promoValid && <p className="mt-2 text-xs text-gold-2">✓ {q.promoLabel}</p>}
          </div>
          <div className="mt-4 space-y-2 bg-sand/60 p-5 text-xs text-stone">
            <p className="flex items-center gap-2"><ShieldCheck size={14} className="text-peacock" /> Best rate guaranteed when you book direct</p>
            <p className="flex items-center gap-2"><Check size={14} className="text-peacock" /> Complimentary welcome ritual & Wi‑Fi</p>
            <p className="flex items-center gap-2"><Lock size={14} className="text-peacock" /> Secure, encrypted checkout</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
