import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { createRecurring, deleteRecurring, payRecurring, pauseRecurring, resumeRecurring, updateRecurring, type RecurringInput } from '../../actions/money'
import type { Expense, Frequency, PayMode, Recurring } from '../../db/types'
import { amountOn, emiProgress, isPaused, occurrences, withStatus, type OccurrenceWithStatus } from '../../lib/calc/recurring'
import { addDays, atOnDay, formatDay, parts, keyOfLocalDate } from '../../lib/dates'
import { inr } from '../../lib/money'
import { attempt, confirmDialog, toast } from '../../ui/feedback'
import { AmountInput, Badge, Button, Chip, DateInput, Field, NumberInput, Progress, Segmented, Select, TextInput, Toggle, WhenField, resolveWhen, whenAt, whenNow, type When } from '../../ui/kit'
import { Sheet } from '../../ui/Sheet'
import { useExpenseCategories } from './ExpenseSheet'

export const FREQ_LABEL: Record<Frequency, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly', every_n_days: 'Every few days' }

export function freqText(r: Recurring): string {
  switch (r.frequency) {
    case 'daily':
      return 'every day'
    case 'weekly':
      return `every week (${formatDay(r.startsOn, { weekday: true }).split(',')[0]})`
    case 'monthly':
      return `every month on the ${ordinal(r.dueDay ?? parts(r.startsOn).d)}`
    case 'yearly':
      return `every year on ${formatDay(r.startsOn)}`
    case 'every_n_days':
      return `every ${r.intervalN} days`
  }
}
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`

const PRESETS: { label: string; v: Partial<RecurringInput> }[] = [
  { label: 'Shop rent', v: { name: 'Shop rent', categoryId: 'exp-rent', frequency: 'monthly' } },
  { label: 'Loan EMI', v: { name: 'Loan EMI', categoryId: 'exp-emi', frequency: 'monthly' } },
  { label: 'Staff salary', v: { name: 'Staff salary', categoryId: 'exp-salary', frequency: 'monthly' } },
  { label: 'Daily wage', v: { name: 'Helper daily wage', categoryId: 'exp-salary', frequency: 'daily' } },
  { label: 'Electricity', v: { name: 'Electricity bill', categoryId: 'exp-electricity', frequency: 'monthly' } },
  { label: 'Daily committee', v: { name: 'Daily committee', categoryId: 'exp-emi', frequency: 'daily' } },
]

export function RecurringSheet({ open, onClose, rec, today }: { open: boolean; onClose: () => void; rec?: Recurring | null; today: string }) {
  const cats = useExpenseCategories()
  const [f, setF] = useState<RecurringInput>(() => blank(today))
  const [endMode, setEndMode] = useState<'never' | 'date' | 'count'>('never')
  const [amountFrom, setAmountFrom] = useState(today)
  useEffect(() => {
    if (!open) return
    if (rec) {
      setF({
        name: rec.name, categoryId: rec.categoryId, frequency: rec.frequency, intervalN: rec.intervalN, dueDay: rec.dueDay, startsOn: rec.startsOn,
        endsOn: rec.endsOn, installments: rec.installments, amount: amountOn(rec, today), autoPaid: rec.autoPaid, payMode: rec.payMode, note: rec.note,
      })
      setEndMode(rec.installments ? 'count' : rec.endsOn ? 'date' : 'never')
      setAmountFrom(today)
    } else {
      setF(blank(today))
      setEndMode('never')
    }
  }, [open, rec, today])
  const set = (p: Partial<RecurringInput>) => setF((x) => ({ ...x, ...p }))
  const amountChanged = rec && f.amount !== amountOn(rec, today)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      tall
      title={rec ? `Edit ${rec.name}` : 'Add fixed / recurring cost'}
      subtitle={rec ? undefined : 'Rent, EMI, salary, bills… anything that repeats'}
      footer={
        <Button
          block
          onClick={async () => {
            const input: RecurringInput = {
              ...f,
              endsOn: endMode === 'date' ? f.endsOn : undefined,
              installments: endMode === 'count' ? f.installments : undefined,
              intervalN: f.frequency === 'every_n_days' ? f.intervalN : undefined,
            }
            const ok = await attempt(() => (rec ? updateRecurring(rec, input, amountFrom) : createRecurring(input).then(() => undefined)))
            if (ok) {
              toast(rec ? 'Saved' : `${f.name.trim()} added`)
              onClose()
            }
          }}
        >
          Save
        </Button>
      }
    >
      {!rec && (
        <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5">
          {PRESETS.map((p) => (
            <Chip key={p.label} onClick={() => set(p.v)}>
              {p.label}
            </Chip>
          ))}
        </div>
      )}
      <Field label="Name">
        <TextInput value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Shop rent" />
      </Field>
      <Field label="Amount each time">
        <AmountInput value={f.amount || null} onChange={(p) => set({ amount: p ?? 0 })} big />
      </Field>
      {amountChanged && (
        <Field label="New amount applies from" hint="Earlier dates keep the old amount">
          <DateInput value={amountFrom} onChange={setAmountFrom} />
        </Field>
      )}
      <Field label="Category">
        <Select value={f.categoryId} onChange={(v) => set({ categoryId: v })} options={cats.map((c) => ({ value: c.id, label: c.name }))} />
      </Field>
      <Field label="How often">
        <Select value={f.frequency} onChange={(v) => set({ frequency: v })} options={(Object.keys(FREQ_LABEL) as Frequency[]).map((k) => ({ value: k, label: FREQ_LABEL[k] }))} />
      </Field>
      {f.frequency === 'every_n_days' && (
        <Field label="Every how many days?">
          <NumberInput value={f.intervalN ?? null} onChange={(n) => set({ intervalN: n ?? undefined })} decimals={false} />
        </Field>
      )}
      <Field label={f.frequency === 'daily' ? 'Starts on' : 'First due date'}>
        <DateInput value={f.startsOn} onChange={(v) => set({ startsOn: v, dueDay: f.frequency === 'monthly' ? parts(v).d : f.dueDay })} />
      </Field>
      {f.frequency === 'monthly' && (
        <Field label="Due on day of month" hint="If a month is shorter (e.g. 31st in Feb), the last day is used">
          <NumberInput value={f.dueDay ?? parts(f.startsOn).d} onChange={(n) => set({ dueDay: n ? Math.min(31, Math.max(1, n)) : undefined })} decimals={false} />
        </Field>
      )}
      <Field label="Ends">
        <Segmented value={endMode} onChange={setEndMode} options={[{ value: 'never', label: 'Never' }, { value: 'count', label: 'After N payments' }, { value: 'date', label: 'On a date' }]} />
      </Field>
      {endMode === 'count' && (
        <Field label="Total number of payments" hint="e.g. 24 for a 2-year EMI">
          <NumberInput value={f.installments ?? null} onChange={(n) => set({ installments: n ?? undefined })} decimals={false} />
        </Field>
      )}
      {endMode === 'date' && (
        <Field label="Last date">
          <DateInput value={f.endsOn ?? addDays(today, 365)} onChange={(v) => set({ endsOn: v })} min={f.startsOn} />
        </Field>
      )}
      <Field label="Usually paid by">
        <Segmented value={f.payMode} onChange={(v: PayMode) => set({ payMode: v })} options={[{ value: 'cash', label: 'Cash' }, { value: 'online', label: 'Online / bank' }]} />
      </Field>
      <Toggle checked={f.autoPaid} onChange={(v) => set({ autoPaid: v })} label="Mark as paid automatically" sub="For bank auto-debits. Each due date is recorded as paid on its own." />
      <Field label="Note (optional)">
        <TextInput value={f.note ?? ''} onChange={(e) => set({ note: e.target.value })} />
      </Field>
    </Sheet>
  )
}

function blank(today: string): RecurringInput {
  return { name: '', categoryId: 'exp-rent', frequency: 'monthly', startsOn: today, dueDay: parts(today).d, amount: 0, autoPaid: false, payMode: 'online' }
}

export function statusBadge(o: OccurrenceWithStatus) {
  switch (o.status) {
    case 'paid':
      return <Badge tone="good">Paid</Badge>
    case 'partial':
      return <Badge tone="warn">Part paid {inr(o.paid)}</Badge>
    case 'overdue':
      return <Badge tone="bad">Overdue</Badge>
    case 'due':
      return <Badge tone="warn">Due today</Badge>
    case 'upcoming':
      return <Badge>Upcoming</Badge>
  }
}

export function RecurringDetail({ rec, expenses, today, onClose, onEdit }: { rec: Recurring; expenses: Expense[]; today: string; onClose: () => void; onEdit: () => void }) {
  const [pay, setPay] = useState<OccurrenceWithStatus | null>(null)
  const span = rec.frequency === 'daily' ? 14 : rec.frequency === 'weekly' || rec.frequency === 'every_n_days' ? 70 : rec.frequency === 'monthly' ? 190 : 800
  const occ = withStatus(rec, occurrences(rec, addDays(today, -span), addDays(today, Math.round(span / 2))), expenses, today)
  const emi = emiProgress(rec, expenses)
  const paused = isPaused(rec, today)
  const unpaidPast = occ.filter((o) => o.date <= today && o.status !== 'paid')
  return (
    <Sheet
      open
      onClose={onClose}
      tall
      title={rec.name}
      subtitle={`${inr(amountOn(rec, today))} ${freqText(rec)}${paused ? ' · paused' : ''}`}
      footer={
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" onClick={onEdit}>Edit</Button>
          <Button
            variant="secondary"
            onClick={() =>
              attempt(async () => {
                if (paused) await resumeRecurring(rec, today)
                else await pauseRecurring(rec, today)
                toast(paused ? 'Resumed' : 'Paused. No new dues until you resume.')
              })
            }
          >
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            variant="secondary"
            className="text-bad"
            onClick={async () => {
              if (!(await confirmDialog({ title: `Delete ${rec.name}?`, body: 'Payments already recorded stay in your expenses.', ok: 'Delete', danger: true }))) return
              if (await attempt(() => deleteRecurring(rec))) {
                toast('Deleted')
                onClose()
              }
            }}
          >
            Delete
          </Button>
        </div>
      }
    >
      {emi && (
        <div className="mb-4 rounded-2xl bg-surface-2 p-3">
          <div className="mb-1 flex justify-between text-sm font-semibold">
            <span>{emi.done} of {emi.total} paid</span>
            <span>{inr(emi.leftAmount)} left</span>
          </div>
          <Progress value={emi.done} max={emi.total} tone="good" />
          {emi.endDate && <div className="mt-1 text-xs text-muted">Last payment {formatDay(emi.endDate, { year: true })}</div>}
        </div>
      )}
      {unpaidPast.length > 1 && (
        <Button
          variant="soft"
          block
          className="mb-3"
          onClick={async () => {
            if (!(await confirmDialog({ title: `Mark ${unpaidPast.length} dues as paid?`, body: `Total ${inr(unpaidPast.reduce((s, o) => s + o.amount - o.paid, 0))}, each on its due date.`, ok: 'Mark paid' }))) return
            await attempt(async () => {
              for (const o of unpaidPast) await payRecurring(rec, { dueDate: o.date, amount: o.amount - o.paid, at: atOnDay(o.date), payMode: rec.payMode })
              toast('Marked as paid')
            })
          }}
        >
          Mark all {unpaidPast.length} past dues paid
        </Button>
      )}
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {occ.length === 0 && <div className="p-4 text-sm text-muted">No due dates in this period.</div>}
        {occ.map((o) => (
          <div key={o.date} className={clsx('flex items-center gap-3 px-3 py-2.5', o.date === today && 'bg-brand-soft/50')}>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{formatDay(o.date, { weekday: true })}</div>
              <div className="tabular text-xs text-muted">{inr(o.amount)}</div>
            </div>
            {statusBadge(o)}
            {o.status !== 'paid' && o.date <= addDays(today, 31) && (
              <Button size="sm" variant="soft" onClick={() => setPay(o)}>
                Pay
              </Button>
            )}
          </div>
        ))}
      </div>
      {pay && <PaySheet rec={rec} occ={pay} onClose={() => setPay(null)} />}
    </Sheet>
  )
}

export function PaySheet({ rec, occ, onClose }: { rec: Recurring; occ: OccurrenceWithStatus; onClose: () => void }) {
  const [amount, setAmount] = useState<number | null>(occ.amount - occ.paid)
  const [payMode, setPayMode] = useState<PayMode>(rec.payMode)
  const [when, setWhen] = useState<When>(whenNow())
  const [remarks, setRemarks] = useState('')
  return (
    <Sheet
      open
      onClose={onClose}
      title={`Pay ${rec.name}`}
      subtitle={`Due ${formatDay(occ.date, { weekday: true })} · ${inr(occ.amount)}${occ.paid ? ` · already paid ${inr(occ.paid)}` : ''}`}
      footer={
        <Button
          block
          onClick={async () => {
            if (await attempt(() => payRecurring(rec, { dueDate: occ.date, amount: amount ?? 0, at: resolveWhen(when), payMode, remarks }))) {
              toast(`${rec.name} paid · ${inr(amount ?? 0)}`)
              onClose()
            }
          }}
        >
          Mark paid
        </Button>
      }
    >
      <Field label="Amount paid" hint="You can pay part now and the rest later">
        <AmountInput value={amount} onChange={setAmount} big />
      </Field>
      <Field label="Paid by">
        <Segmented value={payMode} onChange={setPayMode} options={[{ value: 'cash', label: 'Cash' }, { value: 'online', label: 'Online / bank' }]} />
      </Field>
      <WhenField value={when} onChange={setWhen} label="Paid just now" />
      {occ.date < keyOfLocalDate(new Date()) && (
        <div className="-mt-2 mb-3">
          <button className="text-sm font-semibold text-brand" onClick={() => setWhen(whenAt(atOnDay(occ.date)))}>
            Paid on the due date ({formatDay(occ.date)})
          </button>
        </div>
      )}
      <Field label="Remarks (optional)">
        <TextInput value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </Field>
    </Sheet>
  )
}
