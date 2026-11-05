import { alive, db } from '../db'
import type { Customer, CustomerReward, LoyaltyRule, MenuItem, Sale, SaleLine } from '../db/types'
import { atomic, save } from '../db/write'
import { computeTotals, settle } from '../lib/calc/cart'
import { expiryFrom, rewardLabel, rulesUnlockedBy } from '../lib/calc/loyalty'
import { nameKey, tidyName, uid } from '../lib/ids'
import { inr } from '../lib/money'
import { bizDay, getSettings, UserError } from './common'
import { cleanPhone, newGuestCode } from './customers'

export type CustomerChoice =
  | { mode: 'none' }
  | { mode: 'existing'; id: string }
  | { mode: 'new'; name: string; phone?: string }
  | { mode: 'guest' }

export interface SaleDraft {
  id?: string
  lines: SaleLine[]
  isDelivery: boolean
  deliveryFee: number
  /** manual discount + reward discount */
  discount: number
  /** the part of `discount` that comes from rewards */
  rewardDiscount?: number
  discountReason?: string
  customer: CustomerChoice
  address?: string
  phone?: string
  cashTendered: number
  online: number
  /** what to do with an unpaid part */
  shortfallAs?: 'credit' | 'discount'
  redeemRewardIds: string[]
  at?: string
  note?: string
}

export interface SaveSaleResult {
  sale: Sale
  customer?: Customer
  unlocked: CustomerReward[]
}

export async function saveSale(d: SaleDraft): Promise<SaveSaleResult> {
  const lines = d.lines.filter((l) => l.qty > 0)
  if (lines.length === 0) throw new UserError('Add at least one item.')
  if (lines.some((l) => l.price < 0 || !Number.isFinite(l.price))) throw new UserError('An item has an invalid price.')
  const settings = await getSettings()
  const totals = computeTotals({ lines, isDelivery: d.isDelivery, deliveryFee: d.deliveryFee, freeDeliveryAbove: settings.freeDeliveryAbove, discount: d.discount })
  let { discount, total } = totals
  const rewardPart = Math.min(d.rewardDiscount ?? 0, discount)
  const parts = { manual: discount - rewardPart, reward: rewardPart, short: 0 }
  const pay = settle(total, d.cashTendered, d.online)
  if (pay.error) throw new UserError(pay.error)
  let credit = 0
  if (pay.shortfall > 0) {
    if (d.shortfallAs === 'credit') {
      if (d.customer.mode !== 'existing' && d.customer.mode !== 'new') throw new UserError('Credit (udhaar) needs a customer name.')
      credit = pay.shortfall
    } else if (d.shortfallAs === 'discount') {
      discount += pay.shortfall
      total -= pay.shortfall
      parts.short = pay.shortfall
    } else {
      throw new UserError(`Payment is short by ${inr(pay.shortfall)}.`)
    }
  }
  const at = d.at ?? new Date().toISOString()
  const day = await bizDay(at)
  const guestCodeValue = d.customer.mode === 'guest' ? await newGuestCode() : undefined

  return atomic(['customers', 'sales', 'rewards', 'loyaltyRules', 'menuItems'], async () => {
    // ---- customer
    let customer: Customer | undefined
    if (d.customer.mode === 'existing') {
      customer = await db.customers.get(d.customer.id)
      if (!customer || customer.deletedAt) throw new UserError('That customer no longer exists.')
      if (d.phone && !customer.phone) [customer] = await save<Customer>('customers', { ...customer, phone: cleanPhone(d.phone) })
    } else if (d.customer.mode === 'new') {
      const n = tidyName(d.customer.name)
      if (!n) throw new UserError('Enter the customer name.')
      ;[customer] = await save<Customer>('customers', {
        id: uid(), name: n, nameKey: nameKey(n), phone: cleanPhone(d.customer.phone ?? d.phone), isGuest: false,
      })
    } else if (d.customer.mode === 'guest') {
      ;[customer] = await save<Customer>('customers', { id: uid(), name: guestCodeValue!, nameKey: nameKey(guestCodeValue!), isGuest: true, guestCode: guestCodeValue })
    }

    // ---- editing: undo loyalty effects of the old version first
    const old = d.id ? await db.sales.get(d.id) : undefined
    if (d.id && !old) throw new UserError('Sale not found.')
    if (old) await undoLoyalty(old.id, d.redeemRewardIds)

    let billNo = old?.billNo
    if (!billNo) billNo = String((await db.sales.where('day').equals(day).count()) + 1)

    const id = old?.id ?? uid()
    const sale: Omit<Sale, 'createdAt' | 'updatedAt'> = {
      id, billNo, day: old && !d.at ? old.day : day, at: old && !d.at ? old.at : at,
      customerId: customer?.id, isDelivery: d.isDelivery, address: d.isDelivery ? d.address?.trim() || undefined : undefined,
      phone: cleanPhone(d.phone), lines, subtotal: totals.subtotal, deliveryFee: totals.deliveryFee, discount, discountParts: discount ? parts : undefined,
      discountReason: discount > 0 ? d.discountReason?.trim() || (pay.shortfall > 0 && d.shortfallAs === 'discount' ? 'Short payment' : undefined) : undefined,
      total, cash: pay.cash, cashTendered: Math.max(0, d.cashTendered), change: pay.change, online: pay.online, credit,
      status: 'done', rewardIds: d.redeemRewardIds.length ? d.redeemRewardIds : undefined, note: d.note?.trim() || undefined,
      createdAt: old?.createdAt,
    } as Sale
    const [saved] = await save<Sale>('sales', sale)

    // ---- redeem rewards used on this bill
    for (const rid of d.redeemRewardIds) {
      const r = await db.rewards.get(rid)
      if (!r || r.deletedAt) continue
      if (r.status === 'redeemed' && r.redeemedSaleId !== id) throw new UserError('A reward on this bill was already used.')
      await save<CustomerReward>('rewards', { ...r, status: 'redeemed', redeemedSaleId: id, redeemedAt: saved.at })
    }

    // ---- loyalty: did this sale unlock anything?
    const unlocked: CustomerReward[] = []
    if (customer && !customer.isGuest) {
      const rules = alive(await db.loyaltyRules.toArray()) as LoyaltyRule[]
      const menu = alive(await db.menuItems.toArray()) as MenuItem[]
      const cSales = alive(await db.sales.where('customerId').equals(customer.id).toArray())
      const cRewards = alive(await db.rewards.where('customerId').equals(customer.id).toArray())
      for (const rule of rulesUnlockedBy(saved, rules, cSales, cRewards)) {
        const [r] = await save<CustomerReward>('rewards', {
          id: uid(), customerId: customer.id, ruleId: rule.id, ruleName: rule.name, rewardLabel: rewardLabel(rule, menu),
          unlockedBySaleId: id, unlockedAt: saved.at, status: 'waiting', expiresAt: expiryFrom(saved.at, rule.expiryDays),
        })
        unlocked.push(r)
      }
    }
    return { sale: saved, customer, unlocked }
  })
}

/** Cancel unused rewards this sale unlocked, and give back rewards it used (except ones kept on the bill). */
async function undoLoyalty(saleId: string, keepRedeemed: string[] = []) {
  const unlockedBy = alive(await db.rewards.where('unlockedBySaleId').equals(saleId).toArray())
  for (const r of unlockedBy) if (r.status === 'waiting') await save<CustomerReward>('rewards', { ...r, status: 'cancelled' })
  const used = alive(await db.rewards.where('redeemedSaleId').equals(saleId).toArray())
  for (const r of used)
    if (!keepRedeemed.includes(r.id)) await save<CustomerReward>('rewards', { ...r, status: 'waiting', redeemedSaleId: undefined, redeemedAt: undefined })
}

export async function voidSale(id: string, reason: string) {
  if (!reason.trim()) throw new UserError('Enter a reason.')
  await atomic(['sales', 'rewards'], async () => {
    const s = await db.sales.get(id)
    if (!s || s.status === 'void') return
    await undoLoyalty(id)
    await save<Sale>('sales', { ...s, status: 'void', voidReason: reason.trim(), voidedAt: new Date().toISOString() })
  })
}

export async function cancelReward(r: CustomerReward) {
  await save<CustomerReward>('rewards', { ...r, status: 'cancelled' })
}

export async function markRewardGiven(r: CustomerReward) {
  await save<CustomerReward>('rewards', { ...r, status: 'redeemed', redeemedAt: new Date().toISOString() })
}
