import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, BedDouble, Boxes, CalendarCheck, Check, ChevronDown, Code2, Globe, Heart, Layers, LineChart, Lock, Mail, MessageCircle, Phone, Rocket, Search, ShieldCheck, Smartphone, Sparkles, Users, Zap } from 'lucide-react'
import clsx from 'clsx'
import { DEVELOPER } from '../../config/developer'
import { img } from '../../data/images'
import { Ornament, Reveal } from '../../components/ui/primitives'

const PRODUCTS = [
  {
    icon: Globe, name: 'Luxury Hotel Website', tag: 'Your brand, beautifully told',
    points: ['Bespoke design that reflects your heritage — not a template', 'Rooms, dining, weddings, spa, offers & journal pages', 'English / Hindi, ₹ / $ switchers, WhatsApp chat', 'SEO, schema markup and lightning-fast loading'],
    demo: [['Homepage', '/'], ['Property page', '/hotels/jal-mahal-niwas-udaipur']],
  },
  {
    icon: CalendarCheck, name: 'Direct Booking Engine', tag: 'Stop paying 15–25% to OTAs',
    points: ['Live availability & dynamic seasonal pricing', 'Rate plans, add-ons, promo codes, GST calculation', 'Secure payment (Razorpay / Stripe ready), QR vouchers', 'Manage-booking & guest portal with loyalty points'],
    demo: [['Book a room', '/book?hotel=jmn&promo=VIRASAT10'], ['Manage booking', '/manage-booking']],
  },
  {
    icon: BedDouble, name: 'Hotel Management System', tag: 'Run the property from one screen',
    points: ['Front desk, check-in/out, drag-and-drop tape chart', 'Housekeeping board & attendant mobile view', 'Staff roster, attendance and leave approvals', 'Inventory, purchase orders, GST invoices, reports'],
    demo: [['Dashboard', '/admin'], ['Tape chart', '/admin/tape-chart']],
  },
  {
    icon: Heart, name: 'Guest CRM & Marketing', tag: 'Turn one-time guests into regulars',
    points: ['360° guest profiles with preferences & history', 'Wedding / MICE sales pipeline with proposals', 'Email & WhatsApp campaigns to smart segments', 'Loyalty tiers, automations, reviews & NPS'],
    demo: [['Guest profiles', '/admin/crm/guests'], ['Sales pipeline', '/admin/crm/pipeline']],
  },
]

const PROBLEMS = [
  ['15–25%', 'commission paid to online travel agents on every booking they bring'],
  ['5+', 'separate tools, registers and spreadsheets many properties juggle every day'],
  ['1 stay', 'is all most guests ever make when nobody remembers them or follows up'],
]

const PACKAGES = [
  { name: 'Essential', for: 'Boutique hotels & homestays', items: ['Custom website (up to 12 pages)', 'Direct booking engine', 'Payment gateway integration', 'WhatsApp & enquiry forms', 'Basic SEO & Google Business setup'], time: '3–4 weeks' },
  { name: 'Professional', for: 'Heritage & resort properties', items: ['Everything in Essential', 'Hotel management system (front desk, housekeeping, billing)', 'Staff roster & inventory', 'Reports dashboard', 'Staff training'], time: '6–8 weeks', featured: true },
  { name: 'Enterprise', for: 'Groups & multi-property chains', items: ['Everything in Professional', 'Guest CRM, loyalty & campaigns', 'Multi-property & role-based access', 'Channel manager / OTA integration', 'Priority support & SLAs'], time: '10–14 weeks' },
]

const PROCESS = [
  { icon: Search, t: 'Discover', d: 'I visit or call, understand your property, guests and daily operations.' },
  { icon: Layers, t: 'Design', d: 'Clickable designs of your website and screens — you approve before build.' },
  { icon: Code2, t: 'Build', d: 'Weekly demos on a live preview link so you see progress as it happens.' },
  { icon: Rocket, t: 'Launch', d: 'Data migration, staff training, go-live on your domain.' },
  { icon: ShieldCheck, t: 'Support', d: 'Updates, hosting, backups and improvements — as your partner.' },
]

const FAQ = [
  ['Is this demo a real, working system?', 'Yes. Everything you click is functional — bookings, check-ins, invoices, campaigns. For the demo, data lives in your browser; for your hotel it runs on a secure cloud database with user logins and real payments.'],
  ['Can you customise it for my hotel?', 'Completely. The design, content, room types, taxes, policies and workflows are built around your property and brand — this demo shows a fictional heritage group to illustrate what is possible.'],
  ['Do I have to take all four products?', 'No. Many hotels start with the website and booking engine to cut OTA commission, then add the management system and CRM later. Everything is designed to connect.'],
  ['Will it work with my existing PMS or channel manager?', 'Where your current systems offer APIs (most modern PMS and channel managers do), I can integrate rather than replace.'],
  ['What about hosting, security and maintenance?', 'I handle hosting, SSL, daily backups and updates on a simple monthly plan, so you never have to think about it.'],
]

function FlowDiagram() {
  const nodes = [
    { x: 40, y: 40, t: 'Guest website', s: 'Brand & content', c: '#9E3B2A' },
    { x: 40, y: 190, t: 'Booking engine', s: 'Rates & payment', c: '#9E3B2A' },
    { x: 380, y: 115, t: 'Virasat One', s: 'Shared data hub', c: '#B08D57' },
    { x: 720, y: 40, t: 'Hotel management', s: 'Rooms · staff · stock', c: '#1F4E5A' },
    { x: 720, y: 190, t: 'CRM & marketing', s: 'Guests · leads · loyalty', c: '#1F4E5A' },
  ]
  return (
    <svg viewBox="0 0 960 300" className="w-full" role="img" aria-label="How the products connect">
      <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#B08D57" /></marker></defs>
      {[[240, 75, 380, 150], [240, 225, 380, 165], [580, 150, 720, 75], [580, 165, 720, 225]].map(([a, b, c, d], i) => (
        <path key={i} d={`M${a} ${b} C ${(a + c) / 2} ${b}, ${(a + c) / 2} ${d}, ${c} ${d}`} fill="none" stroke="#B08D57" strokeWidth="1.5" strokeDasharray="5 5" markerEnd="url(#arr)">
          <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.2s" repeatCount="indefinite" />
        </path>
      ))}
      {nodes.map((n) => (
        <g key={n.t}>
          <rect x={n.x} y={n.y} width={n.t === 'Virasat One' ? 200 : 200} height="70" rx="10" fill={n.t === 'Virasat One' ? '#1C1A17' : '#fff'} stroke={n.c} strokeWidth="1.5" />
          <text x={n.x + 100} y={n.y + 32} textAnchor="middle" fontFamily="Cormorant Garamond" fontSize="21" fill={n.t === 'Virasat One' ? '#C9A978' : '#1C1A17'}>{n.t}</text>
          <text x={n.x + 100} y={n.y + 52} textAnchor="middle" fontFamily="Jost" fontSize="11" letterSpacing="1.5" fill={n.t === 'Virasat One' ? '#F6F1E7aa' : '#6B6358'}>{n.s.toUpperCase()}</text>
        </g>
      ))}
    </svg>
  )
}

export default function ForHoteliers() {
  const [faq, setFaq] = useState<number | null>(0)
  const [form, setForm] = useState({ name: '', hotel: '', rooms: '', interest: 'Website + Booking engine', message: '' })
  const mailto = `mailto:${DEVELOPER.email}?subject=${encodeURIComponent(`Project enquiry — ${form.hotel || 'Hotel'}`)}&body=${encodeURIComponent(`Name: ${form.name}\nHotel: ${form.hotel}\nRooms: ${form.rooms}\nInterested in: ${form.interest}\n\n${form.message}`)}`

  return (
    <div className="bg-ivory">
      <section className="grain relative overflow-hidden bg-kohl pb-24 pt-44 text-ivory">
        <img src={img('whiteArches', 2000)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.07]" />
        <div className="container-lux relative grid items-center gap-14 lg:grid-cols-[1.3fr_1fr]">
          <Reveal>
            <p className="eyebrow text-gold-2">For hotel owners & managers</p>
            <h1 className="mt-6 text-5xl leading-[1.05] md:text-7xl">Websites and software that <em className="text-gold-2">fill rooms</em> and run your hotel smoothly.</h1>
            <p className="mt-8 max-w-xl text-lg text-ivory/75">Everything on this site — the palace website, the booking engine, the hotel management system and the CRM — was designed and built by me as a working demonstration of what I can create for your property.</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="#contact" className="btn-primary">Discuss your project</a>
              <a href={`https://wa.me/${DEVELOPER.whatsapp}`} target="_blank" rel="noreferrer" className="btn-ghost-light"><MessageCircle size={15} /> WhatsApp me</a>
            </div>
          </Reveal>
          <Reveal delay={0.15} className="grid grid-cols-2 gap-4">
            {[['4', 'connected products'], ['40+', 'working screens'], ['5', 'staff roles'], ['100%', 'mobile responsive']].map(([n, l]) => (
              <div key={l} className="border border-ivory/15 p-6"><p className="font-display text-5xl text-gold-2">{n}</p><p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-ivory/60">{l}</p></div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="py-24">
        <div className="container-lux">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">The problem</p>
            <h2 className="mt-4 text-4xl md:text-5xl">Great hotels, held back by tools that don’t talk to each other</h2>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {PROBLEMS.map(([n, t], i) => <Reveal key={t} delay={i * 0.1} className="border-t-2 border-sindoor bg-white p-8"><p className="font-display text-6xl text-sindoor">{n}</p><p className="mt-3 text-stone">{t}</p></Reveal>)}
          </div>
        </div>
      </section>

      <section className="bg-sand/50 py-24">
        <div className="container-lux">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">What I build</p>
            <h2 className="mt-4 text-4xl md:text-5xl">Four products. One connected platform.</h2>
            <Ornament className="mt-6" />
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {PRODUCTS.map((p, i) => (
              <Reveal key={p.name} delay={(i % 2) * 0.1} className="flex flex-col bg-ivory p-8 ring-1 ring-kohl/5 md:p-10">
                <div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-full bg-kohl text-gold-2"><p.icon size={20} /></span><div><h3 className="text-3xl">{p.name}</h3><p className="text-sm text-sindoor">{p.tag}</p></div></div>
                <ul className="mt-6 space-y-2.5">{p.points.map((x) => <li key={x} className="flex gap-3 text-stone"><Check size={16} className="mt-1 shrink-0 text-gold" /> {x}</li>)}</ul>
                <div className="mt-auto flex flex-wrap gap-4 pt-8">{p.demo.map(([l, to]) => <Link key={to} to={to} className="link-lux">{l} <ArrowRight size={13} /></Link>)}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container-lux">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">How it connects</p>
            <h2 className="mt-4 text-4xl">A booking on your website updates everything — instantly</h2>
            <p className="mt-4 text-stone">The room is assigned, inventory is allocated, the guest profile is created in the CRM and the confirmation goes out. No double entry, no missed details.</p>
          </Reveal>
          <Reveal className="mt-12 overflow-x-auto"><div className="min-w-[760px]"><FlowDiagram /></div></Reveal>
          <div className="mt-10 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {[[Zap, 'Real-time sync', 'Rates and availability change everywhere at once'], [Users, 'Role-based access', 'Owner, GM, front desk, housekeeping, sales'], [BarChart3, 'Live reporting', 'Occupancy, ADR, RevPAR, channel mix'], [Smartphone, 'Mobile-first', 'Works on phones for staff on the move']].map(([I, t, d]) => {
              const Icon = I as typeof Zap
              return <div key={t as string} className="flex gap-3 border border-kohl/10 p-5"><Icon size={18} className="shrink-0 text-gold" /><div><p className="font-medium">{t as string}</p><p className="text-stone">{d as string}</p></div></div>
            })}
          </div>
        </div>
      </section>

      <section className="bg-kohl py-24 text-ivory">
        <div className="container-lux">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="eyebrow text-gold-2">Packages</p>
            <h2 className="mt-4 text-4xl md:text-5xl">Start where it matters most</h2>
            <p className="mt-4 text-ivory/60">Every project is quoted to your property’s size and needs. Pay in milestones.</p>
          </Reveal>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {PACKAGES.map((p) => (
              <Reveal key={p.name} className={clsx('flex flex-col p-8', p.featured ? 'bg-ivory text-kohl' : 'border border-ivory/15')}>
                {p.featured && <span className="mb-4 self-start bg-sindoor px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-ivory">Most popular</span>}
                <h3 className="text-4xl">{p.name}</h3>
                <p className={clsx('mt-1 text-sm', p.featured ? 'text-stone' : 'text-ivory/60')}>{p.for}</p>
                <ul className="mt-6 space-y-3 text-sm">{p.items.map((x) => <li key={x} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-gold" /> {x}</li>)}</ul>
                <p className={clsx('mt-auto pt-8 text-xs uppercase tracking-[0.2em]', p.featured ? 'text-stone' : 'text-ivory/50')}>Typical timeline · {p.time}</p>
                <a href="#contact" className={clsx('mt-4', p.featured ? 'btn-primary' : 'btn-ghost-light')}>Request a quote</a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container-lux">
          <Reveal className="text-center"><p className="eyebrow">How we’ll work together</p><h2 className="mt-4 text-4xl">A clear, collaborative process</h2></Reveal>
          <div className="mt-14 grid gap-8 md:grid-cols-5">
            {PROCESS.map((s, i) => (
              <Reveal key={s.t} delay={i * 0.08} className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold/50 text-gold"><s.icon size={20} /></span>
                <p className="mt-2 text-xs text-stone">0{i + 1}</p>
                <p className="font-display text-2xl">{s.t}</p>
                <p className="mt-2 text-sm text-stone">{s.d}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[[Rocket, 'Fast', 'Sub-second page loads; built for Lighthouse 90+'], [Lock, 'Secure', 'HTTPS, role-based logins, daily backups'], [LineChart, 'Measurable', 'Analytics & conversion tracking from day one'], [Sparkles, 'Integrations', 'Razorpay, WhatsApp Business, Google Hotel Ads, OTAs']].map(([I, t, d]) => {
              const Icon = I as typeof Zap
              return <div key={t as string} className="bg-white p-6 ring-1 ring-kohl/5"><Icon size={20} className="text-sindoor" /><p className="mt-3 font-display text-2xl">{t as string}</p><p className="mt-1 text-sm text-stone">{d as string}</p></div>
            })}
          </div>
        </div>
      </section>

      <section className="bg-sand/50 py-24">
        <div className="container-lux max-w-3xl">
          <Reveal className="text-center"><p className="eyebrow">Questions</p><h2 className="mt-4 text-4xl">Frequently asked</h2></Reveal>
          <div className="mt-10 divide-y divide-kohl/10 border-y border-kohl/10">
            {FAQ.map(([q, a], i) => (
              <div key={q}>
                <button onClick={() => setFaq(faq === i ? null : i)} className="flex w-full items-center justify-between py-5 text-left"><span className="font-display text-2xl">{q}</span><ChevronDown className={clsx('shrink-0 transition', faq === i && 'rotate-180')} size={18} /></button>
                {faq === i && <p className="pb-6 text-stone">{a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-28 py-24">
        <div className="container-lux grid gap-14 lg:grid-cols-2">
          <Reveal>
            <p className="eyebrow">Let’s talk</p>
            <h2 className="mt-4 text-5xl leading-tight">Ready to give your hotel the platform it deserves?</h2>
            <p className="mt-6 text-lg text-stone">Tell me a little about your property. I’ll reply within a day with ideas and a free walkthrough tailored to your hotel.</p>
            <div className="mt-10 space-y-4">
              <p className="font-display text-3xl">{DEVELOPER.name}</p>
              <p className="text-stone">{DEVELOPER.title} · {DEVELOPER.city}</p>
              <a href={`mailto:${DEVELOPER.email}`} className="flex items-center gap-3 hover:text-sindoor"><Mail size={16} className="text-gold" /> {DEVELOPER.email}</a>
              <a href={`tel:${DEVELOPER.phone}`} className="flex items-center gap-3 hover:text-sindoor"><Phone size={16} className="text-gold" /> {DEVELOPER.phone}</a>
              <a href={`https://wa.me/${DEVELOPER.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-sindoor"><MessageCircle size={16} className="text-gold" /> WhatsApp</a>
              <div className="flex gap-5 pt-2 text-sm"><a href={DEVELOPER.links.github} target="_blank" rel="noreferrer" className="link-lux">GitHub</a><a href={DEVELOPER.links.linkedin} target="_blank" rel="noreferrer" className="link-lux">LinkedIn</a><Link to="/behind-the-build" className="link-lux">Behind the build</Link></div>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="bg-white p-8 shadow-[0_30px_80px_-30px_rgba(28,26,23,0.3)] md:p-10">
            <div className="grid gap-6 md:grid-cols-2">
              <label><span className="field-label">Your name</span><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label><span className="field-label">Hotel / property</span><input className="field" value={form.hotel} onChange={(e) => setForm({ ...form, hotel: e.target.value })} /></label>
              <label><span className="field-label">Number of rooms</span><input className="field" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} /></label>
              <label><span className="field-label">Interested in</span><select className="field" value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })}>{['Website + Booking engine', 'Hotel management system', 'CRM & marketing', 'The complete platform', 'Not sure yet'].map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="md:col-span-2"><span className="field-label">Tell me about your hotel</span><textarea rows={4} className="field resize-none" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
            </div>
            <a href={mailto} className="btn-primary mt-8 w-full"><Mail size={14} /> Send enquiry</a>
            <p className="mt-3 text-center text-xs text-stone">Opens your email app with the details filled in.</p>
            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-kohl/10 pt-6 text-center text-xs text-stone">
              <span><Boxes size={16} className="mx-auto mb-1 text-gold" />Free walkthrough</span>
              <span><Code2 size={16} className="mx-auto mb-1 text-gold" />Weekly demos</span>
              <span><ShieldCheck size={16} className="mx-auto mb-1 text-gold" />Ongoing support</span>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
