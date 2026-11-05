import { alive, db } from '../db'
import type { AmountChange, CashSession, Expense, ExpenseCategory, Frequency, PayMode, Recurring } from '../db/types'
import { atomic, remove, save } from '../db/write'
import { autoExpenseId, occurrences } from '../lib/calc/recurring'
import { addDays, atOnDay, parts } from '../lib/dates'
import { tidyName, uid } from '../lib/ids'
import { bizDay, UserError } from './common'

export async function addExpense(o: { name: string; categoryId: string; amount: number; at: string; payMode: PayMode; remarks?: string }) {
  const name = tidyName(o.name)
  if (!name) throw new UserError('Enter what the money was spent on.')
  if (!(o.amount > 0)) throw new UserError('Enter the amount.')
  const day = await bizDay(o.at)
  const [e] = await save<Expense>('expenses', {
    id: uid(), name, categoryId: o.categoryId, amount: o.amount, at: o.at, day, payMode: o.payMode, remarks: o.remarks?.trim() || undefined,
  })
  return e
}

export async function updateExpense(e: Expense, ch: Partial<Pick<Expense, 'name' | 'categoryId' | 'amount' | 'at' | 'payMode' | 'remarks'>>) {
  const next = { ...e, ...ch }
  if (!(next.amount > 0)) throw new UserError('Enter the amount.')
  if (!tidyName(next.name)) throw new UserError('Enter a name.')
  next.day = await bizDay(next.at)
  await save<Expense>('expenses', next)
}

export async function deleteExpense(e: Expense) {
  await remove('expenses', e.id)
}

export async function addExpenseCategory(name: string) {
  const n = tidyName(name)
  if (!n) throw new UserError('Enter a name.')
  const all = alive(await db.expenseCategories.toArray())
  const same = all.find((c) => c.name.toLowerCase() === n.toLowerCase())
  if (same) return same
  const [c] = await save<ExpenseCategory>('expenseCategories', { id: uid(), name: n, sort: all.length + 1 })
  return c
}

export interface RecurringInput {
  name: string
  categoryId: string
  frequency: Frequency
  intervalN?: number
  dueDay?: number
  startsOn: string
  endsOn?: string
  installments?: number
  amount: number
  autoPaid: boolean
  payMode: PayMode
  note?: string
}

function checkRecurring(o: RecurringInput) {
  if (!tidyName(o.name)) throw new UserError('Enter a name, e.g. Shop rent.')
  if (!(o.amount > 0)) throw new UserError('Enter the amount.')
  if (!o.startsOn) throw new UserError('Choose the start date.')
  if (o.frequency === 'every_n_days' && !(o.intervalN && o.intervalN >= 1)) throw new UserError('Enter the number of days.')
  if (o.dueDay !== undefined && (o.dueDay < 1 || o.dueDay > 31)) throw new UserError('Due day must be 1–31.')
  if (o.installments !== undefined && !(o.installments >= 1)) throw new UserError('Number of payments must be 1 or more.')
  if (o.endsOn && o.endsOn < o.startsOn) throw new UserError('End date is before the start date.')
}

export async function createRecurring(o: RecurringInput) {
  checkRecurring(o)
  const [r] = await save<Recurring>('recurring', {
    id: uid(), name: tidyName(o.name), categoryId: o.categoryId, frequency: o.frequency, intervalN: o.intervalN,
    dueDay: o.frequency === 'monthly' ? o.dueDay ?? parts(o.startsOn).d : undefined, startsOn: o.startsOn, endsOn: o.endsOn || undefined,
    installments: o.installments || undefined, amounts: [{ from: o.startsOn, amount: o.amount }], autoPaid: o.autoPaid, payMode: o.payMode,
    note: o.note?.trim() || undefined,
  })
  return r
}

/**
 * Edit a recurring cost. A new amount applies from `amountFrom` onward, so past months keep the old amount.
 */
export async function updateRecurring(r: Recurring, o: RecurringInput, amountFrom: string) {
  checkRecurring(o)
  let amounts: AmountChange[] = [...r.amounts]
  const current = [...amounts].sort((a, b) => (a.from < b.from ? -1 : 1)).filter((a) => a.from <= amountFrom).pop()
  if (!current || current.amount !== o.amount) {
    amounts = amounts.filter((a) => a.from < amountFrom)
    amounts.push({ from: amountFrom, amount: o.amount })
    if (amounts.every((a) => a.from > o.startsOn)) amounts[0] = { ...amounts[0], from: o.startsOn }
  }
  await save<Recurring>('recurring', {
    ...r, name: tidyName(o.name), categoryId: o.categoryId, frequency: o.frequency, intervalN: o.intervalN,
    dueDay: o.frequency === 'monthly' ? o.dueDay ?? parts(o.startsOn).d : undefined, startsOn: o.startsOn, endsOn: o.endsOn || undefined,
    installments: o.installments || undefined, amounts, autoPaid: o.autoPaid, payMode: o.payMode, note: o.note?.trim() || undefined,
  })
}

export async function pauseRecurring(r: Recurring, from: string) {
  await save<Recurring>('recurring', { ...r, pauses: [...(r.pauses ?? []).filter((p) => p.to), { from }] })
}

export async function resumeRecurring(r: Recurring, today: string) {
  const pauses = (r.pauses ?? []).map((p) => (p.to ? p : { ...p, to: addDays(today, -1) })).filter((p) => !p.to || p.to >= p.from)
  await save<Recurring>('recurring', { ...r, pauses })
}

export async function deleteRecurring(r: Recurring) {
  await remove('recurring', r.id)
}

export async function payRecurring(r: Recurring, o: { dueDate: string; amount: number; at: string; payMode: PayMode; remarks?: string }) {
  if (!(o.amount > 0)) throw new UserError('Enter the amount paid.')
  const day = await bizDay(o.at)
  await save<Expense>('expenses', {
    id: uid(), name: r.name, categoryId: r.categoryId, amount: o.amount, at: o.at, day, payMode: o.payMode,
    remarks: o.remarks?.trim() || undefined, recurringId: r.id, dueDate: o.dueDate,
  })
}

/**
 * For costs set to "auto-mark as paid" (bank auto-debit), record past due dates as paid.
 * Uses fixed ids so running it again (or on two phones) can never double-count.
 */
export async function autoMarkRecurring(today: string) {
  const list = alive(await db.recurring.toArray()).filter((r) => r.autoPaid)
  if (!list.length) return 0
  let created = 0
  await atomic(['expenses'], async () => {
    for (const r of list) {
      const from = r.startsOn > addDays(today, -400) ? r.startsOn : addDays(today, -400)
      const occ = occurrences(r, from, today)
      if (!occ.length) continue
      const existing = await db.expenses.where('recurringId').equals(r.id).toArray()
      const paidDates = new Set(existing.filter((e) => !e.deletedAt || e.id.startsWith('auto-')).map((e) => e.dueDate))
      const rows: Omit<Expense, 'createdAt' | 'updatedAt'>[] = []
      for (const o of occ) {
        if (paidDates.has(o.date)) continue
        const at = atOnDay(o.date, new Date(new Date().setHours(9, 0, 0, 0)))
        rows.push({ id: autoExpenseId(r, o.date), name: r.name, categoryId: r.categoryId, amount: o.amount, at, day: o.date, payMode: r.payMode, recurringId: r.id, dueDate: o.date, remarks: 'Auto-marked as paid' })
      }
      if (rows.length) {
        await save<Expense>('expenses', rows)
        created += rows.length
      }
    }
  })
  return created
}

export async function openDay(day: string, opening: number) {
  const existing = await db.cashSessions.get(day)
  await save<CashSession>('cashSessions', { ...(existing ?? { id: day, day }), id: day, day, opening: Math.max(0, opening) } as CashSession)
}

export async function closeDay(day: string, counted: number, note?: string) {
  const existing = await db.cashSessions.get(day)
  await save<CashSession>('cashSessions', {
    ...(existing ?? { id: day, day, opening: 0 }), id: day, day, counted: Math.max(0, counted), closedAt: new Date().toISOString(), note: note?.trim() || undefined,
  } as CashSession)
}
