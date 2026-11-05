import { useLiveQuery } from 'dexie-react-hooks'
import { Bike, Check, Gift, Minus, PartyPopper, Plus, QrCode, Send, Trash2, User, UserRound } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useMemo, useState } from 'react'
import { saveSale, type SaveSaleResult } from '../../actions/sales'
import { alive, db } from '../../db'
import type { Customer, CustomerReward, LoyaltyRule, Sale } from '../../db/types'
import { useSettings, useToday } from '../../hooks'
import { computeTotals, settle } from '../../lib/calc/cart'
import { progress, ruleActiveOn, usableRewards } from '../../lib/calc/loyalty'
import { relativeDay, keyOfLocalDate } from '../../lib/dates'
import { nameKey } from '../../lib/ids'
import { inr } from '../../lib/money'
import { shareText, upiLink } from '../../lib/share'
import { showError } from '../../ui/feedback'
import { AmountInput, Badge, Button, Chip, Field, Progress, Segmented, TextInput, Toggle } from '../../ui/kit'
import { Sheet } from '../../ui/Sheet'
import { billText, lineName, setQty, type CartDraft } from './cart'
import { useCustomerStats, useMenu, useOffersData, type CustomerStat } from './useSellData'

export function Checkout({
  open,
  onClose,
  cart,
  setCart,
  clearCart,
}: {
  open: boolean
  onClose: () => void
  cart: CartDraft
  setCart: (f: CartDraft | ((c: CartDraft) => CartDraft)) => void
  clearCart: () => void
}) {
  const settings = useSettings()
  const today = useToday()
  const menu = useMenu()
  const offers = useOffersData()
  const cs = useCustomerStats()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<SaveSaleResult | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [showDiscount, setShowDiscount] = useState(false)
  const [editLine, setEditLine] = useState<string | null>(null)
  const [touched, setTouched] = useState({ cash: false, online: false })

  const customerId = cart.customer.mode === 'existing' ? cart.customer.id : undefined
  const cdata = useLiveQuery(async () => {
    if (!customerId) return null
    const [c, sales, rewards] = await Promise.all([
      db.customers.get(customerId),
      db.sales.where('customerId').equals(customerId).toArray(),
      db.rewards.where('customerId').equals(customerId).toArray(),
    ])
    return { c, sales: alive(sales).filter((s) => s.id !== cart.editingId), rewards: alive(rewards) }
  }, [customerId, cart.editingId])

  const rules = offers?.rules ?? []
  const rulesById = useMemo(() => new Map(rules.map((r) => [r.id, r])), [rules])
  const update = (p: Partial<CartDraft>) => setCart((c) => ({ ...c, ...p }))

  // ---------- totals
  const itemsSubtotal = cart.lines.reduce((s, l) => s + l.price * l.qty, 0)
  const manualDiscount = cart.discountMode === 'percent' ? Math.round((itemsSubtotal * Math.min(100, cart.discountValue ?? 0)) / 10000) : cart.discountValue ?? 0
  const allRewards = cdata?.rewards ?? []
  const appliedRewards = allRewards.filter((r) => cart.redeem.includes(r.id))
  const rewardDiscount = appliedRewards.reduce((s, r) => {
    const rule = rulesById.get(r.ruleId)
    if (rule?.rewardType === 'percent') return s + Math.round((itemsSubtotal * Math.min(100, rule.rewardValue ?? 0)) / 100)
    if (rule?.rewardType === 'flat') return s + (rule.rewardValue ?? 0)
    return s
  }, 0)
  const fee = cart.deliveryFee ?? settings.deliveryFee
  const totals = computeTotals({ lines: cart.lines, isDelivery: cart.isDelivery, deliveryFee: fee, freeDeliveryAbove: settings.freeDeliveryAbove, discount: manualDiscount + rewardDiscount })
  const total = totals.total

  let tendered = 0
  let online = 0
  if (cart.payMode === 'cash') tendered = cart.cashTendered ?? total
  else if (cart.payMode === 'online') online = cart.online ?? total
  else {
    online = cart.online ?? 0
    tendered = cart.cashTendered ?? 0
  }
  const pay = settle(total, tendered, online)
  const named = cart.customer.mode === 'existing' || cart.customer.mode === 'new'

  const usable = usableRewards(allRewards).filter((r) => !cart.redeem.includes(r.id))
  const applyReward = (r: CustomerReward) => {
    const rule = rulesById.get(r.ruleId)
    const m = rule?.rewardType === 'free_item' ? menu?.all.find((x) => x.id === rule.rewardMenuItemId) : undefined
    setCart((c) => {
      const lines = [...c.lines]
      if (rule && m) {
        const v = m.variants.find((x) => x.id === rule.rewardVariantId)
        lines.push({ key: `reward|${r.id}`, menuItemId: m.id, variantId: v?.id, name: lineName(m, v), price: 0, listPrice: v?.price ?? m.price, qty: rule.rewardQty ?? 1, isReward: true })
      }
      return { ...c, lines, redeem: [...c.redeem, r.id] }
    })
  }
  const unapplyReward = (id: string) => setCart((c) => ({ ...c, redeem: c.redeem.filter((x) => x !== id), lines: c.lines.filter((l) => l.key !== `reward|${id}`) }))

  const submit = async () => {
    if (busy) return
    if (pay.error) return showError(new Error(pay.error))
    setBusy(true)
    try {
      const reasons = [cart.discountReason.trim(), ...appliedRewards.map((r) => r.rewardLabel)].filter(Boolean).join(' · ')
      const res = await saveSale({
        id: cart.editingId,
        lines: cart.lines,
        isDelivery: cart.isDelivery,
        deliveryFee: fee,
        discount: manualDiscount + rewardDiscount,
        rewardDiscount,
        discountReason: reasons,
        customer: cart.customer,
        address: cart.address,
        phone: cart.phone,
        cashTendered: tendered,
        online,
        shortfallAs: pay.shortfall > 0 ? cart.shortfallAs : undefined,
        redeemRewardIds: cart.redeem,
        note: cart.note,
      })
      clearCart()
      setDone(res)
    } catch (e) {
      showError(e)
    } finally {
      setBusy(false)
    }
  }

  const close = () => {
    setDone(null)
    setShowQr(false)
    onClose()
  }

  if (done)
    return (
      <Sheet open={open} onClose={close} title={null}>
        <SaleDone res={done} onNew={close} />
      </Sheet>
    )

  return (
    <Sheet
      open={open}
      onClose={onClose}
      tall
      title={cart.editingId ? `Edit bill #${cart.editingBillNo}` : 'Checkout'}
      footer={
        <div>
          {pay.shortfall > 0 && (
            <div className="mb-2 rounded-2xl bg-warn-soft p-3 text-sm text-warn">
              <div className="mb-2 font-semibold">Short by {inr(pay.shortfall)}. What should happen to it?</div>
              <div className="flex gap-2">
                <Chip active={cart.shortfallAs === 'credit'} onClick={() => update({ shortfallAs: 'credit' })}>
                  Add to udhaar{!named ? ' (needs name)' : ''}
                </Chip>
                <Chip active={cart.shortfallAs === 'discount'} onClick={() => update({ shortfallAs: 'discount' })}>
                  Give as discount
                </Chip>
              </div>
            </div>
          )}
          <Button
            size="lg"
            block
            onClick={submit}
            disabled={busy || cart.lines.length === 0 || !!pay.error || (pay.shortfall > 0 && (!cart.shortfallAs || (cart.shortfallAs === 'credit' && !named)))}
          >
            {busy ? 'Saving…' : `${cart.editingId ? 'Update' : 'Save'} sale · ${inr(pay.shortfall > 0 && cart.shortfallAs === 'discount' ? total - pay.shortfall : total)}`}
          </Button>
        </div>
      }
    >
      {/* ---------- lines */}
      <div className="mb-2 overflow-hidden rounded-2xl border border-line">
        {cart.lines.length === 0 && <div className="p-4 text-center text-sm text-muted">Cart is empty. Close this and tap items to add them.</div>}
        {cart.lines.map((l) => (
          <div key={l.key} className="border-b border-line last:border-0">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <button className="min-w-0 flex-1 text-left" onClick={() => !l.isReward && setEditLine(editLine === l.key ? null : l.key)}>
                <div className="truncate font-medium">
                  {l.isReward && <Gift size={14} className="mr-1 inline text-brand" />}
                  {l.name}
                </div>
                <div className="tabular text-xs text-muted">
                  {l.isReward ? 'Reward · free' : `${inr(l.price)} each`}
                  {l.listPrice !== undefined && l.listPrice !== l.price && !l.isReward ? ` · menu ${inr(l.listPrice)}` : ''}
                  {!l.isReward && <span className="ml-1 text-brand">· change</span>}
                </div>
              </button>
              {!l.isReward && (
                <div className="flex items-center rounded-full bg-surface-2">
                  <button aria-label="Less" className="flex h-9 w-9 items-center justify-center" onClick={() => setCart((c) => setQty(c, l.key, l.qty - 1))}>
                    {l.qty === 1 ? <Trash2 size={16} /> : <Minus size={16} />}
                  </button>
                  <span className="tabular w-6 text-center font-bold">{l.qty}</span>
                  <button aria-label="More" className="flex h-9 w-9 items-center justify-center" onClick={() => setCart((c) => setQty(c, l.key, l.qty + 1))}>
                    <Plus size={16} />
                  </button>
                </div>
              )}
              <span className="tabular w-16 text-right font-semibold">{inr(l.price * l.qty)}</span>
            </div>
            {editLine === l.key && (
              <div className="bg-surface-2 px-3 py-3">
                <div className="mb-1 text-xs font-semibold text-muted">Advanced: price for this bill only</div>
                <AmountInput
                  value={l.price}
                  onChange={(p) =>
                    setCart((c) => ({ ...c, lines: c.lines.map((x) => (x.key === l.key ? { ...x, price: p ?? 0, listPrice: x.listPrice ?? x.price } : x)) }))
                  }
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="mb-4 text-sm font-semibold text-brand" onClick={onClose}>
        + Add more items
      </button>

      {/* ---------- customer */}
      <CustomerBlock cart={cart} update={update} customers={cs?.customers ?? []} stats={cs?.stats} current={cdata?.c} />

      {customerId && cdata?.c && !cdata.c.isGuest && (
        <LoyaltyBlock
          rules={rules}
          sales={cdata.sales}
          rewards={allRewards}
          applied={appliedRewards}
          usable={usable}
          today={today}
          onApply={applyReward}
          onUnapply={unapplyReward}
        />
      )}

      {/* ---------- delivery */}
      <div className="mt-2 rounded-2xl border border-line p-3">
        <Toggle
          checked={cart.isDelivery}
          onChange={(v) => update({ isDelivery: v })}
          label={
            <span className="flex items-center gap-2">
              <Bike size={18} /> Home delivery
            </span>
          }
          sub={cart.isDelivery ? (totals.deliveryFee ? `Delivery charge ${inr(totals.deliveryFee)}` : 'Free delivery on this bill') : `Adds ${inr(fee)} delivery charge`}
        />
        {cart.isDelivery && (
          <>
            <Field label="Delivery charge for this order" hint={`Default ${inr(settings.deliveryFee)} (change in Settings)`}>
              <AmountInput value={fee} onChange={(p) => update({ deliveryFee: p ?? 0 })} />
            </Field>
            <Field label="Address / landmark">
              <TextInput value={cart.address} onChange={(e) => update({ address: e.target.value })} placeholder="Optional" />
            </Field>
            <Field label="Phone">
              <TextInput inputMode="tel" value={cart.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="Optional" />
            </Field>
          </>
        )}
      </div>

      {/* ---------- discount */}
      {showDiscount || cart.discountValue ? (
        <div className="mt-3 rounded-2xl border border-line p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold">Discount</span>
            <Segmented className="w-36" value={cart.discountMode} onChange={(v) => update({ discountMode: v, discountValue: null })} options={[{ value: 'flat', label: '₹' }, { value: 'percent', label: '%' }]} />
          </div>
          {cart.discountMode === 'flat' ? (
            <AmountInput value={cart.discountValue} onChange={(p) => update({ discountValue: p })} />
          ) : (
            <TextInput inputMode="numeric" placeholder="%" value={cart.discountValue ?? ''} onChange={(e) => update({ discountValue: e.target.value ? Math.min(100, Number(e.target.value.replace(/\D/g, ''))) : null })} />
          )}
          <TextInput className="mt-2" placeholder="Reason (optional)" value={cart.discountReason} onChange={(e) => update({ discountReason: e.target.value })} />
        </div>
      ) : (
        <button className="mt-3 text-sm font-semibold text-brand" onClick={() => setShowDiscount(true)}>
          + Discount
        </button>
      )}

      {/* ---------- totals */}
      <div className="tabular mt-4 space-y-1 rounded-2xl bg-surface-2 p-4 text-sm">
        <div className="flex justify-between"><span>Items</span><span>{inr(totals.subtotal)}</span></div>
        {cart.isDelivery && <div className="flex justify-between"><span>Delivery</span><span>{inr(totals.deliveryFee)}</span></div>}
        {totals.discount > 0 && <div className="flex justify-between text-good"><span>Discount</span><span>−{inr(totals.discount)}</span></div>}
        <div className="flex justify-between pt-1 text-xl font-bold"><span>Total</span><span>{inr(total)}</span></div>
      </div>

      {/* ---------- payment */}
      <div className="mt-4">
        <Segmented
          value={cart.payMode}
          onChange={(v) => {
            setTouched({ cash: false, online: false })
            update({ payMode: v, cashTendered: null, online: null, shortfallAs: undefined })
          }}
          options={[{ value: 'cash', label: 'Cash' }, { value: 'online', label: 'Online' }, { value: 'split', label: 'Cash + Online' }]}
        />
        <div className="mt-3">
          {cart.payMode === 'cash' && (
            <>
              <Field label="Cash received" hint={cart.cashTendered === null ? 'Leave empty if they paid exactly' : undefined}>
                <AmountInput value={cart.cashTendered} onChange={(p) => update({ cashTendered: p })} placeholder={String(total / 100)} big />
              </Field>
              <div className="no-scrollbar -mt-2 mb-3 flex gap-2 overflow-x-auto">
                <Chip active={cart.cashTendered === null || cart.cashTendered === total} onClick={() => update({ cashTendered: null })}>Exact</Chip>
                {settings.cashChips.filter((c) => c > total).map((c) => (
                  <Chip key={c} active={cart.cashTendered === c} onClick={() => update({ cashTendered: c })}>
                    {inr(c)}
                  </Chip>
                ))}
              </div>
            </>
          )}
          {cart.payMode === 'online' && (
            <Field label="Online amount">
              <AmountInput value={cart.online ?? total} onChange={(p) => update({ online: p })} big />
            </Field>
          )}
          {cart.payMode === 'split' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Online">
                <AmountInput
                  value={cart.online}
                  onChange={(p) => {
                    setTouched((t) => ({ ...t, online: true }))
                    update({ online: p, cashTendered: touched.cash ? cart.cashTendered : p !== null ? Math.max(0, total - p) : null })
                  }}
                />
              </Field>
              <Field label="Cash">
                <AmountInput
                  value={cart.cashTendered}
                  onChange={(p) => {
                    setTouched((t) => ({ ...t, cash: true }))
                    update({ cashTendered: p, online: touched.online ? cart.online : p !== null ? Math.max(0, total - p) : null })
                  }}
                />
              </Field>
            </div>
          )}
          {(cart.payMode === 'online' || cart.payMode === 'split') && settings.upiId && pay.online > 0 && (
            <Button variant="soft" block icon={<QrCode size={18} />} onClick={() => setShowQr(true)} className="mb-3">
              Show UPI QR for {inr(pay.online)}
            </Button>
          )}
          {pay.error && <div className="mb-3 text-sm font-medium text-bad">{pay.error}</div>}
          {pay.change > 0 && (
            <div className="flex items-center justify-between rounded-2xl bg-good-soft px-4 py-3 text-good">
              <span className="font-semibold">Return change</span>
              <span className="tabular text-2xl font-bold">{inr(pay.change)}</span>
            </div>
          )}
        </div>
      </div>

      <Field label="Note (optional)">
        <TextInput value={cart.note} onChange={(e) => update({ note: e.target.value })} placeholder="e.g. extra spicy" />
      </Field>

      <Sheet open={showQr} onClose={() => setShowQr(false)} title={`Scan to pay ${inr(pay.online)}`} subtitle={settings.upiId}>
        <div className="flex justify-center rounded-3xl bg-white p-6">
          <QRCodeSVG value={upiLink({ upiId: settings.upiId ?? '', name: settings.upiName || settings.shopName, amount: pay.online, note: settings.shopName })} size={240} />
        </div>
        <p className="mt-3 text-center text-sm text-muted">Works with any UPI app. Check the payment on your phone before saving.</p>
      </Sheet>
    </Sheet>
  )
}

function CustomerBlock({ cart, update, customers, stats, current }: { cart: CartDraft; update: (p: Partial<CartDraft>) => void; customers: Customer[]; stats?: Map<string, CustomerStat>; current?: Customer }) {
  const mode = cart.customer.mode === 'guest' || cart.customer.mode === 'none' ? 'guest' : 'name'
  const typed = cart.customer.mode === 'new' ? cart.customer.name : ''
  const k = nameKey(typed)
  const digits = typed.replace(/\D/g, '')
  const matches = k
    ? customers
        .filter((c) => !c.isGuest && (c.nameKey.includes(k) || (digits.length >= 3 && c.phone?.includes(digits)) || (c.guestCode && c.guestCode.toLowerCase() === k)))
        .sort((a, b) => (b.nameKey === k ? 1 : 0) - (a.nameKey === k ? 1 : 0) || (stats?.get(b.id)?.visits ?? 0) - (stats?.get(a.id)?.visits ?? 0))
        .slice(0, 5)
    : []
  const st = current ? stats?.get(current.id) : undefined

  return (
    <div className="rounded-2xl border border-line p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-semibold">Customer</span>
        <Segmented
          className="w-48"
          value={mode}
          onChange={(v) => update({ customer: v === 'guest' ? { mode: 'guest' } : { mode: 'new', name: '' } })}
          options={[{ value: 'name', label: 'Name' }, { value: 'guest', label: 'Guest' }]}
        />
      </div>
      {cart.customer.mode === 'guest' && <p className="text-sm text-muted">A unique guest code (like G-7K3P) is given to this bill.</p>}
      {cart.customer.mode === 'none' && <p className="text-sm text-muted">Walk-in bill without a customer.</p>}

      {cart.customer.mode === 'existing' && current && (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-soft-ink">
            <UserRound size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{current.name}</div>
            <div className="truncate text-xs text-muted">
              {current.phone ? `…${current.phone.slice(-4)} · ` : ''}
              {st?.visits ?? 0} visit{st?.visits === 1 ? '' : 's'}{st?.lastDay ? ` · last visit ${relativeDay(st.lastDay).toLowerCase()}` : ''}
            </div>
            {st && st.credit > 0 && <Badge tone="warn">Udhaar due {inr(st.credit)}</Badge>}
          </div>
          <Button size="sm" variant="ghost" onClick={() => update({ customer: { mode: 'new', name: '' }, redeem: [], lines: cart.lines.filter((l) => !l.isReward) })}>
            Change
          </Button>
        </div>
      )}

      {cart.customer.mode === 'new' && (
        <>
          <TextInput autoFocus placeholder="Customer name or phone" value={typed} onChange={(e) => update({ customer: { mode: 'new', name: e.target.value, phone: cart.customer.mode === 'new' ? cart.customer.phone : undefined } })} />
          {matches.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-2xl border border-line">
              {matches.map((c) => (
                <button key={c.id} onClick={() => update({ customer: { mode: 'existing', id: c.id } })} className="flex w-full items-center gap-2 border-b border-line px-3 py-2.5 text-left last:border-0 active:bg-surface-2">
                  <User size={16} className="text-muted" />
                  <span className="flex-1 truncate font-medium">{c.name}</span>
                  <span className="text-xs text-muted">
                    {c.phone ? `…${c.phone.slice(-4)} · ` : ''}
                    {stats?.get(c.id)?.visits ?? 0} visit{stats?.get(c.id)?.visits === 1 ? '' : 's'}
                  </span>
                </button>
              ))}
            </div>
          )}
          {k && (
            <>
              <div className="mt-2 text-xs text-muted">
                {matches.some((m) => m.nameKey === k) ? 'Tap the customer above if it is them. Otherwise a new customer is created.' : `New customer “${typed.trim()}” will be created.`}
              </div>
              <TextInput
                className="mt-2"
                inputMode="tel"
                placeholder="Phone (optional, helps with same names)"
                value={cart.customer.phone ?? ''}
                onChange={(e) => cart.customer.mode === 'new' && update({ customer: { ...cart.customer, phone: e.target.value } })}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

function LoyaltyBlock({
  rules, sales, rewards, applied, usable, today, onApply, onUnapply,
}: {
  rules: LoyaltyRule[]
  sales: Sale[]
  rewards: CustomerReward[]
  applied: CustomerReward[]
  usable: CustomerReward[]
  today: string
  onApply: (r: CustomerReward) => void
  onUnapply: (id: string) => void
}) {
  const active = rules.filter((r) => ruleActiveOn(r, today))
  const now = { at: new Date().toISOString(), day: today }
  if (!active.length && !usable.length && !applied.length) return null
  return (
    <div className="mt-3 space-y-2">
      {usable.map((r) => (
        <div key={r.id} className="anim-pop flex items-center gap-3 rounded-2xl border-2 border-brand bg-brand-soft p-3">
          <Gift className="shrink-0 text-brand" />
          <div className="min-w-0 flex-1 text-brand-soft-ink">
            <div className="font-bold">Reward waiting: {r.rewardLabel}</div>
            <div className="text-xs">
              {r.ruleName} · unlocked {relativeDay(keyOfLocalDate(new Date(r.unlockedAt))).toLowerCase()}
            </div>
          </div>
          <Button size="sm" onClick={() => onApply(r)}>
            Give now
          </Button>
        </div>
      ))}
      {applied.map((r) => (
        <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-good-soft p-3 text-good">
          <Check className="shrink-0" />
          <div className="flex-1 text-sm font-semibold">{r.rewardLabel} given on this bill</div>
          <button className="text-sm font-semibold underline" onClick={() => onUnapply(r.id)}>
            Undo
          </button>
        </div>
      ))}
      {active.map((rule) => {
        const p = progress(rule, sales, rewards, now)
        if (p.finished) return null
        return (
          <div key={rule.id} className="rounded-2xl bg-surface-2 p-3">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-semibold">{rule.name}</span>
              <span className="text-muted">{p.text}</span>
            </div>
            <Progress value={p.current} max={p.target} />
            <div className="mt-1 text-xs text-muted">This bill will count as +1 order{rule.trigger === 'spend' ? ' and its total' : ''}.</div>
          </div>
        )
      })}
    </div>
  )
}

function SaleDone({ res, onNew }: { res: SaveSaleResult; onNew: () => void }) {
  const settings = useSettings()
  const s = res.sale
  return (
    <div className="pb-2 text-center">
      <div className="anim-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-good-soft text-good">
        <Check size={34} strokeWidth={3} />
      </div>
      <div className="mt-3 text-xl font-bold">Sale saved · {inr(s.total)}</div>
      <div className="text-sm text-muted">
        Bill #{s.billNo}
        {res.customer ? ` · ${res.customer.name}` : ''}
      </div>
      {s.change > 0 && (
        <div className="mx-auto mt-4 max-w-xs rounded-2xl bg-good-soft px-4 py-3 text-good">
          <div className="text-sm font-semibold">Return change</div>
          <div className="tabular text-3xl font-bold">{inr(s.change)}</div>
        </div>
      )}
      {s.credit > 0 && <div className="mx-auto mt-3 max-w-xs rounded-2xl bg-warn-soft px-4 py-2 text-sm font-semibold text-warn">{inr(s.credit)} added to {res.customer?.name}'s udhaar</div>}
      {res.unlocked.map((r) => (
        <div key={r.id} className="anim-pop mt-4 rounded-3xl border-2 border-brand bg-brand-soft p-4 text-left text-brand-soft-ink">
          <div className="flex items-center gap-2 text-lg font-bold">
            <PartyPopper /> {res.customer?.name} unlocked a reward!
          </div>
          <div className="mt-1">
            <b>{r.rewardLabel}</b> ({r.ruleName})
          </div>
          <div className="mt-1 text-sm">You will be reminded on their next visit to give it.</div>
        </div>
      ))}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="secondary" icon={<Send size={18} />} onClick={() => void shareText(billText(s, settings, res.customer && !res.customer.isGuest ? res.customer.name : undefined), s.phone ?? res.customer?.phone)}>
          Share bill
        </Button>
        <Button onClick={onNew}>New sale</Button>
      </div>
    </div>
  )
}
