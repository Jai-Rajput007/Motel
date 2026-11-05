import { useState } from 'react'
import { receiveCredit } from '../../actions/customers'
import type { Customer } from '../../db/types'
import { inr } from '../../lib/money'
import { attempt, toast } from '../../ui/feedback'
import { AmountInput, Button, Field, Segmented, TextInput, WhenField, resolveWhen, whenNow, type When } from '../../ui/kit'
import { Sheet } from '../../ui/Sheet'

export function ReceiveSheet({ customer, due, onClose }: { customer: Customer; due: number; onClose: () => void }) {
  const [mode, setMode] = useState<'cash' | 'online' | 'split'>('cash')
  const [cash, setCash] = useState<number | null>(due)
  const [online, setOnline] = useState<number | null>(due)
  const [when, setWhen] = useState<When>(whenNow())
  const [note, setNote] = useState('')
  const c = mode === 'online' ? 0 : cash ?? 0
  const o = mode === 'cash' ? 0 : mode === 'online' ? online ?? 0 : online ?? 0
  const total = c + o
  return (
    <Sheet
      open
      onClose={onClose}
      title={`Receive from ${customer.name}`}
      subtitle={`Due ${inr(due)}`}
      footer={
        <Button
          block
          onClick={async () => {
            if (await attempt(() => receiveCredit({ customerId: customer.id, cash: c, online: o, at: resolveWhen(when), note }))) {
              toast(`${inr(total)} received${total < due ? ` · ${inr(due - total)} still due` : ''}`)
              onClose()
            }
          }}
        >
          Save · {inr(total)}
        </Button>
      }
    >
      <Segmented
        className="mb-4"
        value={mode}
        onChange={(m) => {
          setMode(m)
          if (m === 'split') {
            setCash(null)
            setOnline(null)
          } else {
            setCash(due)
            setOnline(due)
          }
        }}
        options={[{ value: 'cash', label: 'Cash' }, { value: 'online', label: 'Online' }, { value: 'split', label: 'Both' }]}
      />
      {mode !== 'online' && (
        <Field label="Cash">
          <AmountInput value={cash} onChange={setCash} big />
        </Field>
      )}
      {mode !== 'cash' && (
        <Field label="Online">
          <AmountInput value={online} onChange={setOnline} big />
        </Field>
      )}
      {total > due && <div className="mb-3 text-sm text-warn">This is more than the amount due.</div>}
      <WhenField value={when} onChange={setWhen} label="Received just now" />
      <Field label="Note">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </Field>
    </Sheet>
  )
}
