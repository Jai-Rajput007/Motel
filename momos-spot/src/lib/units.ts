import type { Unit } from '../db/types'

/** Convert to a base unit so prices can be compared (g→kg, ml→litre, dozen→piece). */
export function toBase(qty: number, unit: Unit): { qty: number; unit: Unit } {
  switch (unit) {
    case 'g':
      return { qty: qty / 1000, unit: 'kg' }
    case 'ml':
      return { qty: qty / 1000, unit: 'litre' }
    case 'dozen':
      return { qty: qty * 12, unit: 'piece' }
    default:
      return { qty, unit }
  }
}

/** Price per base unit in paise, or null when it cannot be compared. */
export function unitPrice(amount: number, qty: number, unit: Unit): { price: number; unit: Unit } | null {
  const b = toBase(qty, unit)
  if (!(b.qty > 0)) return null
  return { price: amount / b.qty, unit: b.unit }
}

export function fmtQty(qty: number, unit: Unit): string {
  const q = Number.isInteger(qty) ? String(qty) : qty.toFixed(qty < 1 ? 3 : 2).replace(/0+$/, '').replace(/\.$/, '')
  const plural = qty !== 1 && ['piece', 'packet', 'box', 'bundle', 'cylinder', 'bottle', 'tray'].includes(unit) ? 's' : ''
  const u = unit === 'box' && plural ? 'boxe' : unit
  return `${q} ${u}${plural}`
}

export const UNIT_LABEL: Record<Unit, string> = {
  kg: 'kg', g: 'gram', litre: 'litre', ml: 'ml', piece: 'piece', packet: 'packet', dozen: 'dozen', box: 'box', bundle: 'bundle',
  cylinder: 'cylinder', bottle: 'bottle', tray: 'tray',
}
