import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Open sheets/dialogs, top-most last. The Android back button closes the top one. */
const stack: { id: number; close: () => void }[] = []
let nextId = 1

export function closeTopLayer(): boolean {
  const top = stack[stack.length - 1]
  if (!top) return false
  top.close()
  return true
}

export function useLayer(open: boolean, onClose: () => void) {
  const ref = useRef(onClose)
  ref.current = onClose
  useEffect(() => {
    if (!open) return
    const id = nextId++
    stack.push({ id, close: () => ref.current() })
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      const i = stack.findIndex((s) => s.id === id)
      if (i >= 0) stack.splice(i, 1)
      if (stack.length === 0) document.body.style.overflow = prevOverflow
    }
  }, [open])
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  tall,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  tall?: boolean
}) {
  useLayer(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <div className="anim-fade absolute inset-0 bg-black/45" onClick={onClose} />
      <div
        className={`anim-sheet relative mx-auto flex w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-2xl ${tall ? 'h-[94dvh]' : 'max-h-[94dvh]'}`}
      >
        <div className="flex items-start gap-3 px-5 pt-4 pb-2">
          <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-line absolute left-1/2 top-2 -translate-x-1/2" />
          <div className="min-w-0 flex-1 pt-1">
            {title && <h2 className="text-lg font-semibold leading-tight">{title}</h2>}
            {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
          </div>
          <button aria-label="Close" onClick={onClose} className="-mr-2 rounded-full p-2 text-muted active:bg-surface-2">
            <X size={22} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-line bg-surface px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
