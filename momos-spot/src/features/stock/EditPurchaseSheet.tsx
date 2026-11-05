import { useEffect, useState } from 'react'
import { deletePurchase, updatePurchase } from '../../actions/stock'
import { GAS_ITEM_ID } from '../../db'
import { UNITS, type PayMode, type Purchase, type Unit } from '../../db/types'
import { save } from '../../db/write'
import { UNIT_LABEL, unitPrice } from '../../lib/units'
import { inr } from '../../lib/money'
import { attempt, confirmDialog, toast } from '../../ui/feedback'
import { AmountInput, Button, Field, NumberInput, Segmented, Select, TextInput, WhenField, resolveWhen, whenAt, type When } from '../../ui/kit'
import { Sheet } from '../../ui/Sheet'

export function EditPurchaseSheet({ purchase, name, onClose }: { purchase: Purchase | null; name: string; onClose: () => void }) {
  const [qty, setQty] = useState<number | null>(null)
  const [unit, setUnit] = useState<Unit>('kg')
  const [amount, setAmount] = useState<number | null>(null)
  const [payMode, setPayMode] = useState<PayMode>('cash')
  const [when, setWhen] = useState<When>(whenAt(new Date().toISOString()))
  const [vendor, setVendor] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!purchase) return
    setQty(purchase.qty)
    setUnit(purchase.unit)
    setAmount(purchase.amount)
    setPayMode(purchase.payMode)
    setWhen(whenAt(purchase.at))
    setVendor(purchase.vendor ?? '')
    setNote(purchase.note ?? '')
  }, [purchase])

  if (!purchase) return null
  const isGas = purchase.itemId === GAS_ITEM_ID
  const per = qty && amount ? unitPrice(amount, qty, unit) : null
  return (
    <Sheet
      open
      onClose={onClose}
      title={`Edit ${name}`}
      footer={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="text-bad"
            onClick={async () => {
              if (!(await confirmDialog({ title: `Delete this ${name} purchase?`, body: `${inr(purchase.amount)} will be removed from spending.`, ok: 'Delete', danger: true }))) return
              const ok = await attempt(() => deletePurchase(purchase))
              if (ok) {
                toast('Purchase deleted', isGas ? {} : { undo: () => save<Purchase>('purchases', { ...purchase, deletedAt: null }).then(() => undefined) })
                onClose()
              }
            }}
          >
            Delete
          </Button>
          <Button
            className="flex-1"
            onClick={async () => {
              const ok = await attempt(() =>
                updatePurchase(purchase, { qty: qty ?? 0, unit, amount: amount ?? 0, payMode, at: resolveWhen(when), vendor, note }),
              )
              if (ok) {
                toast('Saved')
                onClose()
              }
            }}
          >
            Save changes
          </Button>
        </div>
      }
    >
      <div className="flex gap-3">
        <Field label={isGas ? 'Cylinders' : 'Quantity'}>
          <NumberInput value={qty} onChange={setQty} decimals={!isGas} />
        </Field>
        {!isGas && (
          <Field label="Unit">
            <Select value={unit} onChange={setUnit} options={UNITS.filter((u) => u !== 'cylinder').map((u) => ({ value: u, label: UNIT_LABEL[u] }))} className="min-w-28" />
          </Field>
        )}
      </div>
      <Field label="Total price paid" hint={per ? `${inr(Math.round(per.price))} per ${per.unit}` : undefined}>
        <AmountInput value={amount} onChange={setAmount} big />
      </Field>
      <Field label="Paid by">
        <Segmented value={payMode} onChange={setPayMode} options={[{ value: 'cash', label: 'Cash' }, { value: 'online', label: 'Online' }]} />
      </Field>
      <WhenField value={when} onChange={setWhen} label="Set to now" />
      <Field label="Shop / vendor">
        <TextInput value={vendor} onChange={(e) => setVendor(e.target.value)} />
      </Field>
      <Field label="Note">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Sheet>
  )
}
