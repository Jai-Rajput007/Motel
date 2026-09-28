import { motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { img } from '../../data/images'
import { useStore } from '../../store/useStore'
import { money } from '../../lib/utils'

export function Reveal({ children, delay = 0, className, y = 28 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function Img({ k, w = 1600, h, alt = '', className, zoom = false }: { k: string; w?: number; h?: number; alt?: string; className?: string; zoom?: boolean }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={clsx(!className?.includes('absolute') && 'relative', 'overflow-hidden bg-sand', className)}>
      <img
        src={img(k, w, h)}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={clsx(
          'h-full w-full object-cover transition-all duration-[1400ms] ease-[var(--ease-lux)]',
          loaded ? 'opacity-100' : 'opacity-0',
          zoom && 'group-hover:scale-[1.04]',
        )}
      />
    </div>
  )
}

export function Lotus({ className = 'w-8 text-gold' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <path d="M32 4c5 6 7 12 0 24-7-12-5-18 0-24z" />
      <path d="M32 28C27 20 19 16 10 16c4 7 12 12 22 12zM32 28c5-8 13-12 22-12-4 7-12 12-22 12z" />
      <path d="M2 30h60" strokeWidth="0.8" />
    </svg>
  )
}

export function Ornament({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <div className={clsx('flex items-center justify-center gap-4', className)}>
      <span className={clsx('h-px w-16 md:w-24', light ? 'bg-gold/60' : 'bg-gold/50')} />
      <Lotus className="w-9 text-gold" />
      <span className={clsx('h-px w-16 md:w-24', light ? 'bg-gold/60' : 'bg-gold/50')} />
    </div>
  )
}

export function SectionHeading({ eyebrow, title, text, center = true, light = false, className }: { eyebrow?: string; title: ReactNode; text?: ReactNode; center?: boolean; light?: boolean; className?: string }) {
  return (
    <Reveal className={clsx(center && 'mx-auto text-center', 'max-w-3xl', className)}>
      {eyebrow && <p className="eyebrow mb-5">{eyebrow}</p>}
      <h2 className={clsx('text-4xl leading-[1.08] md:text-[3.4rem]', light ? 'text-ivory' : 'text-kohl')}>{title}</h2>
      {center && <Ornament className="my-6" light={light} />}
      {text && <p className={clsx('text-[17px] leading-relaxed', light ? 'text-ivory/75' : 'text-stone', !center && 'mt-6')}>{text}</p>}
    </Reveal>
  )
}

export function Money({ v, compact = false, className }: { v: number; compact?: boolean; className?: string }) {
  const currency = useStore((s) => s.currency)
  return <span className={className}>{money(v, currency, compact)}</span>
}

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <div className={clsx('flex flex-col items-center leading-none', className)}>
      <svg viewBox="0 0 40 26" className={clsx('mb-1 w-7', light ? 'text-gold-2' : 'text-gold')} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
        <path d="M4 25V12a16 11 0 0 1 32 0v13" />
        <path d="M11 25v-9a9 7 0 0 1 18 0v9" />
        <path d="M20 1v5M17 4h6" />
        <path d="M1 25h38" />
      </svg>
      <span className={clsx('font-display text-[22px] tracking-[0.34em]', light ? 'text-ivory' : 'text-kohl')}>VIRASAT</span>
      <span className={clsx('mt-1 text-[8.5px] tracking-[0.42em]', light ? 'text-ivory/70' : 'text-stone')}>PALACES & RESORTS</span>
    </div>
  )
}

export function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span className={clsx('inline-flex gap-0.5 text-gold', className)} aria-label={`${n} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-3.5 w-3.5" fill={i < Math.round(n) ? 'currentColor' : 'none'} stroke="currentColor">
          <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.8z" />
        </svg>
      ))}
    </span>
  )
}
