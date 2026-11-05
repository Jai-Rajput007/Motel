import clsx from 'clsx'
import { ChevronLeft } from 'lucide-react'
import { createContext, forwardRef, useContext, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { fromLocalInput, toLocalInput } from '../lib/dates'
import { inr, paiseToInput, toPaise } from '../lib/money'

/* ---------- Buttons ---------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; block?: boolean; icon?: ReactNode }>(
  function Button({ variant = 'primary', size = 'md', block, icon, className, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        {...rest}
        className={clsx(
          'inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[.98] disabled:opacity-45 disabled:active:scale-100',
          size === 'sm' && 'min-h-9 px-3 text-sm',
          size === 'md' && 'min-h-12 px-4',
          size === 'lg' && 'min-h-14 px-5 text-lg',
          block && 'w-full',
          variant === 'primary' && 'bg-brand text-brand-ink shadow-sm',
          variant === 'secondary' && 'border border-line bg-surface text-ink',
          variant === 'ghost' && 'text-ink active:bg-surface-2',
          variant === 'soft' && 'bg-brand-soft text-brand-soft-ink',
          variant === 'danger' && 'bg-bad text-white',
          className,
        )}
      >
        {icon}
        {children}
      </button>
    )
  },
)

export function IconButton({ label, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} {...rest} className={clsx('inline-flex h-10 w-10 items-center justify-center rounded-full text-ink active:bg-surface-2', className)}>
      {children}
    </button>
  )
}

/* ---------- Layout ---------- */

export function Page({ title, back, actions, children, sub }: { title: ReactNode; back?: boolean | string; actions?: ReactNode; children: ReactNode; sub?: ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="mx-auto w-full max-w-lg pb-28">
      <header className="pt-safe sticky top-0 z-30 border-b border-line/70 bg-bg/90 backdrop-blur">
        <div className="flex min-h-14 items-center gap-1 px-2">
          {back && (
            <IconButton label="Back" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}>
              <ChevronLeft size={26} />
            </IconButton>
          )}
          <h1 className={clsx('min-w-0 flex-1 truncate text-xl font-bold', !back && 'pl-3')}>{title}</h1>
          <div className="flex items-center gap-1 pr-1">{actions}</div>
        </div>
        {sub}
      </header>
      <div className="px-4 pt-4">{children}</div>
    </div>
  )
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const C = onClick ? 'button' : 'div'
  return (
    <C onClick={onClick} className={clsx('block w-full rounded-3xl border border-line bg-surface p-4 text-left', onClick && 'active:bg-surface-2', className)}>
      {children}
    </C>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-6 mb-2 flex items-center justify-between px-1">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  )
}

export function Stat({ label, value, sub, tone }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'bad' | 'brand' }) {
  return (
    <div className="min-w-0 rounded-2xl bg-surface-2 p-3">
      <div className="truncate text-xs font-medium text-muted">{label}</div>
      <div className={clsx('tabular mt-0.5 truncate text-lg font-bold', tone === 'good' && 'text-good', tone === 'bad' && 'text-bad', tone === 'brand' && 'text-brand')}>{value}</div>
      {sub && <div className="truncate text-xs text-muted">{sub}</div>}
    </div>
  )
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <div className="font-semibold">{title}</div>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'bad' | 'warn' | 'brand' | 'info' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        tone === 'neutral' && 'bg-surface-2 text-muted',
        tone === 'good' && 'bg-good-soft text-good',
        tone === 'bad' && 'bg-bad-soft text-bad',
        tone === 'warn' && 'bg-warn-soft text-warn',
        tone === 'brand' && 'bg-brand-soft text-brand-soft-ink',
        tone === 'info' && 'bg-info-soft text-info',
      )}
    >
      {children}
    </span>
  )
}

export function Money({ p, sign, className, colored }: { p: number; sign?: boolean; className?: string; colored?: boolean }) {
  return <span className={clsx('tabular', colored && (p < 0 ? 'text-bad' : p > 0 ? 'text-good' : ''), className)}>{inr(p, { sign })}</span>
}

export function Progress({ value, max, tone = 'brand' }: { value: number; max: number; tone?: 'brand' | 'good' | 'bad' | 'warn' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className={clsx('h-full rounded-full', tone === 'brand' && 'bg-brand', tone === 'good' && 'bg-good', tone === 'bad' && 'bg-bad', tone === 'warn' && 'bg-warn')} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Row({ title, sub, right, onClick, left }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void; left?: ReactNode }) {
  const C = onClick ? 'button' : 'div'
  return (
    <C onClick={onClick} className={clsx('flex w-full items-center gap-3 px-4 py-3 text-left', onClick && 'active:bg-surface-2')}>
      {left}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{title}</div>
        {sub && <div className="truncate text-sm text-muted">{sub}</div>}
      </div>
      {right && <div className="shrink-0 text-right">{right}</div>}
    </C>
  )
}

export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface', className)}>{children}</div>
}

/* ---------- Forms ---------- */

/** Gives the first input inside a Field the Field's id, so the label is linked to it. */
const FieldId = createContext<string | undefined>(undefined)
const useFieldId = (own?: string) => {
  const ctx = useContext(FieldId)
  return own ?? ctx
}

export function Field({ label, hint, error, children, right }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; right?: ReactNode }) {
  const id = useId()
  return (
    <div className="mb-4 block min-w-0">
      {(label || right) && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label id={`${id}-l`} htmlFor={id} className="text-sm font-semibold">
            {label}
          </label>
          {right}
        </div>
      )}
      <FieldId.Provider value={id}>{children}</FieldId.Provider>
      {hint && !error && <div className="mt-1 text-xs text-muted">{hint}</div>}
      {error && <div className="mt-1 text-xs font-medium text-bad">{error}</div>}
    </div>
  )
}

const inputCls = 'w-full min-h-12 rounded-2xl border border-line bg-surface px-4 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-muted/70'

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, id, ...p }, ref) {
  return <input ref={ref} id={useFieldId(id)} {...p} className={clsx(inputCls, className)} />
})

export function TextArea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={2} id={useFieldId(p.id)} {...p} className={clsx(inputCls, 'py-3', p.className)} />
}

/** Rupee amount input that reports paise (null when empty or invalid). */
export function AmountInput({
  value,
  onChange,
  placeholder = '0',
  autoFocus,
  className,
  big,
}: {
  value: number | null
  onChange: (p: number | null) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  big?: boolean
}) {
  const fid = useFieldId()
  const [text, setText] = useState(() => paiseToInput(value))
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    if (toPaise(text) !== value) setText(paiseToInput(value))
  }
  return (
    <div className={clsx('relative', className)}>
      <span className={clsx('pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted', big && 'text-xl')}>₹</span>
      <input
        id={fid}
        inputMode="decimal"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={text}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.,]/g, '')
          setText(t)
          const p = toPaise(t)
          setLastValue(p)
          onChange(p)
        }}
        className={clsx(inputCls, 'tabular pl-9', big && 'min-h-14 text-2xl font-bold')}
      />
    </div>
  )
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  decimals = true,
  className,
  autoFocus,
}: {
  value: number | null
  onChange: (n: number | null) => void
  placeholder?: string
  decimals?: boolean
  className?: string
  autoFocus?: boolean
}) {
  const fid = useFieldId()
  const [text, setText] = useState(value === null ? '' : String(value))
  const [last, setLast] = useState(value)
  if (value !== last) {
    setLast(value)
    if ((text === '' ? null : Number(text)) !== value) setText(value === null ? '' : String(value))
  }
  return (
    <input
      id={fid}
      inputMode={decimals ? 'decimal' : 'numeric'}
      placeholder={placeholder}
      value={text}
      autoFocus={autoFocus}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const t = e.target.value.replace(decimals ? /[^\d.]/g : /\D/g, '')
        setText(t)
        const n = t === '' || t === '.' ? null : Number(t)
        const v = n !== null && Number.isFinite(n) ? n : null
        setLast(v)
        onChange(v)
      }}
      className={clsx(inputCls, 'tabular', className)}
    />
  )
}

export function Select<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  const fid = useFieldId()
  return (
    <select id={fid} value={value} onChange={(e) => onChange(e.target.value as T)} className={clsx(inputCls, 'appearance-none bg-[length:16px] pr-10', className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23887' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; sub?: ReactNode }) {
  const id = useId()
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block font-semibold">
          {label}
        </label>
        {sub && <div className="text-xs text-muted">{sub}</div>}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        type="button"
        onClick={() => onChange(!checked)}
        className={clsx('relative h-8 w-14 shrink-0 rounded-full transition', checked ? 'bg-brand' : 'bg-line')}
      >
        <span className={clsx('absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all', checked ? 'left-7' : 'left-1')} />
      </button>
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={clsx('flex rounded-2xl bg-surface-2 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx('min-h-10 flex-1 rounded-xl px-2 text-sm font-semibold transition', value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition active:scale-95',
        active ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">{children}</div>
}

/* ---------- "Bought just now" date-time field ---------- */

export interface When {
  now: boolean
  at: string
}

export const whenNow = (): When => ({ now: true, at: new Date().toISOString() })
export const whenAt = (iso: string): When => ({ now: false, at: iso })
export const resolveWhen = (w: When) => (w.now ? new Date().toISOString() : w.at)

export function WhenField({ value, onChange, label = 'Just now' }: { value: When; onChange: (w: When) => void; label?: string }) {
  return (
    <div className="mb-4 rounded-2xl bg-surface-2 p-3">
      <Toggle
        checked={value.now}
        onChange={(now) => onChange({ now, at: now ? new Date().toISOString() : value.at })}
        label={label}
        sub={value.now ? 'Date & time are added automatically' : 'Choose the date & time'}
      />
      {!value.now && (
        <input
          type="datetime-local"
          value={toLocalInput(value.at)}
          max={toLocalInput(new Date(Date.now() + 86400_000).toISOString())}
          onChange={(e) => {
            const iso = fromLocalInput(e.target.value)
            if (iso) onChange({ now: false, at: iso })
          }}
          className={clsx(inputCls, '-mt-1')}
        />
      )}
    </div>
  )
}

export function DateInput({ value, onChange, min, max }: { value: string; onChange: (v: string) => void; min?: string; max?: string }) {
  const fid = useFieldId()
  return <input id={fid} type="date" value={value} min={min} max={max} onChange={(e) => e.target.value && onChange(e.target.value)} className={inputCls} />
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <div className="mb-3 rounded-2xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">{children}</div>
}
