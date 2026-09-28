import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Mail, MapPin, Menu, MessageCircle, Phone, X, LayoutDashboard } from 'lucide-react'
import clsx from 'clsx'
import { HOTELS } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { Img, Logo, Lotus } from '../ui/primitives'
import { DEVELOPER } from '../../config/developer'
import DemoGuide from '../DemoGuide'

const NAV = [
  { to: '/destinations', label: 'Destinations' },
  { to: '/experiences', label: 'Experiences' },
  { to: '/dining', label: 'Dining' },
  { to: '/weddings', label: 'Weddings' },
  { to: '/wellness', label: 'Wellness' },
  { to: '/offers', label: 'Offers' },
  { to: '/circle', label: 'Virasat Circle' },
]

function UtilityBar({ light }: { light: boolean }) {
  const { lang, currency, setUI } = useStore()
  const t = useT()
  return (
    <div className={clsx('hidden border-b text-[11px] uppercase tracking-[0.2em] lg:block', light ? 'border-ivory/15 text-ivory/80' : 'border-kohl/10 text-stone')}>
      <div className="container-lux flex h-9 items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2"><Phone size={12} /> +91 22 4000 1911</span>
          <Link to="/manage-booking" className="hover:text-gold">{t('Manage booking')}</Link>
          <Link to="/journal" className="hover:text-gold">{t('Journal')}</Link>
          <Link to="/gift-cards" className="hover:text-gold">Gift cards</Link>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            {(['en', 'hi'] as const).map((l) => (
              <button key={l} onClick={() => setUI({ lang: l })} className={clsx('transition-colors', lang === l ? 'text-gold' : 'hover:text-gold')}>{l === 'en' ? 'EN' : 'हिं'}</button>
            ))}
          </div>
          <span className="opacity-40">|</span>
          <div className="flex items-center gap-2">
            {(['INR', 'USD'] as const).map((c) => (
              <button key={c} onClick={() => setUI({ currency: c })} className={clsx('transition-colors', currency === c ? 'text-gold' : 'hover:text-gold')}>{c === 'INR' ? '₹ INR' : '$ USD'}</button>
            ))}
          </div>
          <span className="opacity-40">|</span>
          <Link to="/admin" className="flex items-center gap-1.5 text-gold hover:text-gold-2"><LayoutDashboard size={12} /> Hotel Admin Demo</Link>
        </div>
      </div>
    </div>
  )
}

function Header() {
  const { pathname } = useLocation()
  const t = useT()
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState(false)
  const [mega, setMega] = useState(false)
  const heroPage = pathname === '/' || /^\/(hotels\/[^/]+|destinations|experiences|dining|weddings|wellness|offers|circle|journal|for-hoteliers)$/.test(pathname)
  const light = heroPage && !scrolled && !mega

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 60)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => { setMenu(false); setMega(false) }, [pathname])

  return (
    <header className={clsx('fixed inset-x-0 top-0 z-50 transition-all duration-700', light ? 'bg-gradient-to-b from-kohl/55 to-transparent' : 'bg-ivory/95 shadow-[0_1px_0_rgba(28,26,23,0.08)] backdrop-blur-md')} onMouseLeave={() => setMega(false)}>
      <UtilityBar light={light} />
      <div className="container-lux grid h-[84px] grid-cols-[1fr_auto_1fr] items-center">
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.slice(0, 4).map((n) => (
            <NavLink key={n.to} to={n.to} onMouseEnter={() => setMega(n.to === '/destinations')} className={({ isActive }) => clsx('text-[11.5px] uppercase tracking-[0.22em] transition-colors', light ? 'text-ivory hover:text-gold-2' : 'text-kohl hover:text-sindoor', isActive && 'text-gold')}>
              {t(n.label)}
            </NavLink>
          ))}
        </nav>
        <button className={clsx('lg:hidden', light ? 'text-ivory' : 'text-kohl')} onClick={() => setMenu(true)} aria-label="Open menu"><Menu /></button>
        <Link to="/" aria-label="Virasat home"><Logo light={light} /></Link>
        <div className="flex items-center justify-end gap-7">
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.slice(4).map((n) => (
              <NavLink key={n.to} to={n.to} onMouseEnter={() => setMega(false)} className={({ isActive }) => clsx('text-[11.5px] uppercase tracking-[0.22em] transition-colors', light ? 'text-ivory hover:text-gold-2' : 'text-kohl hover:text-sindoor', isActive && 'text-gold')}>
                {t(n.label)}
              </NavLink>
            ))}
          </nav>
          <Link to="/book" className={clsx('btn hidden px-5 py-3 md:inline-flex', light ? 'border border-ivory/70 text-ivory hover:bg-ivory hover:text-kohl' : 'bg-kohl text-ivory hover:bg-sindoor')}>{t('Book a Stay')}</Link>
        </div>
      </div>

      <AnimatePresence>
        {mega && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }} className="absolute inset-x-0 top-full hidden border-t border-kohl/10 bg-ivory shadow-2xl lg:block">
            <div className="container-lux grid grid-cols-6 gap-5 py-8">
              {HOTELS.map((h) => (
                <Link key={h.id} to={`/hotels/${h.slug}`} className="group">
                  <Img k={h.hero} w={500} h={600} className="aspect-[4/5]" zoom />
                  <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-gold">{h.city}</p>
                  <p className="font-display text-lg leading-tight">{h.name}</p>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menu && (
          <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-kohl px-6 py-6 text-ivory">
            <div className="flex items-center justify-between">
              <Logo light />
              <button onClick={() => setMenu(false)} aria-label="Close menu"><X /></button>
            </div>
            <nav className="mt-10 flex flex-col gap-5">
              {[...NAV, { to: '/journal', label: 'Journal' }, { to: '/contact', label: 'Contact' }, { to: '/manage-booking', label: 'Manage booking' }].map((n) => (
                <Link key={n.to} to={n.to} className="font-display text-3xl">{t(n.label)}</Link>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3 pt-10">
              <Link to="/book" className="btn-primary">{t('Book a Stay')}</Link>
              <Link to="/admin" className="btn-ghost-light">Hotel Admin Demo</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

function Footer() {
  const subscribe = useStore((s) => s.subscribe)
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  return (
    <footer className="relative overflow-hidden bg-kohl text-ivory">
      <div className="jaali-bg pointer-events-none absolute inset-0 opacity-[0.05]" />
      <div className="container-lux relative">
        <div className="grid gap-10 border-b border-ivory/10 py-16 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div>
            <p className="eyebrow mb-4">The Virasat Letter</p>
            <h3 className="max-w-lg text-4xl leading-tight">Stories from our palaces, private offers and festival invitations — four times a year.</h3>
          </div>
          {done ? (
            <p className="font-display text-2xl text-gold-2">Thank you — your first letter arrives with the next full moon.</p>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (email.includes('@')) { subscribe(email); setDone(true) } }} className="flex border-b border-ivory/40">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" aria-label="Email address" className="w-full bg-transparent py-4 text-lg outline-none placeholder:text-ivory/40" />
              <button className="flex items-center gap-2 text-[12px] uppercase tracking-[0.25em] text-gold-2 hover:text-ivory">Subscribe <ArrowUpRight size={14} /></button>
            </form>
          )}
        </div>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo light className="items-start" />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-ivory/60">Six homes across India, each a living chapter of its region’s history — restored by artisans, cared for by families who have served them for generations.</p>
            <div className="mt-6 flex flex-col gap-2 text-sm text-ivory/70">
              <span className="flex items-center gap-2"><MapPin size={14} className="text-gold" /> Virasat House, Colaba, Mumbai 400001</span>
              <span className="flex items-center gap-2"><Phone size={14} className="text-gold" /> +91 22 4000 1911</span>
              <span className="flex items-center gap-2"><Mail size={14} className="text-gold" /> reservations@virasat.example</span>
            </div>
          </div>
          <div>
            <p className="eyebrow mb-5">Our Homes</p>
            <ul className="space-y-2.5 text-sm text-ivory/70">
              {HOTELS.map((h) => <li key={h.id}><Link to={`/hotels/${h.slug}`} className="hover:text-gold-2">{h.name}, {h.city}</Link></li>)}
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-5">Discover</p>
            <ul className="space-y-2.5 text-sm text-ivory/70">
              {[['Experiences', '/experiences'], ['Dining', '/dining'], ['Weddings & Events', '/weddings'], ['Ayurveda & Wellness', '/wellness'], ['Offers', '/offers'], ['Journal', '/journal'], ['Gift Cards', '/gift-cards']].map(([l, to]) => <li key={to}><Link to={to} className="hover:text-gold-2">{l}</Link></li>)}
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-5">Guests</p>
            <ul className="space-y-2.5 text-sm text-ivory/70">
              {[['Virasat Circle', '/circle'], ['Manage booking', '/manage-booking'], ['My stays', '/my-stays'], ['Contact us', '/contact'], ['For Hoteliers', '/for-hoteliers']].map(([l, to]) => <li key={to}><Link to={to} className="hover:text-gold-2">{l}</Link></li>)}
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-ivory/10 py-7 text-xs text-ivory/45 md:flex-row">
          <span>© {new Date().getFullYear()} Virasat Palaces & Resorts — a fictional brand created as a design & engineering showcase.</span>
          <Link to="/for-hoteliers" className="flex items-center gap-2 text-gold-2/80 hover:text-gold-2"><Lotus className="w-6 text-gold" /> Crafted by {DEVELOPER.name} — hire me for your hotel</Link>
        </div>
      </div>
    </footer>
  )
}

function CookieBanner() {
  const [show, setShow] = useState(() => { try { return !localStorage.getItem('virasat-cookie') } catch { return false } })
  if (!show) return null
  const close = () => { try { localStorage.setItem('virasat-cookie', '1') } catch { /* ignore */ } setShow(false) }
  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-sm bg-ivory p-5 text-sm shadow-2xl ring-1 ring-kohl/10">
      <p className="text-stone">We use cookies to remember your preferences and improve your stay online. </p>
      <div className="mt-3 flex gap-3">
        <button onClick={close} className="btn-dark px-5 py-2.5">Accept</button>
        <button onClick={close} className="link-lux">Essentials only</button>
      </div>
    </div>
  )
}

export default function GuestLayout() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <div className="min-h-screen">
      <Header />
      <main><Outlet /></main>
      <Footer />
      <a href="https://wa.me/912240001911" target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className="fixed bottom-5 right-5 z-40 grid h-13 w-13 place-items-center rounded-full bg-[#1f7a4d] p-3.5 text-white shadow-xl transition-transform hover:scale-105">
        <MessageCircle size={22} />
      </a>
      <DemoGuide />
      <CookieBanner />
    </div>
  )
}
