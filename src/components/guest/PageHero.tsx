import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { img } from '../../data/images'

export default function PageHero({ image, eyebrow, title, text, height = 'h-[78vh]', children }: { image: string; eyebrow?: string; title: ReactNode; text?: ReactNode; height?: string; children?: ReactNode }) {
  return (
    <section className={`relative ${height} min-h-[520px] overflow-hidden bg-kohl`}>
      <img src={img(image, 2400)} alt="" className="kenburns absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-kohl/50 via-kohl/20 to-kohl/70" />
      <div className="relative flex h-full flex-col items-center justify-end px-6 pb-20 text-center text-ivory">
        {eyebrow && <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.9 }} className="eyebrow mb-5 text-gold-2">{eyebrow}</motion.p>}
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 1.1, ease: [0.22, 1, 0.36, 1] }} className="max-w-4xl text-5xl leading-[1.05] md:text-7xl">{title}</motion.h1>
        {text && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 1 }} className="mt-6 max-w-2xl text-[17px] leading-relaxed text-ivory/85">{text}</motion.p>}
        {children}
      </div>
    </section>
  )
}
