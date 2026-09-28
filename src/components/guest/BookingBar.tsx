import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, format, parseISO } from 'date-fns'
import { Minus, Plus, Search } from 'lucide-react'
import clsx from 'clsx'
import { HOTELS } from '../../data/hotels'
import { iso, nightsBetween } from '../../lib/utils'
import RangeCalendar from '../ui/RangeCalendar'
import { useT } from '../../i18n'

function useOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && cb()
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, cb])
}

export function Stepper({ label, sub, value, set, min = 0, max = 8 }: { label: string; sub?: string; value: number; set: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm">{label}</p>
        {sub && <p className="text-xs text-stone">{sub}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => set(value - 1)} className="grid h-8 w-8 place-items-center rounded-full border border-kohl/20 disabled:opacity-30"><Minus size={14} /></button>
        <span className="w-4 text-center tabular-nums">{value}</span>
        <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => set(value + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-kohl/20 disabled:opacity-30"><Plus size={14} /></button>
      </div>
    </div>
  )
}

function Field({ label, children, onClick, active, className }: { label: string; children: ReactNode; onClick?: () => void; active?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={clsx('group flex flex-col items-start px-6 py-4 text-left transition-colors', active ? 'bg-sand/70' : 'hover:bg-sand/40', className)}>
      <span className="text-[10px] uppercase tracking-[0.28em] text-stone">{label}</span>
      <span className="mt-1.5 font-display text-[1.35rem] leading-none text-kohl">{children}</span>
    </button>
  )
}

export default function BookingBar({ hotelId, compact = false }: { hotelId?: string; compact?: boolean }) {
  const t = useT()
  const nav = useNavigate()
  const [hotel, setHotel] = useState(hotelId ?? '')
  const [ci, setCi] = useState<string | null>(iso(addDays(new Date(), 14)))
  const [co, setCo] = useState<string | null>(iso(addDays(new Date(), 17)))
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [promo, setPromo] = useState('')
  const [open, setOpen] = useState<'hotel' | 'dates' | 'guests' | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, () => setOpen(null))

  const submit = () => {
    const p = new URLSearchParams()
    if (hotel) p.set('hotel', hotel)
    if (ci) p.set('in', ci)
    if (co) p.set('out', co ?? iso(addDays(parseISO(ci!), 1)))
    p.set('adults', String(adults))
    p.set('children', String(children))
    if (promo) p.set('promo', promo.toUpperCase())
    nav(`/book?${p.toString()}`)
  }

  const hotelName = HOTELS.find((h) => h.id === hotel)
  return (
    <div ref={ref} className={clsx('relative bg-ivory shadow-[0_30px_80px_-20px_rgba(28,26,23,0.35)]', compact ? '' : 'mx-auto max-w-[1180px]')}>
      <div className="grid grid-cols-1 divide-y divide-kohl/10 md:grid-cols-[1.4fr_1.6fr_1fr_1fr_auto] md:divide-x md:divide-y-0">
        {!hotelId && (
          <Field label={t('Destination')} onClick={() => setOpen(open === 'hotel' ? null : 'hotel')} active={open === 'hotel'}>
            {hotelName ? hotelName.city : 'All palaces'}
          </Field>
        )}
        <Field label={`${t('Check-in')} — ${t('Check-out')}`} onClick={() => setOpen(open === 'dates' ? null : 'dates')} active={open === 'dates'} className={hotelId ? 'md:col-span-2' : ''}>
          {ci ? format(parseISO(ci), 'dd MMM') : 'Select'} <span className="text-gold">—</span> {co ? format(parseISO(co), 'dd MMM') : '…'}
          {ci && co && <span className="ml-2 font-sans text-xs text-stone">{nightsBetween(ci, co)} nights</span>}
        </Field>
        <Field label={t('Guests')} onClick={() => setOpen(open === 'guests' ? null : 'guests')} active={open === 'guests'}>
          {adults} adult{adults > 1 && 's'}{children > 0 && `, ${children} child${children > 1 ? 'ren' : ''}`}
        </Field>
        <label className="flex flex-col justify-center px-6 py-4">
          <span className="text-[10px] uppercase tracking-[0.28em] text-stone">{t('Promo code')}</span>
          <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Optional" className="mt-1 w-full bg-transparent font-display text-[1.25rem] uppercase outline-none placeholder:normal-case placeholder:text-stone/50" />
        </label>
        <button onClick={submit} className="flex items-center justify-center gap-3 bg-sindoor px-9 py-5 text-[12px] uppercase tracking-[0.25em] text-ivory transition-colors duration-500 hover:bg-kohl">
          <Search size={16} /> {t('Check availability')}
        </button>
      </div>

      {open === 'hotel' && (
        <div className="absolute left-0 top-full z-30 mt-2 w-full max-w-md bg-ivory p-3 shadow-2xl">
          {[{ id: '', city: 'All palaces', name: 'Search across our six homes' }, ...HOTELS].map((h) => (
            <button key={h.id} onClick={() => { setHotel(h.id); setOpen('dates') }} className={clsx('flex w-full items-baseline justify-between px-4 py-3 text-left hover:bg-sand', hotel === h.id && 'bg-sand')}>
              <span className="font-display text-xl">{h.city}</span>
              <span className="text-xs text-stone">{h.name}</span>
            </button>
          ))}
        </div>
      )}
      {open === 'dates' && (
        <div className="absolute left-0 top-full z-30 mt-2 w-full bg-ivory p-6 shadow-2xl md:left-auto md:right-0 md:w-[680px]">
          <RangeCalendar checkIn={ci} checkOut={co} onChange={(a, b) => { setCi(a); setCo(b); if (a && b) setOpen('guests') }} />
          <p className="mt-4 text-xs text-stone">Select your arrival, then your departure date.</p>
        </div>
      )}
      {open === 'guests' && (
        <div className="absolute right-0 top-full z-30 mt-2 w-full max-w-sm bg-ivory px-6 py-3 shadow-2xl">
          <Stepper label="Adults" sub="Ages 13+" value={adults} set={setAdults} min={1} max={6} />
          <Stepper label="Children" sub="Ages 0–12" value={children} set={setChildren} max={4} />
          <button onClick={() => setOpen(null)} className="btn-dark mt-2 w-full">Done</button>
        </div>
      )}
    </div>
  )
}
