import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { initials } from '../../lib/utils'

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-kohl dark:text-ivory">{title}</h1>
        {sub && <p className="mt-1 text-sm text-stone dark:text-sand/60">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Stat({ label, value, delta, hint, icon, tone = 'peacock' }: { label: string; value: ReactNode; delta?: number; hint?: string; icon?: ReactNode; tone?: 'peacock' | 'sindoor' | 'gold' | 'leaf' }) {
  const tones = { peacock: 'bg-peacock/10 text-peacock dark:text-[#9fd0dc]', sindoor: 'bg-sindoor/10 text-sindoor dark:text-[#f2b3a6]', gold: 'bg-gold/15 text-[#8a6a36] dark:text-gold-2', leaf: 'bg-leaf/15 text-leaf dark:text-[#bcd6a6]' }
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-stone dark:text-sand/60">{label}</p>
        {icon && <span className={clsx('grid h-8 w-8 place-items-center rounded-lg', tones[tone])}>{icon}</span>}
      </div>
      <p className="mt-2 text-[26px] font-semibold tracking-tight text-kohl dark:text-ivory">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta !== undefined && <span className={clsx('font-medium', delta >= 0 ? 'text-leaf dark:text-[#bcd6a6]' : 'text-sindoor dark:text-[#f2b3a6]')}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%</span>}
        {hint && <span className="text-stone dark:text-sand/50">{hint}</span>}
      </div>
    </div>
  )
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium capitalize', className ?? 'bg-kohl/5 text-stone dark:bg-white/10 dark:text-sand')}>{children}</span>
}

export function Avatar({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  const hues = ['#1F4E5A', '#9E3B2A', '#B08D57', '#4F6B3A', '#6B6358', '#2B6676']
  const h = hues[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length]
  return <span className={clsx('inline-grid shrink-0 place-items-center rounded-full font-medium text-white', className)} style={{ width: size, height: size, background: h, fontSize: size * 0.38 }}>{initials(name)}</span>
}

export function Card({ title, actions, children, className, pad = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={clsx('panel', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-kohl/5 px-5 py-3.5 dark:border-white/5">
          <h2 className="font-sans text-sm font-semibold text-kohl dark:text-ivory">{title}</h2>
          {actions}
        </header>
      )}
      <div className={clsx(pad && 'p-5')}>{children}</div>
    </section>
  )
}

export function Drawer({ open, onClose, title, children, width = 'max-w-xl' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-kohl/40" onClick={onClose} />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }} className={clsx('fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-ivory shadow-2xl dark:bg-[#171513]', width)}>
            <header className="flex items-center justify-between border-b border-kohl/10 px-6 py-4 dark:border-white/10">
              <div className="font-sans text-lg font-semibold dark:text-ivory">{title}</div>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-kohl/5 dark:text-ivory dark:hover:bg-white/10"><X size={18} /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-6 dark:text-sand">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-kohl/40 p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.97, y: 8 }} animate={{ scale: 1, y: 0 }} className="panel max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-2xl dark:text-sand" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-sans text-lg font-semibold dark:text-ivory">{title}</h3>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-kohl/5 dark:hover:bg-white/10"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: readonly T[] | T[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-kohl/5 p-1 dark:bg-white/5">
      {tabs.map((t) => (
        <button key={t} onClick={() => onChange(t)} className={clsx('rounded-md px-3 py-1.5 text-sm transition', value === t ? 'bg-white font-medium text-kohl shadow-sm dark:bg-white/15 dark:text-ivory' : 'text-stone hover:text-kohl dark:text-sand/60 dark:hover:text-ivory')}>{t}</button>
      ))}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-kohl/15 p-10 text-center text-sm text-stone dark:border-white/10">{children}</div>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-stone dark:text-sand/60">{label}</span>{children}</label>
}

export function Progress({ value, className, tone = 'bg-peacock' }: { value: number; className?: string; tone?: string }) {
  return <div className={clsx('h-1.5 overflow-hidden rounded-full bg-kohl/5 dark:bg-white/10', className)}><div className={clsx('h-full rounded-full', tone)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
}

export const chartColors = ['#1F4E5A', '#B08D57', '#9E3B2A', '#4F6B3A', '#6B6358', '#2B6676', '#C9A978', '#B24A37']
