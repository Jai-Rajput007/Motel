import { useEffect, useState } from 'react'
import { markFinished } from '../../actions/stock'
import type { Item } from '../../db/types'
import { inr } from '../../lib/money'
import { fmtQty } from '../../lib/units'
import { relativeDay } from '../../lib/dates'
import { attempt, toast } from '../../ui/feedback'
import { Button, Field, TextInput } from '../../ui/kit'
import { Sheet } from '../../ui/Sheet'
import { useStock } from './data'
import { ItemPicker } from './ItemPicker'

/** "This item is over": adds it to the shopping list. */
export function FinishedSheet({ open, onClose, itemId }: { open: boolean; onClose: () => void; itemId?: string }) {
  const data = useStock()
  const [item, setItem] = useState<Item | null>(null)
  const [note, setNote] = useState('')
  useEffect(() => {
    if (!open) return
    setNote('')
    setItem(itemId && data ? data.itemsById.get(itemId) ?? null : null)
  }, [open, itemId, data])
  if (!data) return null
  const last = item ? data.byItem.get(item.id)?.[0] : undefined
  return (
    <Sheet
      open={open}
      onClose={onClose}
      tall={!item}
      title="Item finished"
      subtitle="It goes on the shopping list so you remember to buy it"
      footer={
        item && (
          <Button
            block
            onClick={async () => {
              const ok = await attempt(() => markFinished(item.id, note))
              if (ok) {
                toast(`${item.name} added to shopping list`)
                onClose()
              }
            }}
          >
            Add to shopping list
          </Button>
        )
      }
    >
      {!item ? (
        <ItemPicker data={data} onPick={setItem} hideGas />
      ) : (
        <>
          <div className="mb-4 rounded-2xl border border-line p-3">
            <div className="text-lg font-semibold">{item.name}</div>
            <div className="text-sm text-muted">
              {last ? `Last bought ${fmtQty(last.qty, last.unit)} for ${inr(last.amount)} · ${relativeDay(last.day)}` : 'Not bought yet'}
            </div>
            <button className="mt-1 text-sm font-semibold text-brand" onClick={() => setItem(null)}>
              Change item
            </button>
          </div>
          <Field label="Note (optional)">
            <TextInput autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. need 5 kg" />
          </Field>
        </>
      )}
    </Sheet>
  )
}
