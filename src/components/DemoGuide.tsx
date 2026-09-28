import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronRight, Play, RotateCcw, X, Zap } from 'lucide-react'
import clsx from 'clsx'
import { useStore } from '../store/useStore'

export const TOUR = [
  { title: 'The brand experience', text: 'Scroll the homepage: cinematic hero, heritage storytelling, destinations and offers.', to: '/' },
  { title: 'Explore a palace', text: 'A full property page with rooms, dining, experiences, gallery and map.', to: '/hotels/jal-mahal-niwas-udaipur' },
  { title: 'Book a suite', text: 'Live availability, dynamic pricing, rate plans, add-ons and promo code VIRASAT10.', to: '/book?hotel=jmn&promo=VIRASAT10' },
  { title: 'It lands in the PMS', text: 'Your booking appears instantly in Reservations, with a room auto‑assigned.', to: '/admin/reservations' },
  { title: 'Tape chart', text: 'Drag bookings between rooms and dates. Conflicts are blocked automatically.', to: '/admin/tape-chart' },
  { title: 'Guest 360° in the CRM', text: 'A guest profile was created with stays, spend, points and preferences.', to: '/admin/crm/guests' },
  { title: 'Wedding enquiry → lead', text: 'Submit an enquiry on the Weddings page…', to: '/weddings' },
  { title: 'Sales pipeline', text: '…and watch it arrive as a new lead on the Kanban board.', to: '/admin/crm/pipeline' },
  { title: 'Operations', text: 'Housekeeping board, staff roster, inventory with low‑stock alerts and purchase orders.', to: '/admin/housekeeping' },
  { title: 'Let’s work together', text: 'What I can build for your hotel, how I work, and how to reach me.', to: '/for-hoteliers' },
]

export default function DemoGuide({ admin = false }: { admin?: boolean }) {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const { tourStep, setUI, resetDemo, simulateBusyDay } = useStore()
  const nav = useNavigate()
  const go = (i: number) => { setUI({ tourStep: i }); nav(TOUR[i].to) }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={clsx('fixed z-40 flex items-center gap-2 rounded-full px-4 py-3 text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all', admin ? 'bottom-5 right-5 bg-gold text-kohl hover:bg-gold-2' : 'bottom-5 right-[84px] bg-kohl text-ivory hover:bg-sindoor')}
      >
        <Play size={13} className={clsx(tourStep === null && 'animate-pulse')} /> {tourStep === null ? 'Take the demo tour' : `Tour ${tourStep + 1}/${TOUR.length}`}
      </button>
      <AnimatePresence>
        {open && (
          <motion.aside initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="fixed bottom-20 right-5 z-50 w-[min(380px,calc(100vw-40px))] overflow-hidden rounded-2xl bg-kohl text-ivory shadow-2xl ring-1 ring-gold/30">
            <div className="flex items-start justify-between border-b border-ivory/10 p-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold">Guided demo</p>
                <p className="mt-1 font-display text-2xl">One connected hotel platform</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <ol className="max-h-[46vh] overflow-y-auto p-2">
              {TOUR.map((s, i) => (
                <li key={i}>
                  <button onClick={() => go(i)} className={clsx('flex w-full gap-3 rounded-xl p-3 text-left transition-colors', tourStep === i ? 'bg-ivory/10' : 'hover:bg-ivory/5')}>
                    <span className={clsx('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px]', tourStep !== null && i < tourStep ? 'bg-gold text-kohl' : tourStep === i ? 'bg-sindoor' : 'border border-ivory/30')}>
                      {tourStep !== null && i < tourStep ? <Check size={12} /> : i + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{s.title}</span>
                      <span className="block text-xs leading-relaxed text-ivory/60">{s.text}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-2 border-t border-ivory/10 p-4">
              <button onClick={() => go(tourStep === null ? 0 : Math.min(TOUR.length - 1, tourStep + 1))} className="flex items-center gap-1 rounded-full bg-sindoor px-4 py-2 text-xs uppercase tracking-widest hover:bg-sindoor-2">
                {tourStep === null ? 'Start' : 'Next'} <ChevronRight size={14} />
              </button>
              <button onClick={() => { const n = simulateBusyDay(); setMsg(`${n} new bookings arrived across the group`) }} className="flex items-center gap-1 rounded-full border border-ivory/20 px-3 py-2 text-xs hover:bg-ivory/10"><Zap size={13} /> Simulate busy day</button>
              <button onClick={() => { if (confirm('Reset all demo data to its original state?')) { resetDemo(); setUI({ tourStep: null }); setMsg('Demo data restored') } }} className="flex items-center gap-1 rounded-full border border-ivory/20 px-3 py-2 text-xs hover:bg-ivory/10"><RotateCcw size={13} /> Reset</button>
              {msg && <p className="w-full pt-1 text-xs text-gold-2">{msg}</p>}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
