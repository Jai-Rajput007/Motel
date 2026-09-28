import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { img } from '../../data/images'

export default function Lightbox({ images, index, onClose, onIndex }: { images: string[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  useEffect(() => {
    if (index === null) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndex((index + 1) % images.length)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [index, images.length, onClose, onIndex])
  return (
    <AnimatePresence>
      {index !== null && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-kohl/95 p-4 md:p-12" onClick={onClose}>
          <button className="absolute right-5 top-5 text-ivory" aria-label="Close"><X /></button>
          <button className="absolute left-3 grid h-12 w-12 place-items-center rounded-full border border-ivory/30 text-ivory md:left-8" aria-label="Previous" onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + images.length) % images.length) }}><ChevronLeft /></button>
          <motion.img key={index} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} src={img(images[index], 2000)} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
          <button className="absolute right-3 grid h-12 w-12 place-items-center rounded-full border border-ivory/30 text-ivory md:right-8" aria-label="Next" onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % images.length) }}><ChevronRight /></button>
          <p className="absolute bottom-6 text-xs tracking-[0.3em] text-ivory/60">{index + 1} / {images.length}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
