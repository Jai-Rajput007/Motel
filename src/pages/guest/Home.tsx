import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Quote } from 'lucide-react'
import clsx from 'clsx'
import { HOTELS } from '../../data/hotels'
import { OFFERS, PRESS, TESTIMONIALS, TIMELINE } from '../../data/content'
import { img } from '../../data/images'
import BookingBar from '../../components/guest/BookingBar'
import { Img, Money, Ornament, Reveal, SectionHeading } from '../../components/ui/primitives'
import { useT } from '../../i18n'

const SLIDES = [
  { k: 'udaipurLake', place: 'Jal Mahal Niwas · Udaipur' },
  { k: 'amerLake', place: 'Amer Bagh Palace · Jaipur' },
  { k: 'keralaHouseboat', place: 'Kettuvallam Retreat · Kerala' },
  { k: 'varanasiGhats', place: 'Ghat House · Varanasi' },
]

function Hero() {
  const t = useT()
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 7000)
    return () => clearInterval(id)
  }, [])
  return (
    <section className="relative h-[100svh] min-h-[640px] overflow-hidden bg-kohl">
      <AnimatePresence>
        <motion.div key={i} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.8 }}>
          <img src={img(SLIDES[i].k, 2400)} alt="" className="kenburns h-full w-full object-cover" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-kohl/40 via-kohl/10 to-kohl/70" />
      <div className="relative flex h-full flex-col items-center justify-center px-6 pb-16 pt-32 text-center text-ivory">
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 1 }} className="eyebrow mb-6 text-gold-2">Est. 1911 · Six heritage homes across India</motion.p>
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1.2, ease: [0.22, 1, 0.36, 1] }} className="max-w-5xl text-[3.2rem] leading-[1.02] md:text-[6.2rem]">
          {t('Where India’s legacy lives on')}
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 1 }} className="mt-7 max-w-xl text-[17px] leading-relaxed text-ivory/85">
          Lake palaces, royal havelis and riverside retreats — restored by artisans and cared for by the families who have always called them home.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="mt-10 flex flex-wrap justify-center gap-4">
          <Link to="/destinations" className="btn-ghost-light">{t('Discover more')}</Link>
          <Link to="/book" className="btn-primary">{t('Book a Stay')}</Link>
        </motion.div>
      </div>
      <div className="absolute bottom-32 right-8 hidden items-center gap-4 text-[11px] uppercase tracking-[0.25em] text-ivory/80 md:flex">
        <span>{SLIDES[i].place}</span>
        <div className="flex gap-1.5">
          {SLIDES.map((_, j) => <button key={j} aria-label={`Slide ${j + 1}`} onClick={() => setI(j)} className={clsx('h-px transition-all duration-700', j === i ? 'w-10 bg-gold-2' : 'w-5 bg-ivory/50')} />)}
        </div>
      </div>
    </section>
  )
}

function Intro() {
  const stats = [['6', 'heritage homes'], ['280', 'years of history'], ['1,400', 'artisans & craftsmen'], ['96%', 'guests who return']]
  return (
    <section className="relative py-28 md:py-36">
      <div className="jaali-bg pointer-events-none absolute inset-0 opacity-[0.07]" />
      <div className="container-lux relative">
        <Reveal className="mx-auto max-w-4xl text-center">
          <p className="eyebrow mb-6">Our Legacy</p>
          <p className="font-display text-[1.9rem] leading-[1.35] text-kohl md:text-[2.6rem]">
            For more than a century, the Virasat family has kept the doors of India’s great houses open — not as museums, but as <em className="text-sindoor">living homes</em>, where every guest is received with the warmth reserved for family.
          </p>
          <Ornament className="mt-10" />
        </Reveal>
        <div className="mt-16 grid grid-cols-2 gap-y-10 md:grid-cols-4">
          {stats.map(([n, l], i) => (
            <Reveal key={l} delay={i * 0.1} className="text-center">
              <p className="font-display text-5xl text-kohl md:text-6xl">{n}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-stone">{l}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Destinations() {
  const layout = ['md:col-span-7 aspect-[16/11]', 'md:col-span-5 aspect-[4/5] md:mt-24', 'md:col-span-4 aspect-[4/5]', 'md:col-span-4 aspect-[4/5] md:mt-16', 'md:col-span-4 aspect-[4/5]', 'md:col-span-12 aspect-[21/9]']
  return (
    <section className="bg-sand/50 py-28">
      <div className="container-lux">
        <div className="mb-16 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading center={false} eyebrow="Destinations" title={<>Six homes, <em>six</em> worlds</>} text="From the lakes of Mewar to the backwaters of Travancore, each Virasat home is a doorway into the region that shaped it." />
          <Link to="/destinations" className="link-lux shrink-0">View all destinations <ArrowRight size={14} /></Link>
        </div>
        <div className="grid gap-6 md:grid-cols-12 md:gap-8">
          {HOTELS.map((h, i) => (
            <Reveal key={h.id} delay={(i % 3) * 0.12} className={layout[i].split(' ').filter((c) => c.startsWith('md:col') || c.startsWith('md:mt')).join(' ')}>
              <Link to={`/hotels/${h.slug}`} className="group relative block">
                <Img k={h.hero} w={i === 5 ? 2000 : 1200} className={layout[i].split(' ').filter((c) => c.startsWith('aspect')).join(' ')} zoom alt={h.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-kohl/75 via-kohl/5 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-ivory md:p-8">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gold-2">{h.city}, {h.state}</p>
                  <h3 className="mt-2 text-3xl md:text-4xl">{h.name}</h3>
                  <p className="mt-2 max-w-md text-sm text-ivory/80">{h.tagline}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] opacity-0 transition-all duration-500 group-hover:opacity-100">Explore the palace <ArrowRight size={13} /></span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Timeline() {
  return (
    <section className="grain relative overflow-hidden bg-kohl py-28 text-ivory">
      <div className="container-lux relative">
        <SectionHeading light eyebrow="A Living History" title="Two centuries in six chapters" />
        <div className="relative mt-16">
          <div className="absolute left-0 right-0 top-[27px] hidden h-px bg-gold/30 md:block" />
          <div className="grid gap-12 md:grid-cols-6 md:gap-6">
            {TIMELINE.map((e, i) => (
              <Reveal key={e.year} delay={i * 0.12}>
                <div className="relative mb-6 flex items-center gap-4 md:block">
                  <span className="relative z-10 grid h-14 w-14 place-items-center rounded-full border border-gold/50 bg-kohl font-display text-lg text-gold-2">{e.year === 'Today' ? '✦' : e.year.slice(2)}</span>
                </div>
                <p className="font-display text-3xl text-gold-2">{e.year}</p>
                <p className="mt-2 font-display text-xl">{e.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ivory/60">{e.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ExperiencesTabs() {
  const all = HOTELS.flatMap((h) => h.experiences.map((e) => ({ ...e, hotel: h })))
  const [i, setI] = useState(0)
  const e = all[i]
  return (
    <section className="py-28">
      <div className="container-lux grid items-center gap-14 lg:grid-cols-2">
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div key={e.id} initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
              <Img k={e.image} w={1400} className="arch aspect-[4/5]" alt={e.name} />
            </motion.div>
          </AnimatePresence>
          <div className="absolute -bottom-6 -right-2 hidden bg-ivory p-6 shadow-xl md:block">
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone">From</p>
            <Money v={e.price} className="font-display text-3xl" />
            <p className="text-xs text-stone">{e.duration} · {e.hotel.city}</p>
          </div>
        </div>
        <div>
          <SectionHeading center={false} eyebrow="Signature Experiences" title="Moments you cannot find elsewhere" />
          <ul className="mt-10 divide-y divide-kohl/10 border-y border-kohl/10">
            {all.slice(0, 8).map((x, j) => (
              <li key={x.id}>
                <button onMouseEnter={() => setI(j)} onClick={() => setI(j)} className="group flex w-full items-center justify-between py-4 text-left">
                  <span className="flex items-baseline gap-5">
                    <span className="w-6 text-xs text-gold">{String(j + 1).padStart(2, '0')}</span>
                    <span className={clsx('font-display text-2xl transition-colors', i === j ? 'text-sindoor' : 'text-kohl group-hover:text-sindoor')}>{x.name}</span>
                  </span>
                  <span className="hidden text-[11px] uppercase tracking-[0.2em] text-stone sm:block">{x.hotel.city}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-lg text-stone">{e.description}</p>
          <Link to="/experiences" className="link-lux mt-8">All experiences <ArrowRight size={14} /></Link>
        </div>
      </div>
    </section>
  )
}

function DiningWellness() {
  return (
    <section className="grid md:grid-cols-2">
      <Link to="/dining" className="group relative block h-[80vh] min-h-[520px] overflow-hidden">
        <Img k="thali" w={1600} className="absolute inset-0 h-full" zoom alt="Royal thali" />
        <div className="absolute inset-0 bg-kohl/45 transition-colors duration-700 group-hover:bg-kohl/55" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center text-ivory">
          <p className="eyebrow text-gold-2">Dining</p>
          <h3 className="mt-4 max-w-md text-5xl leading-tight">Recipes from the royal kitchens</h3>
          <p className="mt-4 max-w-sm text-ivory/80">Twelve restaurants, one philosophy: cook the way the palace kitchens did.</p>
          <span className="btn-ghost-light mt-8">Discover dining</span>
        </div>
      </Link>
      <Link to="/wellness" className="group relative block h-[80vh] min-h-[520px] overflow-hidden">
        <Img k="spaOil" w={1600} className="absolute inset-0 h-full" zoom alt="Ayurvedic massage" />
        <div className="absolute inset-0 bg-peacock/45 transition-colors duration-700 group-hover:bg-peacock/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center text-ivory">
          <p className="eyebrow text-gold-2">Wellness</p>
          <h3 className="mt-4 max-w-md text-5xl leading-tight">Ayurveda, as it was meant to be</h3>
          <p className="mt-4 max-w-sm text-ivory/80">Eight generations of vaidyas, classical therapies and sattvic cuisine.</p>
          <span className="btn-ghost-light mt-8">Explore the spa</span>
        </div>
      </Link>
    </section>
  )
}

function Offers() {
  return (
    <section className="py-28">
      <div className="container-lux">
        <SectionHeading eyebrow="Offers" title="Invitations for the season" text="Thoughtfully composed stays, each with a little something extra." />
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {OFFERS.slice(0, 3).map((o, i) => (
            <Reveal key={o.id} delay={i * 0.12}>
              <Link to="/offers" className="group block">
                <Img k={o.image} w={900} h={1100} className="aspect-[4/5]" zoom alt={o.title} />
                <p className="mt-6 text-[10px] uppercase tracking-[0.28em] text-gold">{o.hotels}</p>
                <h3 className="mt-2 text-3xl">{o.title}</h3>
                <p className="mt-2 text-stone">{o.subtitle}</p>
                <span className="link-lux mt-5">View offer <ArrowRight size={14} /></span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Press() {
  const row = [...PRESS, ...PRESS]
  return (
    <section className="overflow-hidden border-y border-kohl/10 bg-ivory py-10">
      <div className="marquee flex w-max gap-20">
        {row.map((p, i) => (
          <div key={i} className="flex items-center gap-5 whitespace-nowrap">
            <span className="font-display text-2xl italic text-kohl/80">“{p.quote}”</span>
            <span className="text-[11px] uppercase tracking-[0.3em] text-gold">{p.source}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function Testimonials() {
  const [i, setI] = useState(0)
  const tt = TESTIMONIALS[i]
  return (
    <section className="relative bg-sand/60 py-28">
      <div className="container-lux max-w-4xl text-center">
        <Quote className="mx-auto text-gold" size={36} strokeWidth={1} />
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.6 }}>
            <p className="mt-8 font-display text-[1.7rem] leading-[1.45] md:text-[2.2rem]">{tt.text}</p>
            <p className="mt-8 text-[11px] uppercase tracking-[0.3em] text-stone">{tt.name} · {tt.from}</p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-10 flex justify-center gap-3">
          {TESTIMONIALS.map((_, j) => <button key={j} aria-label={`Testimonial ${j + 1}`} onClick={() => setI(j)} className={clsx('h-2 w-2 rounded-full transition-all', j === i ? 'w-8 bg-sindoor' : 'bg-kohl/25')} />)}
        </div>
      </div>
    </section>
  )
}

function WeddingsBand() {
  return (
    <section className="relative overflow-hidden">
      <Img k="amerFort" w={2400} className="absolute inset-0 h-full" alt="" />
      <div className="absolute inset-0 bg-gradient-to-r from-kohl/85 via-kohl/60 to-transparent" />
      <div className="container-lux relative py-32 text-ivory">
        <Reveal className="max-w-xl">
          <p className="eyebrow text-gold-2">Weddings & Celebrations</p>
          <h2 className="mt-5 text-5xl leading-tight md:text-6xl">A royal wedding, the way it was always done</h2>
          <p className="mt-6 text-ivory/80">Baraat through palace gates, pheras beside the lake, and a sangeet under ten thousand lamps. Our wedding atelier has planned more than 1,200 celebrations.</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/weddings" className="btn-primary">Plan your wedding</Link>
            <Link to="/weddings#venues" className="btn-ghost-light">View venues</Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Moments() {
  const tiles = ['hawaMahal', 'poolDusk', 'halwa', 'keralaBoatman', 'roomGold', 'himalayaRange', 'yogaMeditate']
  return (
    <section className="py-24">
      <div className="container-lux">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-3">#VirasatMoments</p>
            <h2 className="text-4xl">Shared by our guests</h2>
          </div>
          <Link to="/journal" className="link-lux hidden md:inline-flex">Read the Journal <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((k, i) => (
            <Reveal key={k} delay={(i % 4) * 0.08} className={clsx(i === 0 && 'md:row-span-2', i === 5 && 'md:col-span-2')}>
              <Img k={k} w={900} className={clsx('h-full', i === 0 ? 'aspect-[3/4] md:aspect-auto' : 'aspect-square', i === 5 && 'md:aspect-[2/1]')} alt="" zoom />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Hero />
      <div className="relative z-20 -mt-24 px-5 md:px-10"><BookingBar /></div>
      <Intro />
      <Destinations />
      <Timeline />
      <ExperiencesTabs />
      <DiningWellness />
      <Offers />
      <Press />
      <Testimonials />
      <WeddingsBand />
      <Moments />
    </>
  )
}
