import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { addExpense, addExpenseCategory, deleteExpense, updateExpense } from '../../actions/money'
import { alive, db } from '../../db'
import type { Expense, PayMode } from '../../db/types'
import { save } from '../../db/write'
import { atOnDay, relativeDay } from '../../lib/dates'
import { inr } from '../../lib/money'
import { attempt, confirmDialog, promptDialog, toast } from '../../ui/feedback'
import { AmountInput, Button, Chip, Field, Segmented, TextInput, WhenField, resolveWhen, whenAt, whenNow, type When } from '../../ui/kit'
import { Sheet } from '../../ui/Sheet'

export function useExpenseCategories() {
  return useLiveQuery(async () => alive(await db.expenseCategories.toArray()).sort((a, b) => a.sort - b.sort), []) ?? []
}

/** Add (or edit) a one-time expense: name, amount, category, when, remarks. */
export function ExpenseSheet({ open, onClose, day, expense }: { open: boolean; onClose: () => void; day?: string; expense?: Expense | null }) {
  const cats = useExpenseCategories()
  const recent = useLiveQuery(async () => {
    const all = alive(await db.expenses.orderBy('day').reverse().limit(300).toArray()).filter((e) => !e.recurringId)
    const seen = new Map<string, Expense>()
    for (const e of all) if (!seen.has(e.name.toLowerCase())) seen.set(e.name.toLowerCase(), e)
    return [...seen.values()].slice(0, 12)
  }, [])
  const [name, setName] = useState('')
  const [cat, setCat] = useState('exp-other')
  const [amount, setAmount] = useState<number | null>(null)
  const [payMode, setPayMode] = useState<PayMode>('cash')
  const [when, setWhen] = useState<When>(whenNow())
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    if (!open) return
    if (expense) {
      setName(expense.name)
      setCat(expense.categoryId)
      setAmount(expense.amount)
      setPayMode(expense.payMode)
      setWhen(whenAt(expense.at))
      setRemarks(expense.remarks ?? '')
    } else {
      setName('')
      setCat('exp-other')
      setAmount(null)
      setPayMode('cash')
      setRemarks('')
      setWhen(day ? whenAt(atOnDay(day)) : whenNow())
    }
  }, [open, expense, day])

  const nonFixed = useMemo(() => cats.filter((c) => !['exp-rent', 'exp-emi'].includes(c.id) || c.id === cat), [cats, cat])

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={expense ? 'Edit expense' : 'Add expense'}
      subtitle={!expense && day ? `For ${relativeDay(day)}` : expense?.recurringId ? 'Payment of a fixed cost' : 'Any one-time spend: repair, equipment, transport…'}
      footer={
        <div className="flex gap-2">
          {expense && (
            <Button
              variant="secondary"
              className="text-bad"
              onClick={async () => {
                if (!(await confirmDialog({ title: 'Delete this expense?', body: `${expense.name} · ${inr(expense.amount)}`, ok: 'Delete', danger: true }))) return
                if (await attempt(() => deleteExpense(expense))) {
                  toast('Expense deleted', { undo: () => save<Expense>('expenses', { ...expense, deletedAt: null }).then(() => undefined) })
                  onClose()
                }
              }}
            >
              Delete
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={async () => {
              const input = { name, categoryId: cat, amount: amount ?? 0, at: resolveWhen(when), payMode, remarks }
              const ok = await attempt(() => (expense ? updateExpense(expense, input) : addExpense(input)))
              if (ok) {
                toast(`${name.trim()} · ${inr(amount ?? 0)} saved`)
                onClose()
              }
            }}
          >
            Save
          </Button>
        </div>
      }
    >
      <Field label="What was it for?">
        <TextInput autoFocus={!expense} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fridge repair" />
      </Field>
      {!expense && !name && recent && recent.length > 0 && (
        <div className="no-scrollbar -mt-2 mb-4 flex gap-2 overflow-x-auto">
          {recent.map((e) => (
            <Chip
              key={e.id}
              onClick={() => {
                setName(e.name)
                setCat(e.categoryId)
              }}
            >
              {e.name}
            </Chip>
          ))}
        </div>
      )}
      <Field label="Amount">
        <AmountInput value={amount} onChange={setAmount} big />
      </Field>
      <Field label="Category">
        <div className="flex flex-wrap gap-2">
          {nonFixed.map((c) => (
            <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
              {c.name}
            </Chip>
          ))}
          <Chip
            onClick={async () => {
              const n = await promptDialog({ title: 'New category', placeholder: 'e.g. Marketing' })
              if (n) await attempt(async () => setCat((await addExpenseCategory(n)).id))
            }}
          >
            + New
          </Chip>
        </div>
      </Field>
      <Field label="Paid by">
        <Segmented value={payMode} onChange={setPayMode} options={[{ value: 'cash', label: 'Cash' }, { value: 'online', label: 'Online' }]} />
      </Field>
      <WhenField value={when} onChange={setWhen} label={expense ? 'Set to now' : 'Paid just now'} />
      <Field label="Remarks (optional)">
        <TextInput value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any details" />
      </Field>
    </Sheet>
  )
}
