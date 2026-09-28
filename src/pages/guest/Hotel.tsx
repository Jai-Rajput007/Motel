import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { addDays } from 'date-fns'
import { ArrowRight, BedDouble, Check, Eye, MapPin, Maximize2, Phone, Users } from 'lucide-react'
import { HOTELS, hotelBySlug } from '../../data/hotels'
import { nightlyRate } from '../../lib/pricing'
import { useStore } from '../../store/useStore'
import PageHero from '../../components/guest/PageHero'
import BookingBar from '../../components/guest/BookingBar'
import Lightbox from '../../components/ui/Lightbox'
import { Img, Money, Ornament, Reveal, SectionHeading, Stars } from '../../components/ui/primitives'
import { fmtDate } from '../../lib/utils'

const IndiaMap = lazy(() => import('../../components/ui/IndiaMap'))

export function fromRate(roomTypeId: string, overrides?: Record<string, number>) {
  let min = Infinity
  for (let i = 3; i < 45; i++) min = Math.min(min, nightlyRate(roomTypeId, addDays(new Date(), i), overrides))
  return min
}

export default function HotelPage() {
  const { slug } = useParams()
  const hotel = hotelBySlug(slug ?? '')
  const reviews = useStore((s) => s.reviews)
  const overrides = useStore((s) => s.rateOverrides)
  const [lb, setLb] = useState<number | null>(null)
  const hotelReviews = useMemo(() => reviews.filter((r) => r.hotelId === hotel?.id && r.rating >= 4).slice(0, 3), [reviews, hotel])
  if (!hotel) return <Navigate to="/destinations" replace />
  const gallery = [...hotel.gallery, ...hotel.roomTypes.flatMap((r) => r.images)].filter((v, i, a) => a.indexOf(v) === i)
  const others = HOTELS.filter((h) => h.id !== hotel.id).slice(0, 3)

  return (
    <>
      <PageHero image={hotel.hero} eyebrow={`${hotel.city}, ${hotel.state} · Since ${hotel.established}`} title={hotel.name} text={hotel.tagline} height="h-[92vh]" />
      <nav className="sticky top-[84px] z-30 hidden border-b border-kohl/10 bg-ivory/95 backdrop-blur lg:top-[120px] md:block">
        <div className="container-lux flex h-14 items-center justify-between">
          <div className="flex gap-8 text-[11px] uppercase tracking-[0.22em]">
            {['Overview', 'Rooms', 'Dining', 'Experiences', 'Gallery', 'Location'].map((s) => <a key={s} href={`#${s.toLowerCase()}`} className="hover:text-sindoor">{s}</a>)}
          </div>
          <Link to={`/book?hotel=${hotel.id}`} className="text-[11px] uppercase tracking-[0.22em] text-sindoor">Book {hotel.name} →</Link>
        </div>
      </nav>

      <section id="overview" className="scroll-mt-40 py-24">
        <div className="container-lux grid gap-16 lg:grid-cols-[1.1fr_1fr]">
          <Reveal>
            <p className="eyebrow mb-5">{hotel.type}</p>
            <h2 className="text-4xl leading-tight md:text-5xl">{hotel.intro}</h2>
            <p className="mt-8 text-[17px] leading-relaxed text-stone first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-7xl first-letter:leading-[0.8] first-letter:text-sindoor">{hotel.story}</p>
            <div className="mt-10 flex flex-wrap items-center gap-8 border-t border-kohl/10 pt-8">
              <div><Stars n={hotel.rating} /><p className="mt-1 text-sm"><b className="font-medium">{hotel.rating}</b> · {hotel.reviews.toLocaleString()} reviews</p></div>
              <div><p className="font-display text-3xl">{hotel.roomTypes.reduce((a, r) => a + r.count, 0)}</p><p className="text-[11px] uppercase tracking-widest text-stone">Rooms & suites</p></div>
              <div><p className="font-display text-3xl">{hotel.established}</p><p className="text-[11px] uppercase tracking-widest text-stone">Built</p></div>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="relative">
              <Img k={hotel.gallery[1]} w={1200} className="arch aspect-[4/5]" alt="" />
              <div className="absolute -bottom-8 -left-8 hidden w-64 bg-kohl p-7 text-ivory md:block">
                <p className="eyebrow mb-4 text-gold-2">Highlights</p>
                <ul className="space-y-3 text-sm">
                  {hotel.highlights.map((h) => <li key={h} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-gold" />{h}</li>)}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="px-5 md:px-10"><BookingBar hotelId={hotel.id} /></div>

      <section id="rooms" className="scroll-mt-40 py-28">
        <div className="container-lux">
          <SectionHeading eyebrow="Rooms & Suites" title="Chambers of quiet grandeur" text="Every room is individually restored — no two are quite alike." />
          <div className="mt-16 space-y-20">
            {hotel.roomTypes.map((r, i) => (
              <Reveal key={r.id}>
                <div className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                  <Link to={`/hotels/${hotel.slug}/rooms/${r.id}`} className="group block"><Img k={r.images[0]} w={1400} className="aspect-[3/2]" zoom alt={r.name} /></Link>
                  <div className="lg:px-8">
                    <p className="eyebrow">{r.category}</p>
                    <h3 className="mt-3 text-4xl">{r.name}</h3>
                    <p className="mt-4 text-stone">{r.description}</p>
                    <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-kohl/80">
                      <span className="flex items-center gap-2"><Maximize2 size={15} className="text-gold" /> {r.size} m²</span>
                      <span className="flex items-center gap-2"><BedDouble size={15} className="text-gold" /> {r.bed}</span>
                      <span className="flex items-center gap-2"><Eye size={15} className="text-gold" /> {r.view}</span>
                      <span className="flex items-center gap-2"><Users size={15} className="text-gold" /> Up to {r.maxGuests} guests</span>
                    </div>
                    <div className="mt-8 flex flex-wrap items-center justify-between gap-6 border-t border-kohl/10 pt-6">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-stone">From, per night</p>
                        <Money v={fromRate(r.id, overrides)} className="font-display text-3xl" />
                      </div>
                      <div className="flex gap-4">
                        <Link to={`/hotels/${hotel.slug}/rooms/${r.id}`} className="link-lux">Details</Link>
                        <Link to={`/book?hotel=${hotel.id}&room=${r.id}`} className="btn-dark">Book</Link>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="dining" className="scroll-mt-40 bg-kohl py-28 text-ivory">
        <div className="container-lux">
          <SectionHeading light eyebrow="Dining" title="At the table" />
          <div className="mt-16 grid gap-10 md:grid-cols-2">
            {hotel.dining.map((d, i) => (
              <Reveal key={d.name} delay={i * 0.12}>
                <Img k={d.image} w={1200} className="aspect-[3/2]" alt={d.name} />
                <p className="eyebrow mt-6 text-gold-2">{d.cuisine}</p>
                <h3 className="mt-2 text-3xl">{d.name}</h3>
                <p className="mt-3 text-ivory/70">{d.description}</p>
                <p className="mt-3 text-xs uppercase tracking-widest text-ivory/50">{d.hours}</p>
                <Link to={`/dining?venue=${encodeURIComponent(d.name)}&hotel=${hotel.id}#reserve`} className="btn-ghost-light mt-6">Reserve a table</Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="experiences" className="scroll-mt-40 py-28">
        <div className="container-lux">
          <SectionHeading eyebrow="Experiences" title={`Only at ${hotel.name}`} />
          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {hotel.experiences.map((e) => (
              <Reveal key={e.id} className="group grid gap-6 bg-sand/60 p-5 sm:grid-cols-[200px_1fr]">
                <Img k={e.image} w={600} className="aspect-square" alt={e.name} />
                <div className="flex flex-col">
                  <p className="eyebrow">{e.category} · {e.duration}</p>
                  <h3 className="mt-2 text-2xl">{e.name}</h3>
                  <p className="mt-2 text-sm text-stone">{e.description}</p>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <Money v={e.price} className="font-display text-2xl" />
                    <Link to="/experiences" className="link-lux">Reserve</Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-16 border-t border-kohl/10 pt-10">
            <p className="eyebrow mb-6 text-center">Amenities</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-stone">
              {hotel.amenities.map((a) => <span key={a} className="flex items-center gap-2"><span className="h-1 w-1 rotate-45 bg-gold" />{a}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section id="gallery" className="scroll-mt-40 bg-sand/50 py-24">
        <div className="container-lux">
          <SectionHeading eyebrow="Gallery" title="A closer look" text="Select any image to view it full screen." />
          <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4">
            {gallery.slice(0, 10).map((k, i) => (
              <button key={k} onClick={() => setLb(i)} className={`group ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
                <Img k={k} w={i === 0 ? 1400 : 700} className={i === 0 ? 'aspect-square h-full' : 'aspect-square'} zoom alt="" />
              </button>
            ))}
          </div>
        </div>
        <Lightbox images={gallery} index={lb} onClose={() => setLb(null)} onIndex={setLb} />
      </section>

      <section id="location" className="scroll-mt-40 py-24">
        <div className="container-lux grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <p className="eyebrow mb-5">Location</p>
            <h2 className="text-4xl">Finding us</h2>
            <p className="mt-6 flex gap-3 text-stone"><MapPin className="shrink-0 text-gold" size={18} /> {hotel.address}</p>
            <p className="mt-3 flex gap-3 text-stone"><Phone className="shrink-0 text-gold" size={18} /> {hotel.phone}</p>
            <p className="mt-6 text-sm text-stone">Complimentary transfers from the nearest airport can be arranged for all suite guests. Our team will be waiting with a garland and chilled aam panna.</p>
            {hotelReviews.length > 0 && (
              <div className="mt-10 space-y-6 border-t border-kohl/10 pt-8">
                <p className="eyebrow">What guests say</p>
                {hotelReviews.map((r) => (
                  <div key={r.id}>
                    <Stars n={r.rating} />
                    <p className="mt-1 font-display text-xl">“{r.title}”</p>
                    <p className="text-xs text-stone">{r.guestName} · {r.source} · {fmtDate(r.date, 'MMM yyyy')}</p>
                  </div>
                ))}
              </div>
            )}
          </Reveal>
          <Suspense fallback={<div className="h-[480px] bg-sand" />}>
            <IndiaMap hotels={[hotel]} active={hotel.id} center={hotel.coords} zoom={12} className="h-[480px]" />
          </Suspense>
        </div>
      </section>

      <section className="border-t border-kohl/10 py-24">
        <div className="container-lux">
          <Ornament className="mb-8" />
          <h2 className="mb-12 text-center text-4xl">Continue the journey</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {others.map((h) => (
              <Link key={h.id} to={`/hotels/${h.slug}`} className="group">
                <Img k={h.hero} w={900} className="aspect-[4/3]" zoom alt={h.name} />
                <p className="eyebrow mt-5">{h.city}</p>
                <p className="mt-1 flex items-center justify-between font-display text-2xl">{h.name} <ArrowRight size={16} className="opacity-0 transition group-hover:opacity-100" /></p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
