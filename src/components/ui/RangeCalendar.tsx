import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isBefore, parseISO, startOfMonth, startOfToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { iso } from '../../lib/utils'

type Props = {
  checkIn: string | null
  checkOut: string | null
  onChange: (ci: string | null, co: string | null) => void
  priceFor?: (d: string) => number | null
  months?: 1 | 2
}

const shortPrice = (v: number) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${Math.round(v / 1000)}k`)

export default function RangeCalendar({ checkIn, checkOut, onChange, priceFor, months = 2 }: Props) {
  const [base, setBase] = useState(startOfMonth(checkIn ? parseISO(checkIn) : new Date()))
  const today = startOfToday()

  const click = (d: string) => {
    if (!checkIn || (checkIn && checkOut)) return onChange(d, null)
    if (d <= checkIn) return onChange(d, null)
    onChange(checkIn, d)
  }

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => setBase(addMonths(base, -1))} disabled={!isBefore(today, base)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-sand disabled:opacity-30">
          <ChevronLeft size={16} />
        </button>
        <button type="button" aria-label="Next month" onClick={() => setBase(addMonths(base, 1))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-sand">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className={clsx('grid gap-8', months === 2 && 'md:grid-cols-2')}>
        {Array.from({ length: months }, (_, m) => {
          const month = addMonths(base, m)
          const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
          const pad = (getDay(days[0]) + 6) % 7
          return (
            <div key={m} className={clsx(m === 1 && 'hidden md:block')}>
              <p className="mb-3 text-center font-display text-xl">{format(month, 'MMMM yyyy')}</p>
              <div className="grid grid-cols-7 text-center text-[10px] uppercase tracking-widest text-stone">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <span key={d} className="py-1">{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: pad }, (_, i) => <span key={`p${i}`} />)}
                {days.map((d) => {
                  const ds = iso(d)
                  const past = isBefore(d, today)
                  const isStart = ds === checkIn
                  const isEnd = ds === checkOut
                  const inRange = checkIn && checkOut && ds > checkIn && ds < checkOut
                  const price = priceFor && !past ? priceFor(ds) : null
                  return (
                    <button
                      type="button"
                      key={ds}
                      disabled={past}
                      onClick={() => click(ds)}
                      className={clsx(
                        'relative flex h-12 flex-col items-center justify-center text-sm transition-colors',
                        past && 'cursor-not-allowed text-stone/35',
                        !past && !isStart && !isEnd && 'hover:bg-sand',
                        inRange && 'bg-sand',
                        (isStart || isEnd) && 'bg-kohl text-ivory',
                      )}
                    >
                      <span>{d.getDate()}</span>
                      {price !== null && price !== undefined && (
                        <span className={clsx('text-[9px] tracking-wide', isStart || isEnd ? 'text-gold-2' : price === 0 ? 'text-sindoor' : 'text-stone')}>{price === 0 ? 'full' : shortPrice(price)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
