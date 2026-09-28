import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Lotus, Ornament, Reveal } from '../../components/ui/primitives'

const PALETTE = [['Ivory', '#F6F1E7', 'Page — handmade paper'], ['Sandstone', '#E9DFCC', 'Sections — Jaipur stone'], ['Kohl', '#1C1A17', 'Type — kajal black'], ['Antique Gold', '#B08D57', 'Accents — temple gilt'], ['Sindoor', '#9E3B2A', 'Actions — vermilion'], ['Peacock', '#1F4E5A', 'Software — national bird']]
const STACK = [['React 19 + TypeScript', 'Type-safe, component-driven UI'], ['Vite', 'Instant dev server, optimised builds'], ['Tailwind CSS v4', 'Design tokens as the single source of style'], ['Zustand', 'One shared store linking website, PMS & CRM'], ['Framer Motion', 'Restrained, cinematic motion'], ['Recharts', 'Dashboards & reports'], ['Leaflet + OpenStreetMap', 'Maps without API keys'], ['date-fns', 'Calendars, stays and seasons']]

export default function BehindTheBuild() {
  return (
    <div className="pb-24 pt-[160px]">
      <div className="container-lux max-w-4xl">
        <Reveal className="text-center">
          <p className="eyebrow">Case study</p>
          <h1 className="mt-4 text-5xl leading-tight md:text-6xl">Behind the build</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-stone">How a fictional heritage hotel group became a complete, working showcase: design decisions, architecture, and what it would take to launch for a real property.</p>
          <Ornament className="mt-10" />
        </Reveal>

        <Reveal className="mt-20">
          <h2 className="text-4xl">1 · Design direction — “quiet luxury, Indian soul”</h2>
          <p className="mt-4 text-stone">India’s great hotel brands share a restraint that templates rarely capture: generous whitespace, photography that does the talking, serif typography with small-caps eyebrows, and ornament used sparingly. Cultural references — jaali lattices, the mehrab arch, lotus dividers — appear as quiet details rather than decoration.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
            {PALETTE.map(([n, hex, d]) => (
              <div key={n} className="overflow-hidden ring-1 ring-kohl/10"><div className="h-20" style={{ background: hex }} /><div className="bg-white p-3"><p className="font-medium">{n}</p><p className="font-mono text-xs text-stone">{hex}</p><p className="text-xs text-stone">{d}</p></div></div>
            ))}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="bg-white p-6 ring-1 ring-kohl/5"><p className="font-display text-4xl">Cormorant</p><p className="text-sm text-stone">Display serif — the voice of the brand</p></div>
            <div className="bg-white p-6 ring-1 ring-kohl/5"><p className="text-2xl">Jost</p><p className="text-sm text-stone">Geometric sans for UI & the software</p></div>
            <div className="bg-white p-6 ring-1 ring-kohl/5"><p className="font-deva text-3xl">विरासत</p><p className="text-sm text-stone">Tiro Devanagari for Hindi</p></div>
          </div>
          <div className="mt-8 flex items-center gap-8 bg-sand/60 p-6">
            <div className="jaali-bg h-24 w-24 shrink-0 bg-ivory" />
            <div className="arch h-24 w-20 shrink-0 bg-sindoor/80" />
            <Lotus className="w-20 text-gold" />
            <p className="text-sm text-stone">Jaali pattern, mehrab arch mask and lotus ornament — drawn as lightweight SVG and CSS, no image files.</p>
          </div>
        </Reveal>

        <Reveal className="mt-20">
          <h2 className="text-4xl">2 · Architecture</h2>
          <p className="mt-4 text-stone">All four products read and write the same data through one store and a pricing engine. In production, this layer is swapped for a secure API and database — the screens don’t change.</p>
          <pre className="mt-6 overflow-x-auto bg-kohl p-6 text-[13px] leading-relaxed text-ivory/90">{`Guest website ─┐                      ┌─ PMS: front desk · tape chart · housekeeping
Booking engine ─┼──►  Shared data layer ◄─┼─ Staff · inventory · billing · reports
Enquiry forms ──┘   (bookings, rooms,    └─ CRM: guests · segments · pipeline · campaigns
                     guests, stock…)
                          │
                  Pricing engine: seasons · weekends · rate plans · promo codes · GST
                  Availability: per-night inventory · stop-sell · overbooking guard`}</pre>
        </Reveal>

        <Reveal className="mt-20">
          <h2 className="text-4xl">3 · Technology</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {STACK.map(([t, d]) => <div key={t} className="flex items-baseline justify-between gap-4 border-b border-kohl/10 py-3"><span className="font-medium">{t}</span><span className="text-right text-sm text-stone">{d}</span></div>)}
          </div>
        </Reveal>

        <Reveal className="mt-20">
          <h2 className="text-4xl">4 · What’s real, and what’s simulated</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="bg-white p-6 ring-1 ring-leaf/30"><p className="font-display text-2xl text-leaf">Fully working</p><ul className="mt-3 space-y-1.5 text-sm text-stone"><li>Availability, pricing, promo codes & GST</li><li>Bookings → room assignment → PMS → CRM</li><li>Check‑in/out, folios, invoices, tape‑chart moves</li><li>Housekeeping, staff roster, inventory & POs</li><li>Segments, pipeline, campaigns, loyalty, reviews</li><li>Role-based access, audit log, CSV export</li></ul></div>
            <div className="bg-white p-6 ring-1 ring-gold/40"><p className="font-display text-2xl text-[#8a6a36]">Simulated for the demo</p><ul className="mt-3 space-y-1.5 text-sm text-stone"><li>Data is stored in your browser (resettable)</li><li>Payment gateway runs in test mode</li><li>Emails & WhatsApp are previewed, not sent</li><li>OTA channel sync is illustrative</li><li>Photography: Unsplash (free licence); brand is fictional</li></ul></div>
          </div>
        </Reveal>

        <Reveal className="mt-20 bg-kohl p-10 text-center text-ivory">
          <h2 className="text-4xl">Going live for your hotel</h2>
          <p className="mx-auto mt-4 max-w-xl text-ivory/70">Real database & logins · Razorpay/Stripe payments · transactional email & WhatsApp Business · your domain, content and photography · staff training.</p>
          <Link to="/for-hoteliers#contact" className="btn-primary mt-8">Start a conversation <ArrowRight size={14} /></Link>
        </Reveal>
      </div>
    </div>
  )
}
