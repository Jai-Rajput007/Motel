import clsx from 'clsx'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { UserError } from '../actions/common'
import { Button, TextInput } from './kit'
import { useLayer } from './Sheet'

/* ---------------- Toasts ---------------- */

interface ToastItem {
  id: number
  text: string
  kind: 'ok' | 'error'
  undo?: () => void | Promise<void>
}

let toasts: ToastItem[] = []
const tsubs = new Set<() => void>()
const emit = () => tsubs.forEach((f) => f())
let tid = 1

export function toast(text: string, opts: { undo?: () => void | Promise<void>; kind?: 'ok' | 'error'; ms?: number } = {}) {
  const t: ToastItem = { id: tid++, text, kind: opts.kind ?? 'ok', undo: opts.undo }
  toasts = [...toasts.slice(-2), t]
  emit()
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id)
    emit()
  }, opts.ms ?? (opts.undo ? 5000 : 2800))
}

/** Show a friendly message for any error thrown by an action. */
export function showError(e: unknown) {
  const msg = e instanceof UserError ? e.message : e instanceof Error ? `Something went wrong: ${e.message}` : 'Something went wrong.'
  if (!(e instanceof UserError)) console.error(e)
  toast(msg, { kind: 'error', ms: 4500 })
}

/** Run an action; show its error as a toast. Returns true on success. */
export async function attempt(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn()
    return true
  } catch (e) {
    showError(e)
    return false
  }
}

function Toasts() {
  const list = useSyncExternalStore(
    (f) => {
      tsubs.add(f)
      return () => tsubs.delete(f)
    },
    () => toasts,
  )
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4">
      {list.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'anim-pop pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg',
            t.kind === 'error' ? 'bg-bad text-white' : 'bg-ink text-bg',
          )}
        >
          {t.kind === 'error' ? <AlertTriangle size={18} className="shrink-0" /> : <CheckCircle2 size={18} className="shrink-0" />}
          <span className="flex-1">{t.text}</span>
          {t.undo && (
            <button
              className="rounded-lg px-2 py-1 font-bold uppercase tracking-wide underline-offset-2 active:bg-white/10"
              onClick={async () => {
                toasts = toasts.filter((x) => x.id !== t.id)
                emit()
                await attempt(async () => t.undo!())
              }}
            >
              Undo
            </button>
          )}
        </div>
      ))}
    </div>,
    document.body,
  )
}

/* ---------------- Dialogs ---------------- */

interface DialogReq {
  title: string
  body?: ReactNode
  ok: string
  cancel?: string
  danger?: boolean
  input?: { placeholder?: string; initial?: string; required?: boolean }
  resolve: (v: string | boolean | null) => void
}

let dialog: DialogReq | null = null
const dsubs = new Set<() => void>()
const demit = () => dsubs.forEach((f) => f())

export function confirmDialog(o: { title: string; body?: ReactNode; ok?: string; cancel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    dialog = { ...o, ok: o.ok ?? 'OK', resolve: (v) => resolve(v === true) }
    demit()
  })
}

export function promptDialog(o: { title: string; body?: ReactNode; ok?: string; placeholder?: string; initial?: string; required?: boolean }): Promise<string | null> {
  return new Promise((resolve) => {
    dialog = {
      title: o.title, body: o.body, ok: o.ok ?? 'OK', input: { placeholder: o.placeholder, initial: o.initial, required: o.required ?? true },
      resolve: (v) => resolve(typeof v === 'string' ? v : null),
    }
    demit()
  })
}

function Dialog() {
  const d = useSyncExternalStore(
    (f) => {
      dsubs.add(f)
      return () => dsubs.delete(f)
    },
    () => dialog,
  )
  const [text, setText] = useState('')
  useEffect(() => {
    setText(d?.input?.initial ?? '')
  }, [d])
  const close = (v: string | boolean | null) => {
    d?.resolve(v)
    dialog = null
    demit()
  }
  useLayer(!!d, () => close(d?.input ? null : false))
  if (!d) return null
  const okDisabled = !!d.input?.required && !text.trim()
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5" role="alertdialog" aria-modal="true">
      <div className="anim-fade absolute inset-0 bg-black/50" onClick={() => close(d.input ? null : false)} />
      <div className="anim-pop relative w-full max-w-sm rounded-3xl bg-surface p-5 shadow-2xl">
        <h2 className="text-lg font-semibold">{d.title}</h2>
        {d.body && <div className="mt-2 text-sm text-muted">{d.body}</div>}
        {d.input && (
          <TextInput
            autoFocus
            className="mt-4"
            placeholder={d.input.placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !okDisabled && close(text.trim())}
          />
        )}
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" block onClick={() => close(d.input ? null : false)}>
            {d.cancel ?? 'Cancel'}
          </Button>
          <Button variant={d.danger ? 'danger' : 'primary'} block disabled={okDisabled} onClick={() => close(d.input ? text.trim() : true)}>
            {d.ok}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function FeedbackHost() {
  return (
    <>
      <Toasts />
      <Dialog />
    </>
  )
}
