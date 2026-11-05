import { AlertTriangle, History, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { addPurchases, type PurchaseInput } from '../../actions/stock'
import { GAS_ITEM_ID } from '../../db'
import { UNITS, type Item, type PayMode, type Unit } from '../../db/types'
import { atOnDay, formatDateTime, relativeDay } from '../../lib/dates'
import { inr, paiseToInput } from '../../lib/money'
import { fmtQty, UNIT_LABEL, unitPrice } from '../../lib/units'
import { attempt, toast } from '../../ui/feedback'
import { AmountInput, Button, ErrorText, Field, NumberInput, Segmented, Select, TextInput, WhenField, resolveWhen, whenAt, whenNow, type When } from '../../ui/kit'
import { Sheet } from '../../ui/Sheet'
import { itemStats, useStock } from './data'
import { ItemPicker } from './ItemPicker'

interface Line extends PurchaseInput {
  key: string
  name: string
}

export function PurchaseSheet({ open, onClose, itemId, day }: { open: boolean; onClose: () => void; itemId?: string; day?: string }) {
  const data = useStock()
  const [item, setItem] = useState<Item | null>(null)
  const [qty, setQty] = useState<number | null>(1)
  const [unit, setUnit] = useState<Unit>('kg')
  const [amount, setAmount] = useState<number | null>(null)
  const [payMode, setPayMode] = useState<PayMode>('cash')
  const [when, setWhen] = useState<When>(whenNow())
  const [vendor, setVendor] = useState('')
  const [note, setNote] = useState('')
  const [more, setMore] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const [declared, setDeclared] = useState<number | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setLines([])
    setDeclared(null)
    setErr('')
    setVendor('')
    setWhen(day ? whenAt(atOnDay(day)) : whenNow())
    resetLine(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open && itemId && data && !item) {
      const it = data.itemsById.get(itemId)
      if (it) pick(it)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemId, data])

  function resetLine(next: Item | null) {
    setItem(next)
    setQty(1)
    setAmount(null)
    setNote('')
    setErr('')
    if (next) setUnit(next.unit)
  }

  function pick(i: Item) {
    resetLine(i)
    const last = data?.byItem.get(i.id)?.[0]
    if (last) {
      setUnit(last.unit)
      setQty(last.qty)
    }
  }

  const stats = useMemo(() => (item && data ? itemStats(data.byItem.get(item.id)) : null), [item, data])
  const per = item && qty && amount ? unitPrice(amount, qty, unit) : null
  const jump = per && stats?.avgUnit && stats.baseUnit === per.unit && stats.count >= 2 ? (per.price - stats.avgUnit) / stats.avgUnit : 0
  const isGas = item?.id === GAS_ITEM_ID

  const vendors = useMemo(() => [...new Set((data?.purchases ?? []).map((p) => p.vendor).filter(Boolean) as string[])].slice(0, 30), [data])

  function currentLine(): Line | null {
    if (!item) {
      setErr('Choose an item.')
      return null
    }
    if (!qty || qty <= 0) {
      setErr('Enter the quantity.')
      return null
    }
    if (isGas && !Number.isInteger(qty)) {
      setErr('Number of cylinders must be a whole number.')
      return null
    }
    if (!amount || amount <= 0) {
      setErr('Enter the price paid.')
      return null
    }
    return { key: crypto.randomUUID?.() ?? String(Date.now()), name: item.name, itemId: item.id, qty, unit, amount, payMode, at: '', note }
  }

  const addAnother = () => {
    const l = currentLine()
    if (!l) return
    setLines((x) => [...x, l])
    resetLine(null)
  }

  const saveAll = async () => {
    const pendingLine = item || amount ? currentLine() : null
    if ((item || amount) && !pendingLine) return
    const all = [...lines, ...(pendingLine ? [pendingLine] : [])]
    if (all.length === 0) {
      setErr('Choose an item.')
      return
    }
    setBusy(true)
    const at = resolveWhen(when)
    const ok = await attempt(async () => {
      await addPurchases(
        all.map((l) => ({ ...l, at, payMode, vendor })),
        all.length > 1 || declared ? { vendor, declaredTotal: declared ?? undefined } : undefined,
      )
    })
    setBusy(false)
    if (ok) {
      toast(all.length > 1 ? `${all.length} items saved · ${inr(all.reduce((s, l) => s + l.amount, 0))}` : `${all[0].name} saved · ${inr(all[0].amount)}`)
      onClose()
    }
  }

  const tripTotal = lines.reduce((s, l) => s + l.amount, 0) + (amount ?? 0)
  const diff = declared ? declared - tripTotal : 0

  if (!data) return null
  return (
    <Sheet
      open={open}
      onClose={onClose}
      tall
      title={lines.length ? `Market trip · ${lines.length + (item ? 1 : 0)} items` : 'Add purchase'}
      subtitle={day ? `For ${relativeDay(day)}` : undefined}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={addAnother} disabled={busy}>
            + Next item
          </Button>
          <Button className="flex-[1.4]" onClick={saveAll} disabled={busy}>
            Save{lines.length ? ` all · ${inr(tripTotal)}` : ''}
          </Button>
        </div>
      }
    >
      {lines.length > 0 && (
        <div className="mb-4 rounded-2xl bg-surface-2 p-3">
          {lines.map((l) => (
            <div key={l.key} className="flex items-center gap-2 py-1.5">
              <span className="flex-1 truncate font-medium">{l.name}</span>
              <span className="text-sm text-muted">{fmtQty(l.qty, l.unit)}</span>
              <span className="tabular w-20 text-right font-semibold">{inr(l.amount)}</span>
              <button aria-label="Remove" className="p-1 text-muted" onClick={() => setLines((x) => x.filter((y) => y.key !== l.key))}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!item ? (
        <ItemPicker data={data} onPick={pick} />
      ) : (
        <>
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-line p-3">
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold">{item.name}</div>
              {stats?.last ? (
                <button
                  className="mt-1 flex items-center gap-1.5 text-left text-sm text-muted"
                  onClick={() => {
                    setQty(stats.last!.qty)
                    setUnit(stats.last!.unit)
                    setAmount(stats.last!.amount)
                  }}
                >
                  <History size={14} className="shrink-0" />
                  <span>
                    Last: {fmtQty(stats.last.qty, stats.last.unit)} for <b className="text-ink">{inr(stats.last.amount)}</b> · {relativeDay(stats.last.day)}
                    {stats.last.vendor ? ` · ${stats.last.vendor}` : ''} <span className="font-semibold text-brand">Use</span>
                  </span>
                </button>
              ) : (
                <div className="mt-1 text-sm text-muted">First time buying this</div>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => resetLine(null)}>
              Change
            </Button>
          </div>

          <div className="flex gap-3">
            <Field label={isGas ? 'Cylinders' : 'Quantity'}>
              <NumberInput value={qty} onChange={setQty} decimals={!isGas} className="w-full" />
            </Field>
            {!isGas && (
              <Field label="Unit">
                <Select value={unit} onChange={setUnit} options={UNITS.filter((u) => u !== 'cylinder').map((u) => ({ value: u, label: UNIT_LABEL[u] }))} className="min-w-28" />
              </Field>
            )}
          </div>

          <Field
            label="Total price paid"
            hint={per ? `${inr(Math.round(per.price))} per ${per.unit}${stats?.avgUnit && stats.baseUnit === per.unit ? ` · usual ${inr(Math.round(stats.avgUnit))}` : ''}` : undefined}
          >
            <AmountInput value={amount} onChange={setAmount} big autoFocus />
          </Field>
          {Math.abs(jump) >= 0.25 && (
            <div className={`mb-4 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium ${jump > 0 ? 'bg-warn-soft text-warn' : 'bg-good-soft text-good'}`}>
              <AlertTriangle size={16} />
              {jump > 0 ? `${Math.round(jump * 100)}% costlier than usual` : `${Math.round(-jump * 100)}% cheaper than usual`}
            </div>
          )}
        </>
      )}

      <div className="mt-2 border-t border-line pt-4">
        <Field label="Paid by">
          <Segmented value={payMode} onChange={setPayMode} options={[{ value: 'cash', label: 'Cash' }, { value: 'online', label: 'Online' }]} />
        </Field>
        <WhenField value={when} onChange={setWhen} label="Bought just now" />
        {!when.now && <div className="-mt-2 mb-4 text-xs text-muted">Saving for {formatDateTime(when.at)}</div>}

        {(lines.length > 0 || more) && (
          <Field label="Total I actually paid (optional)" hint={declared ? (diff === 0 ? 'Matches the items ✓' : `Items add up to ${inr(tripTotal)}. Difference ${inr(diff, { sign: true })}`) : 'Helps catch mistakes on a market trip'}>
            <AmountInput value={declared} onChange={setDeclared} placeholder={paiseToInput(tripTotal) || '0'} />
          </Field>
        )}

        {more ? (
          <>
            <Field label="Shop / vendor">
              <TextInput list="vendors" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Ramesh Sabzi" />
              <datalist id="vendors">
                {vendors.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </Field>
            {item && (
              <Field label="Note">
                <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
              </Field>
            )}
          </>
        ) : (
          <button className="mb-2 text-sm font-semibold text-brand" onClick={() => setMore(true)}>
            + Shop name, note
          </button>
        )}
        <ErrorText>{err}</ErrorText>
      </div>
    </Sheet>
  )
}
