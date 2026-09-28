import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, Bell, BedDouble, Boxes, CalendarRange, ChevronDown, ClipboardList, ConciergeBell, Contact, CreditCard, Filter, Gauge,
  Globe, Heart, KanbanSquare, LogOut, Megaphone, Menu, Moon, Search, Settings, Sparkles, Star, Sun, Users, Wrench, Workflow, X, Crown, Network,
} from 'lucide-react'
import clsx from 'clsx'
import { HOTELS, hotelById } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import type { Role } from '../../types'
import { Avatar } from '../../components/admin/ui'
import DemoGuide from '../../components/DemoGuide'
import { Logo } from '../../components/ui/primitives'

const Dashboard = lazy(() => import('./Dashboard'))
const FrontDesk = lazy(() => import('./FrontDesk'))
const Reservations = lazy(() => import('./Reservations'))
const TapeChart = lazy(() => import('./TapeChart'))
const Housekeeping = lazy(() => import('./Housekeeping'))
const RoomsRates = lazy(() => import('./RoomsRates'))
const Billing = lazy(() => import('./Billing'))
const Maintenance = lazy(() => import('./Maintenance'))
const StaffPage = lazy(() => import('./Staff'))
const Inventory = lazy(() => import('./Inventory'))
const Channels = lazy(() => import('./Channels'))
const Reports = lazy(() => import('./Reports'))
const SettingsPage = lazy(() => import('./Settings'))
const Guests = lazy(() => import('../crm/Guests'))
const Segments = lazy(() => import('../crm/Segments'))
const Pipeline = lazy(() => import('../crm/Pipeline'))
const Campaigns = lazy(() => import('../crm/Campaigns'))
const Automations = lazy(() => import('../crm/Automations'))
const Loyalty = lazy(() => import('../crm/Loyalty'))
const Reviews = lazy(() => import('../crm/Reviews'))

type NavItem = { to: string; label: string; icon: typeof Gauge; roles?: Role[] }
const ALL: Role[] = ['Owner', 'General Manager', 'Front Desk', 'Housekeeping', 'Sales & CRM']
const MGMT: Role[] = ['Owner', 'General Manager']
const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Overview', items: [{ to: '/admin', label: 'Dashboard', icon: Gauge, roles: ALL }] },
  {
    group: 'Front Office',
    items: [
      { to: '/admin/front-desk', label: 'Front Desk', icon: ConciergeBell, roles: [...MGMT, 'Front Desk'] },
      { to: '/admin/reservations', label: 'Reservations', icon: ClipboardList, roles: [...MGMT, 'Front Desk', 'Sales & CRM'] },
      { to: '/admin/tape-chart', label: 'Tape Chart', icon: CalendarRange, roles: [...MGMT, 'Front Desk'] },
      { to: '/admin/billing', label: 'Billing & Folios', icon: CreditCard, roles: [...MGMT, 'Front Desk'] },
    ],
  },
  {
    group: 'Operations',
    items: [
      { to: '/admin/housekeeping', label: 'Housekeeping', icon: Sparkles, roles: [...MGMT, 'Front Desk', 'Housekeeping'] },
      { to: '/admin/maintenance', label: 'Maintenance', icon: Wrench, roles: [...MGMT, 'Housekeeping', 'Front Desk'] },
      { to: '/admin/staff', label: 'Staff & Roster', icon: Users, roles: MGMT },
      { to: '/admin/inventory', label: 'Inventory', icon: Boxes, roles: [...MGMT, 'Housekeeping'] },
    ],
  },
  {
    group: 'Revenue',
    items: [
      { to: '/admin/rooms-rates', label: 'Rooms & Rates', icon: BedDouble, roles: MGMT },
      { to: '/admin/channels', label: 'Channel Manager', icon: Network, roles: MGMT },
      { to: '/admin/reports', label: 'Reports', icon: BarChart3, roles: [...MGMT, 'Sales & CRM'] },
    ],
  },
  {
    group: 'CRM',
    items: [
      { to: '/admin/crm/guests', label: 'Guests', icon: Contact, roles: [...MGMT, 'Front Desk', 'Sales & CRM'] },
      { to: '/admin/crm/segments', label: 'Segments', icon: Filter, roles: [...MGMT, 'Sales & CRM'] },
      { to: '/admin/crm/pipeline', label: 'Sales Pipeline', icon: KanbanSquare, roles: [...MGMT, 'Sales & CRM'] },
      { to: '/admin/crm/campaigns', label: 'Campaigns', icon: Megaphone, roles: [...MGMT, 'Sales & CRM'] },
      { to: '/admin/crm/automations', label: 'Automations', icon: Workflow, roles: [...MGMT, 'Sales & CRM'] },
      { to: '/admin/crm/loyalty', label: 'Loyalty', icon: Crown, roles: [...MGMT, 'Sales & CRM'] },
      { to: '/admin/crm/reviews', label: 'Reviews & NPS', icon: Star, roles: [...MGMT, 'Sales & CRM', 'Front Desk'] },
    ],
  },
  { group: 'System', items: [{ to: '/admin/settings', label: 'Settings & Audit', icon: Settings, roles: MGMT }] },
]

const ROLE_INFO: Record<Role, { name: string; desc: string }> = {
  Owner: { name: 'Vikramaditya Singh', desc: 'Group-wide view, all properties and financials' },
  'General Manager': { name: 'Meera Nair', desc: 'Full access to operations, revenue and CRM' },
  'Front Desk': { name: 'Rohan Iyer', desc: 'Arrivals, departures, reservations and billing' },
  Housekeeping: { name: 'Lakshmi Pillai', desc: 'Room status board, maintenance and linen stock' },
  'Sales & CRM': { name: 'Radhika Iyer', desc: 'Guests, pipeline, campaigns and loyalty' },
}

function Login({ onDone }: { onDone: () => void }) {
  const setUI = useStore((s) => s.setUI)
  return (
    <div className="grid min-h-screen bg-kohl lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <img src="https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&q=75&w=1800" alt="" className="kenburns absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-kohl via-kohl/40 to-kohl/20" />
        <div className="absolute bottom-0 p-14 text-ivory">
          <p className="eyebrow text-gold-2">Virasat One</p>
          <h1 className="mt-4 max-w-lg font-display text-5xl leading-tight">One platform for every palace — rooms, people, stock and guests.</h1>
          <p className="mt-4 max-w-md text-ivory/70">Property management, reservations, housekeeping, inventory, billing and CRM, connected in real time to the guest website.</p>
        </div>
      </div>
      <div className="flex flex-col justify-center bg-ivory px-6 py-12 md:px-16">
        <Logo className="items-start" />
        <h2 className="mt-12 font-sans text-2xl font-semibold">Sign in to Virasat One</h2>
        <p className="mt-2 text-sm text-stone">Demo environment — choose a role to see how access adapts to each team.</p>
        <div className="mt-8 space-y-3">
          {(Object.keys(ROLE_INFO) as Role[]).map((r) => (
            <button key={r} onClick={() => { setUI({ role: r }); onDone() }} className="flex w-full items-center gap-4 rounded-xl border border-kohl/10 bg-white p-4 text-left transition hover:border-peacock hover:shadow-md">
              <Avatar name={ROLE_INFO[r].name} size={40} />
              <span className="flex-1">
                <span className="block text-sm font-semibold">{r}</span>
                <span className="block text-xs text-stone">{ROLE_INFO[r].name} · {ROLE_INFO[r].desc}</span>
              </span>
              <span className="text-peacock">→</span>
            </button>
          ))}
        </div>
        <Link to="/" className="mt-10 text-sm text-stone hover:text-kohl">← Back to the guest website</Link>
      </div>
    </div>
  )
}

function Notifications() {
  const { notices, markNoticesRead } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = notices.filter((n) => !n.read).length
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const icon = { booking: ConciergeBell, lead: Heart, stock: Boxes, review: Star, system: Bell }
  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(!open); if (!open) setTimeout(markNoticesRead, 1500) }} className="relative rounded-lg p-2 text-stone hover:bg-kohl/5 dark:text-sand dark:hover:bg-white/10" aria-label="Notifications">
        <Bell size={18} />
        {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-sindoor px-1 text-[10px] text-white">{unread}</span>}
      </button>
      {open && (
        <div className="panel absolute right-0 top-11 z-40 w-80 overflow-hidden shadow-2xl">
          <p className="border-b border-kohl/5 px-4 py-3 text-sm font-semibold dark:border-white/5 dark:text-ivory">Notifications</p>
          <ul className="max-h-96 overflow-y-auto">
            {notices.slice(0, 15).map((n) => (
              <li key={n.id} className={clsx('flex gap-3 border-b border-kohl/5 px-4 py-3 text-sm dark:border-white/5', !n.read && 'bg-peacock/5')}>
                {(() => { const I = icon[n.kind]; return <I size={15} className="mt-0.5 shrink-0 text-gold" /> })()}
                <span className="flex-1 dark:text-sand">{n.text}<span className="block text-xs text-stone">{new Date(n.at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function GlobalSearch() {
  const { bookings, guests } = useStore()
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const results = useMemo(() => {
    if (q.length < 2) return []
    const s = q.toLowerCase()
    const g = guests.filter((x) => `${x.firstName} ${x.lastName} ${x.email}`.toLowerCase().includes(s)).slice(0, 5).map((x) => ({ key: x.id, label: `${x.firstName} ${x.lastName}`, sub: x.email, to: `/admin/crm/guests?id=${x.id}` }))
    const b = bookings.filter((x) => x.ref.toLowerCase().includes(s)).slice(0, 5).map((x) => ({ key: x.id, label: x.ref, sub: `${hotelById(x.hotelId).name} · ${x.checkIn}`, to: `/admin/reservations?q=${x.ref}` }))
    return [...b, ...g]
  }, [q, bookings, guests])
  return (
    <div className="relative hidden md:block">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guests, booking refs…" className="a-input w-72 pl-9" />
      {results.length > 0 && (
        <div className="panel absolute left-0 top-11 z-40 w-full overflow-hidden shadow-xl">
          {results.map((r) => (
            <button key={r.key} onClick={() => { nav(r.to); setQ('') }} className="block w-full border-b border-kohl/5 px-4 py-2.5 text-left text-sm hover:bg-kohl/5 dark:border-white/5 dark:text-sand dark:hover:bg-white/5">
              <span className="font-medium">{r.label}</span><span className="block text-xs text-stone">{r.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Shell() {
  const { role, property, dark, setUI } = useStore()
  const [side, setSide] = useState(false)
  const [roleMenu, setRoleMenu] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  useEffect(() => setSide(false), [loc.pathname])
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.includes(role)) })).filter((g) => g.items.length)
  const allowed = groups.flatMap((g) => g.items.map((i) => i.to))
  const current = NAV.flatMap((g) => g.items).filter((i) => loc.pathname === i.to || (i.to !== '/admin' && loc.pathname.startsWith(i.to)))[0]
  const blocked = current && !allowed.includes(current.to)

  return (
    <div className={clsx(dark && 'dark')}>
      <div className="flex min-h-screen bg-[#f4f1ea] font-sans text-kohl dark:bg-[#12110f]">
        <aside className={clsx('fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-kohl text-ivory transition-transform lg:translate-x-0', side ? 'translate-x-0' : '-translate-x-full')}>
          <div className="flex h-16 items-center justify-between border-b border-ivory/10 px-5">
            <Link to="/admin" className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold/15 text-gold"><Heart size={16} /></span>
              <span><span className="block font-display text-lg leading-none tracking-[0.2em]">VIRASAT</span><span className="text-[10px] uppercase tracking-[0.3em] text-ivory/50">One · PMS & CRM</span></span>
            </Link>
            <button className="lg:hidden" onClick={() => setSide(false)} aria-label="Close menu"><X size={18} /></button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {groups.map((g) => (
              <div key={g.group} className="mb-4">
                <p className="px-3 pb-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-ivory/35">{g.group}</p>
                {g.items.map((i) => (
                  <NavLink key={i.to} to={i.to} end={i.to === '/admin'} className={({ isActive }) => clsx('flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition', isActive ? 'bg-ivory/10 text-ivory' : 'text-ivory/65 hover:bg-ivory/5 hover:text-ivory')}>
                    <i.icon size={16} className="shrink-0" /> {i.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          <Link to="/" className="flex items-center gap-2 border-t border-ivory/10 px-6 py-4 text-xs text-ivory/60 hover:text-ivory"><Globe size={14} /> View guest website</Link>
        </aside>
        {side && <div className="fixed inset-0 z-30 bg-kohl/40 lg:hidden" onClick={() => setSide(false)} />}

        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-kohl/10 bg-[#f4f1ea]/90 px-4 backdrop-blur md:px-6 dark:border-white/10 dark:bg-[#12110f]/90">
            <button className="rounded-lg p-2 lg:hidden dark:text-ivory" onClick={() => setSide(true)} aria-label="Open menu"><Menu size={18} /></button>
            <select value={property} onChange={(e) => setUI({ property: e.target.value })} className="a-input w-auto max-w-[220px] font-medium" aria-label="Property">
              <option value="all">All properties (6)</option>
              {HOTELS.map((h) => <option key={h.id} value={h.id}>{h.name} · {h.city}</option>)}
            </select>
            <GlobalSearch />
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setUI({ dark: !dark })} className="rounded-lg p-2 text-stone hover:bg-kohl/5 dark:text-sand dark:hover:bg-white/10" aria-label="Toggle dark mode">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
              <Notifications />
              <div className="relative">
                <button onClick={() => setRoleMenu(!roleMenu)} className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-kohl/5 dark:hover:bg-white/10">
                  <Avatar name={ROLE_INFO[role].name} size={30} />
                  <span className="hidden text-left sm:block"><span className="block text-xs font-semibold dark:text-ivory">{ROLE_INFO[role].name}</span><span className="block text-[11px] text-stone">{role}</span></span>
                  <ChevronDown size={14} className="text-stone" />
                </button>
                {roleMenu && (
                  <div className="panel absolute right-0 top-11 z-40 w-64 overflow-hidden shadow-2xl" onMouseLeave={() => setRoleMenu(false)}>
                    <p className="px-4 pb-1 pt-3 text-[10px] uppercase tracking-widest text-stone">Switch role (demo)</p>
                    {(Object.keys(ROLE_INFO) as Role[]).map((r) => (
                      <button key={r} onClick={() => { setUI({ role: r }); setRoleMenu(false); nav('/admin') }} className={clsx('flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-kohl/5 dark:text-sand dark:hover:bg-white/5', r === role && 'font-semibold text-peacock')}>{r}</button>
                    ))}
                    <button onClick={() => { sessionStorage.removeItem('virasat-admin'); location.reload() }} className="flex w-full items-center gap-2 border-t border-kohl/5 px-4 py-2.5 text-sm text-sindoor hover:bg-kohl/5 dark:border-white/5"><LogOut size={14} /> Sign out</button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {blocked ? (
              <div className="panel mx-auto mt-10 max-w-md p-8 text-center dark:text-sand">
                <p className="text-lg font-semibold dark:text-ivory">Restricted for {role}</p>
                <p className="mt-2 text-sm text-stone">Role-based access control hides this module from your team. Switch role from the top-right menu to explore it.</p>
              </div>
            ) : (
              <Suspense fallback={<div className="p-10 text-sm text-stone">Loading…</div>}>
                <Routes>
                  <Route index element={<Dashboard />} />
                  <Route path="front-desk" element={<FrontDesk />} />
                  <Route path="reservations" element={<Reservations />} />
                  <Route path="tape-chart" element={<TapeChart />} />
                  <Route path="housekeeping" element={<Housekeeping />} />
                  <Route path="rooms-rates" element={<RoomsRates />} />
                  <Route path="billing" element={<Billing />} />
                  <Route path="maintenance" element={<Maintenance />} />
                  <Route path="staff" element={<StaffPage />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="channels" element={<Channels />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="crm/guests" element={<Guests />} />
                  <Route path="crm/segments" element={<Segments />} />
                  <Route path="crm/pipeline" element={<Pipeline />} />
                  <Route path="crm/campaigns" element={<Campaigns />} />
                  <Route path="crm/automations" element={<Automations />} />
                  <Route path="crm/loyalty" element={<Loyalty />} />
                  <Route path="crm/reviews" element={<Reviews />} />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
              </Suspense>
            )}
          </main>
        </div>
      </div>
      <DemoGuide admin />
    </div>
  )
}

export default function AdminApp() {
  const [authed, setAuthed] = useState(() => { try { return sessionStorage.getItem('virasat-admin') === '1' } catch { return true } })
  if (!authed) return <Login onDone={() => { try { sessionStorage.setItem('virasat-admin', '1') } catch { /* ignore */ } setAuthed(true) }} />
  return <Shell />
}
