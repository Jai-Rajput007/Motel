import clsx from 'clsx'
import { Delete } from 'lucide-react'
import { useState } from 'react'

export function PinLock({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
  const [v, setV] = useState('')
  const [bad, setBad] = useState(false)
  const press = (d: string) => {
    if (v.length >= pin.length) return
    const next = v + d
    setV(next)
    if (next.length === pin.length) {
      if (next === pin) onUnlock()
      else {
        setBad(true)
        setTimeout(() => {
          setV('')
          setBad(false)
        }, 600)
      }
    }
  }
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-bg px-6 py-10">
      <img src="/favicon.svg" alt="" className="h-16 w-16" />
      <h1 className="mt-4 text-xl font-bold">The Momos Spot</h1>
      <p className="mt-1 text-sm text-muted">Enter PIN</p>
      <div className={clsx('my-8 flex gap-4', bad && 'animate-pulse')}>
        {Array.from({ length: pin.length }, (_, i) => (
          <span key={i} className={clsx('h-4 w-4 rounded-full border-2', bad ? 'border-bad bg-bad' : i < v.length ? 'border-brand bg-brand' : 'border-line')} />
        ))}
      </div>
      <div className="grid w-full max-w-xs grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              onClick={() => (k === '⌫' ? setV(v.slice(0, -1)) : press(k))}
              className="flex h-16 items-center justify-center rounded-2xl bg-surface text-2xl font-semibold shadow-sm active:bg-surface-2"
              aria-label={k === '⌫' ? 'Delete' : k}
            >
              {k === '⌫' ? <Delete /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
