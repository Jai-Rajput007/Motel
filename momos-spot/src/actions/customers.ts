import { alive, db } from '../db'
import type { CreditPayment, Customer, CustomerReward, PayMode, Sale } from '../db/types'
import { atomic, save } from '../db/write'
import { guestCode, nameKey, tidyName, uid } from '../lib/ids'
import { bizDay, UserError } from './common'

export async function newGuestCode(): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const code = guestCode()
    if ((await db.customers.where('guestCode').equals(code).count()) === 0) return code
  }
  return `G-${uid().slice(0, 6).toUpperCase()}`
}

/** Customers whose name matches, for "did you mean…?" suggestions. */
export async function similarCustomers(name: string): Promise<Customer[]> {
  const k = nameKey(name)
  if (!k) return []
  const all = alive(await db.customers.toArray()).filter((c) => !c.isGuest)
  return all.filter((c) => c.nameKey === k || c.nameKey.replace(/\s/g, '') === k.replace(/\s/g, ''))
}

export async function createCustomer(name: string, phone?: string): Promise<Customer> {
  const n = tidyName(name)
  if (!n) throw new UserError('Enter the customer name.')
  const [c] = await save<Customer>('customers', { id: uid(), name: n, nameKey: nameKey(n), phone: cleanPhone(phone), isGuest: false })
  return c
}

export function cleanPhone(p?: string): string | undefined {
  const d = (p ?? '').replace(/[^\d+]/g, '')
  return d.length >= 6 ? d : undefined
}

export async function updateCustomer(c: Customer, ch: { name?: string; phone?: string; note?: string }) {
  const next = { ...c }
  if (ch.name !== undefined) {
    const n = tidyName(ch.name)
    if (!n) throw new UserError('Enter the customer name.')
    next.name = n
    next.nameKey = nameKey(n)
    next.isGuest = false
  }
  if (ch.phone !== undefined) next.phone = cleanPhone(ch.phone)
  if (ch.note !== undefined) next.note = ch.note.trim() || undefined
  await save<Customer>('customers', next)
}

/** Move all history of `fromId` to `intoId`, then hide `fromId`. */
export async function mergeCustomers(fromId: string, intoId: string) {
  if (fromId === intoId) throw new UserError('Choose a different customer.')
  await atomic(['customers', 'sales', 'rewards', 'creditPayments'], async () => {
    const from = await db.customers.get(fromId)
    const into = await db.customers.get(intoId)
    if (!from || !into) throw new UserError('Customer not found.')
    const sales = await db.sales.where('customerId').equals(fromId).toArray()
    if (sales.length) await save<Sale>('sales', sales.map((s) => ({ ...s, customerId: intoId })))
    const rw = await db.rewards.where('customerId').equals(fromId).toArray()
    if (rw.length) await save<CustomerReward>('rewards', rw.map((r) => ({ ...r, customerId: intoId })))
    const cp = await db.creditPayments.where('customerId').equals(fromId).toArray()
    if (cp.length) await save<CreditPayment>('creditPayments', cp.map((r) => ({ ...r, customerId: intoId })))
    if (!into.phone && from.phone) await save<Customer>('customers', { ...into, phone: from.phone })
    await save<Customer>('customers', { ...from, mergedIntoId: intoId, deletedAt: new Date().toISOString() })
  })
}

export async function receiveCredit(o: { customerId: string; cash: number; online: number; at: string; note?: string }) {
  const amount = Math.max(0, o.cash) + Math.max(0, o.online)
  if (amount <= 0) throw new UserError('Enter the amount received.')
  const day = await bizDay(o.at)
  await save<CreditPayment>('creditPayments', {
    id: uid(), customerId: o.customerId, amount, cash: Math.max(0, o.cash), online: Math.max(0, o.online), at: o.at, day, note: o.note?.trim() || undefined,
  })
}

export function balanceOf(sales: Sale[], payments: CreditPayment[]): number {
  const given = sales.filter((s) => !s.deletedAt && s.status === 'done').reduce((t, s) => t + s.credit, 0)
  const back = payments.filter((p) => !p.deletedAt).reduce((t, p) => t + p.amount, 0)
  return given - back
}

export type { PayMode }
