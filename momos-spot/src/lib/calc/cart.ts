import type { SaleLine } from '../../db/types'

export function linesSubtotal(lines: SaleLine[]): number {
  return lines.reduce((s, l) => s + l.price * l.qty, 0)
}

export interface Totals {
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
}

export function computeTotals(o: {
  lines: SaleLine[]
  isDelivery: boolean
  deliveryFee: number
  freeDeliveryAbove?: number
  discount: number
}): Totals {
  const subtotal = linesSubtotal(o.lines)
  let deliveryFee = 0
  if (o.isDelivery) deliveryFee = o.freeDeliveryAbove && subtotal >= o.freeDeliveryAbove ? 0 : Math.max(0, o.deliveryFee)
  const discount = Math.min(Math.max(0, o.discount), subtotal + deliveryFee)
  return { subtotal, deliveryFee, discount, total: subtotal + deliveryFee - discount }
}

export interface PaymentResult {
  cash: number
  change: number
  online: number
  shortfall: number
  error?: string
}

/** Work out change and any unpaid part from what the customer handed over. */
export function settle(total: number, cashTendered: number, online: number): PaymentResult {
  const c = Math.max(0, cashTendered)
  const o = Math.max(0, online)
  if (o > total) return { cash: 0, change: 0, online: o, shortfall: 0, error: 'Online amount is more than the bill.' }
  const remaining = total - o
  if (c >= remaining) return { cash: remaining, change: c - remaining, online: o, shortfall: 0 }
  return { cash: c, change: 0, online: o, shortfall: remaining - c }
}
