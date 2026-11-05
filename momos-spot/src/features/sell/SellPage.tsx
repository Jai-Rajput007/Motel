import clsx from 'clsx'
import { History, Megaphone, Search, ShoppingBag, UtensilsCrossed, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addVariant, loadSampleMenu, setAvailable } from '../../actions/menu'
import type { MenuItem, Sale, Variant } from '../../db/types'
import { useDays, useDraft, useToday } from '../../hooks'
import { inr } from '../../lib/money'
import { nameKey } from '../../lib/ids'
import { attempt, confirmDialog, toast } from '../../ui/feedback'
import { AmountInput, Button, Chip, ChipRow, Empty, Field, Page, TextInput } from '../../ui/kit'
import { Sheet } from '../../ui/Sheet'
import { SyncDot } from '../../ui/SyncDot'
import { addToCart, cartCount, emptyCart, type CartDraft } from './cart'
import { Checkout } from './Checkout'
import { useMenu, useOffersData, usePopular } from './useSellData'

export default function SellPage() {
  const menu = useMenu()
  const popular = usePopular()
  const offers = useOffersData()
  const today = useToday()
  const todaySales = useDays<Sale>('sales', today, today)
  const nav = useNavigate()
  const [cart, setCart, clearCart] = useDraft<CartDraft>('cart', emptyCart)
  const [cat, setCat] = useState<string>('all')
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [sizeFor, setSizeFor] = useState<MenuItem | null>(null)
  const [checkout, setCheckout] = useState(false)

  const done = (todaySales ?? []).filter((s) => s.status === 'done')
  const todayTotal = done.reduce((s, x) => s + x.total, 0)
  const qtyIn = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of cart.lines) if (l.menuItemId && !l.isReward) m.set(l.menuItemId, (m.get(l.menuItemId) ?? 0) + l.qty)
    return m
  }, [cart.lines])

  if (!menu) return null
  const k = nameKey(q)
  let items = menu.items
  if (k) items = items.filter((m) => nameKey(m.name).includes(k))
  else if (cat === 'popular') items = [...items].filter((m) => popular?.get(m.id)).sort((a, b) => (popular?.get(b.id) ?? 0) - (popular?.get(a.id) ?? 0)).slice(0, 12)
  else if (cat !== 'all') items = items.filter((m) => m.categoryId === cat)

  const tap = (m: MenuItem) => {
    if (!m.available) {
      void confirmDialog({ title: `${m.name} is marked sold out`, body: 'Make it available again?', ok: 'Make available' }).then(
        (ok) => ok && attempt(() => setAvailable(m, true)),
      )
      return
    }
    if (m.variants.length) setSizeFor(m)
    else setCart((c) => addToCart(c, m))
  }

  const activeNotes = (offers?.notes ?? []).filter((n) => n.showOnSell && (!n.startsOn || n.startsOn <= today) && (!n.endsOn || n.endsOn >= today))
  const count = cartCount(cart)
  const cartTotal = cart.lines.reduce((s, l) => s + l.price * l.qty, 0)

  return (
    <Page
      title={cart.editingId ? `Editing bill #${cart.editingBillNo}` : 'Sell'}
      actions={
        <>
          {!searching && (
            <button aria-label="Search menu" className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surface-2" onClick={() => setSearching(true)}>
              <Search size={21} />
            </button>
          )}
          <button aria-label="Sales history" className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surface-2" onClick={() => nav('/sales')}>
            <History size={21} />
          </button>
          <SyncDot />
        </>
      }
      sub={
        <button onClick={() => nav('/sales')} className="flex w-full items-center gap-3 px-4 pb-2 text-left text-sm">
          <span className="font-semibold text-good">Today {inr(todayTotal)}</span>
          <span className="text-muted">
            {done.length} order{done.length === 1 ? '' : 's'} · Cash {inr(done.reduce((s, x) => s + x.cash, 0))} · Online {inr(done.reduce((s, x) => s + x.online, 0))}
          </span>
        </button>
      }
    >
      {cart.editingId && (
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-info-soft px-4 py-2 text-sm font-medium text-info">
          Editing a saved bill
          <button
            className="font-bold"
            onClick={() => {
              clearCart()
              toast('Edit cancelled')
            }}
          >
            Cancel edit
          </button>
        </div>
      )}
      {activeNotes.map((n) => (
        <div key={n.id} className="mb-3 flex items-start gap-2 rounded-2xl bg-brand-soft px-4 py-2.5 text-sm text-brand-soft-ink">
          <Megaphone size={16} className="mt-0.5 shrink-0" />
          <span>
            <b>{n.title}</b>
            {n.details ? ` · ${n.details}` : ''}
          </span>
        </div>
      ))}

      {menu.items.length === 0 ? (
        <Empty
          icon={<UtensilsCrossed size={36} />}
          title="Your menu is empty"
          action={
            <div className="flex flex-col gap-2">
              <Button onClick={() => nav('/menu')}>Add menu items</Button>
              <Button
                variant="soft"
                onClick={() =>
                  attempt(async () => {
                    await loadSampleMenu()
                    toast('Sample momos menu added. Edit prices in More → Menu.')
                  })
                }
              >
                Start with a sample momos menu
              </Button>
            </div>
          }
        >
          Add the items you sell with their prices. Then billing is just tapping items.
        </Empty>
      ) : (
        <>
          {searching ? (
            <div className="relative mb-3">
              <TextInput autoFocus placeholder="Search menu" value={q} onChange={(e) => setQ(e.target.value)} className="pr-12" />
              <button aria-label="Close search" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted" onClick={() => { setQ(''); setSearching(false) }}>
                <X size={20} />
              </button>
            </div>
          ) : (
            <ChipRow>
              <Chip active={cat === 'all'} onClick={() => setCat('all')}>All</Chip>
              {popular && popular.size > 0 && <Chip active={cat === 'popular'} onClick={() => setCat('popular')}>⭐ Popular</Chip>}
              {menu.categories.map((c) => (
                <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
                  {c.name}
                </Chip>
              ))}
            </ChipRow>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            {items.map((m) => {
              const n = qtyIn.get(m.id) ?? 0
              const prices = m.variants.length ? m.variants.map((v) => v.price) : [m.price]
              const lo = Math.min(...prices)
              const hi = Math.max(...prices)
              return (
                <button
                  key={m.id}
                  onClick={() => tap(m)}
                  className={clsx(
                    'relative flex min-h-24 flex-col justify-between rounded-3xl border p-3.5 text-left transition active:scale-[.97]',
                    n ? 'border-brand bg-brand-soft' : 'border-line bg-surface',
                    !m.available && 'opacity-45',
                  )}
                >
                  <span className="pr-6 font-semibold leading-snug">{m.name}</span>
                  <span className="tabular mt-2 text-sm text-muted">
                    {!m.available ? 'Sold out' : lo === hi ? inr(lo) : `${inr(lo)} – ${inr(hi)}`}
                    {m.variants.length > 0 && m.available && <span className="ml-1 text-xs">· {m.variants.length} sizes</span>}
                  </span>
                  {n > 0 && (
                    <span className="tabular absolute right-2.5 top-2.5 flex h-7 min-w-7 items-center justify-center rounded-full bg-brand px-1.5 text-sm font-bold text-brand-ink">{n}</span>
                  )}
                </button>
              )
            })}
          </div>
          {items.length === 0 && <p className="py-8 text-center text-sm text-muted">No items here.</p>}
          {count > 0 && <div className="h-20" />}
        </>
      )}

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-3">
          <button
            onClick={() => setCheckout(true)}
            className="anim-pop mx-auto flex w-full max-w-lg items-center gap-3 rounded-3xl bg-ink px-5 py-4 text-bg shadow-xl active:scale-[.99]"
          >
            <ShoppingBag size={22} />
            <span className="flex-1 text-left font-semibold">
              {count} item{count === 1 ? '' : 's'}
            </span>
            <span className="tabular text-lg font-bold">{inr(cartTotal)}</span>
            <span className="rounded-xl bg-brand px-3 py-1.5 text-sm font-bold text-brand-ink">Checkout</span>
          </button>
        </div>
      )}

      <SizeSheet item={sizeFor} onClose={() => setSizeFor(null)} onPick={(m, v) => setCart((c) => addToCart(c, m, v))} />
      <Checkout open={checkout} onClose={() => setCheckout(false)} cart={cart} setCart={setCart} clearCart={clearCart} />
    </Page>
  )
}

function SizeSheet({ item, onClose, onPick }: { item: MenuItem | null; onClose: () => void; onPick: (m: MenuItem, v: Variant) => void }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState<number | null>(null)
  if (!item) return null
  return (
    <Sheet
      open
      onClose={() => {
        setAdding(false)
        onClose()
      }}
      title={item.name}
      subtitle="Choose size"
    >
      <div className="grid grid-cols-2 gap-2.5">
        {item.variants.map((v) => (
          <button
            key={v.id}
            onClick={() => {
              onPick(item, v)
              onClose()
            }}
            className="rounded-3xl border border-line bg-surface p-4 text-left active:scale-[.97] active:bg-brand-soft"
          >
            <div className="font-semibold">{v.name}</div>
            <div className="tabular text-muted">{inr(v.price)}</div>
          </button>
        ))}
      </div>
      {adding ? (
        <div className="mt-4 rounded-2xl bg-surface-2 p-3">
          <Field label="New size name">
            <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 8 pcs" />
          </Field>
          <Field label="Price">
            <AmountInput value={price} onChange={setPrice} />
          </Field>
          <Button
            block
            onClick={() =>
              attempt(async () => {
                const v = await addVariant(item, name, price ?? 0)
                onPick({ ...item, variants: [...item.variants, v] }, v)
                toast(`${v.name} added to the menu`)
                setAdding(false)
                setName('')
                setPrice(null)
                onClose()
              })
            }
          >
            Save size & add to bill
          </Button>
        </div>
      ) : (
        <button className="mt-4 w-full py-2 text-sm font-semibold text-brand" onClick={() => setAdding(true)}>
          + Add a new size
        </button>
      )}
    </Sheet>
  )
}
