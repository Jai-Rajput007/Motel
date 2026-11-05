import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createItem } from '../../actions/stock'
import { GAS_ITEM_ID } from '../../db'
import { UNITS, type Item, type Unit } from '../../db/types'
import { nameKey } from '../../lib/ids'
import { inr } from '../../lib/money'
import { fmtQty, UNIT_LABEL } from '../../lib/units'
import { attempt } from '../../ui/feedback'
import { Button, Chip, ChipRow, Field, Select, TextInput } from '../../ui/kit'
import { frequentItems, type StockData } from './data'

/** Search existing items or create a new one inline. */
export function ItemPicker({ data, onPick, hideGas, autoFocus = true }: { data: StockData; onPick: (i: Item) => void; hideGas?: boolean; autoFocus?: boolean }) {
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [cat, setCat] = useState(data.categories.find((c) => c.kind === 'vegetable')?.id ?? data.categories[0]?.id ?? 'cat-other')
  const [unit, setUnit] = useState<Unit>('kg')

  const visible = data.items.filter((i) => !i.archived && (!hideGas || i.id !== GAS_ITEM_ID))
  const frequent = frequentItems(data).filter((i) => !hideGas || i.id !== GAS_ITEM_ID)
  const k = nameKey(q)
  const matches = useMemo(
    () => (k ? visible.filter((i) => i.nameKey.includes(k) || (i.alias && nameKey(i.alias).includes(k))).slice(0, 12) : []),
    [k, visible],
  )
  const exact = visible.some((i) => i.nameKey === k)

  const lastLine = (i: Item) => {
    const p = data.byItem.get(i.id)?.[0]
    return p ? `${fmtQty(p.qty, p.unit)} for ${inr(p.amount)}` : 'Never bought'
  }

  return (
    <div>
      <div className="relative mb-3">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <TextInput
          autoFocus={autoFocus}
          placeholder="Search or type a new item…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setCreating(false)
          }}
          className="pl-11"
        />
      </div>

      {!k && frequent.length > 0 && (
        <>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Bought often</div>
          <ChipRow>
            {frequent.map((i) => (
              <Chip key={i.id} onClick={() => onPick(i)}>
                {i.name}
              </Chip>
            ))}
          </ChipRow>
        </>
      )}

      {k && (
        <div className="mb-3 overflow-hidden rounded-2xl border border-line">
          {matches.map((i) => (
            <button key={i.id} onClick={() => onPick(i)} className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-3 text-left last:border-0 active:bg-surface-2">
              <span className="font-medium">
                {i.name}
                {i.alias && <span className="ml-1 text-sm text-muted">({i.alias})</span>}
              </span>
              <span className="text-xs text-muted">{lastLine(i)}</span>
            </button>
          ))}
          {!exact && !creating && (
            <button onClick={() => setCreating(true)} className="flex w-full items-center gap-2 px-4 py-3 text-left font-semibold text-brand active:bg-surface-2">
              <Plus size={18} /> Add “{q.trim()}” as a new item
            </button>
          )}
        </div>
      )}

      {creating && (
        <div className="mb-3 rounded-2xl bg-surface-2 p-3">
          <div className="mb-2 font-semibold">New item: {q.trim()}</div>
          <Field label="Category">
            <ChipRow>
              {data.categories
                .filter((c) => c.kind !== 'gas')
                .map((c) => (
                  <Chip
                    key={c.id}
                    active={cat === c.id}
                    onClick={() => {
                      setCat(c.id)
                      setUnit(c.kind === 'packaged' ? 'packet' : 'kg')
                    }}
                  >
                    {c.name}
                  </Chip>
                ))}
            </ChipRow>
          </Field>
          <Field label="Usually bought in">
            <Select value={unit} onChange={setUnit} options={UNITS.filter((u) => u !== 'cylinder').map((u) => ({ value: u, label: UNIT_LABEL[u] }))} />
          </Field>
          <Button
            block
            onClick={() =>
              attempt(async () => {
                const it = await createItem({ name: q, categoryId: cat, unit })
                setQ('')
                setCreating(false)
                onPick(it)
              })
            }
          >
            Add item
          </Button>
        </div>
      )}

      {!k && visible.length > 0 && (
        <>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">All items</div>
          <div className="flex flex-wrap gap-2">
            {visible.map((i) => (
              <Chip key={i.id} onClick={() => onPick(i)}>
                {i.name}
              </Chip>
            ))}
          </div>
        </>
      )}
      {!k && visible.length === 0 && <p className="text-sm text-muted">Type the name of what you bought, e.g. “Onion”, to add it.</p>}
    </div>
  )
}
