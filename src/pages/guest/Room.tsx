import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BedDouble, Check, Eye, Maximize2, Users } from 'lucide-react'
import { parseISO } from 'date-fns'
import clsx from 'clsx'
import { hotelBySlug } from '../../data/hotels'
import { RATE_PLANS } from '../../data/content'
import { availability, nightlyRate, quote } from '../../lib/pricing'
import { addDaysISO, todayISO } from '../../lib/utils'
import { useStore } from '../../store/useStore'
import RangeCalendar from '../../components/ui/RangeCalendar'
import Lightbox from '../../components/ui/Lightbox'
import { Img, Money, Reveal } from '../../components/ui/primitives'

export default function RoomPage() {
  const { slug, roomId } = useParams()
  const hotel = hotelBySlug(slug ?? '')
  const room = hotel?.roomTypes.find((r) => r.id === roomId)
  const { bookings, rooms, rateOverrides, stopSell } = useStore()
  const nav = useNavigate()
  const [ci, setCi] = useState<string | null>(addDaysISO(todayISO(), 10))
  const [co, setCo] = useState<string | null>(addDaysISO(todayISO(), 13))
  const [lb, setLb] = useState<number | null>(null)
  if (!hotel || !room) return <Navigate to="/destinations" replace />

  const images = [...room.images, ...hotel.gallery.slice(0, 3)]
  const priceFor = (d: string) => (availability(room.id, d, addDaysISO(d, 1), bookings, rooms, stopSell) === 0 ? 0 : nightlyRate(room.id, parseISO(d), rateOverrides))
  const avail = ci && co ? availability(room.id, ci, co, bookings, rooms, stopSell) : null

  return (
    <div className="pt-[120px]">
      <div className="container-lux py-8">
        <Link to={`/hotels/${hotel.slug}#rooms`} className="link-lux"><ArrowLeft size={14} /> {hotel.name}</Link>
      </div>
      <div className="container-lux grid gap-3 md:grid-cols-4 md:grid-rows-2">
        {images.slice(0, 5).map((k, i) => (
          <button key={k + i} onClick={() => setLb(i)} className={clsx('group', i === 0 && 'md:col-span-2 md:row-span-2')}>
            <Img k={k} w={i === 0 ? 1600 : 700} className={clsx('h-full', i === 0 ? 'aspect-[4/3]' : 'aspect-[4/3] md:aspect-auto md:h-full')} zoom alt="" />
          </button>
        ))}
      </div>
      <Lightbox images={images} index={lb} onClose={() => setLb(null)} onIndex={setLb} />

      <div className="container-lux grid gap-16 py-16 lg:grid-cols-[1.3fr_1fr]">
        <Reveal>
          <p className="eyebrow">{hotel.name} · {room.category}</p>
          <h1 className="mt-3 text-5xl md:text-6xl">{room.name}</h1>
          <div className="mt-8 grid grid-cols-2 gap-5 border-y border-kohl/10 py-6 text-sm md:grid-cols-4">
            <span className="flex items-center gap-2"><Maximize2 size={16} className="text-gold" /> {room.size} m²</span>
            <span className="flex items-center gap-2"><BedDouble size={16} className="text-gold" /> {room.bed}</span>
            <span className="flex items-center gap-2"><Eye size={16} className="text-gold" /> {room.view}</span>
            <span className="flex items-center gap-2"><Users size={16} className="text-gold" /> {room.maxGuests} guests</span>
          </div>
          <p className="mt-8 text-lg leading-relaxed text-stone">{room.description} Every detail — from the hand-knotted rug to the brass bell for your butler — has been chosen to honour the house’s history while offering every modern comfort.</p>
          <h2 className="mt-12 text-3xl">In your room</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {[...room.amenities, 'High-speed Wi‑Fi', 'Smart TV with Chromecast', 'Air‑conditioning & heating', 'In‑room safe', 'Organic Ayurvedic toiletries', '24‑hour in‑room dining'].map((a) => (
              <li key={a} className="flex items-center gap-3 text-stone"><Check size={15} className="text-gold" /> {a}</li>
            ))}
          </ul>
          <h2 className="mt-12 text-3xl">Rate plans</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {RATE_PLANS.map((p) => {
              const q = ci && co ? quote({ roomTypeId: room.id, checkIn: ci, checkOut: co, ratePlanId: p.id, addOns: [], adults: 2, children: 0, overrides: rateOverrides }) : null
              return (
                <div key={p.id} className="border border-kohl/10 p-5">
                  <p className="font-display text-xl">{p.name}</p>
                  <p className="mt-1 text-sm text-stone">{p.description}</p>
                  {q && <p className="mt-3 text-sm"><Money v={Math.round(q.roomTotal / q.n)} className="font-display text-2xl" /> <span className="text-stone">avg / night</span></p>}
                </div>
              )
            })}
          </div>
        </Reveal>

        <aside className="lg:sticky lg:top-36 lg:self-start">
          <div className="bg-white p-6 shadow-[0_20px_60px_-20px_rgba(28,26,23,0.25)] ring-1 ring-kohl/5">
            <p className="eyebrow mb-4">Nightly rates & availability</p>
            <RangeCalendar months={1} checkIn={ci} checkOut={co} onChange={(a, b) => { setCi(a); setCo(b) }} priceFor={priceFor} />
            <div className="mt-5 border-t border-kohl/10 pt-5">
              {avail === null ? (
                <p className="text-sm text-stone">Select your departure date.</p>
              ) : avail === 0 ? (
                <p className="text-sm text-sindoor">Sold out for these dates — try nearby dates or another room.</p>
              ) : (
                <>
                  {avail <= 2 && <p className="mb-2 text-sm text-sindoor">Only {avail} left for your dates</p>}
                  <button onClick={() => nav(`/book?hotel=${hotel.id}&room=${room.id}&in=${ci}&out=${co}&adults=2`)} className="btn-primary w-full">Reserve this room</button>
                </>
              )}
              <p className="mt-3 text-center text-xs text-stone">Best rate guaranteed when booking direct · Free cancellation on flexible rates</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
