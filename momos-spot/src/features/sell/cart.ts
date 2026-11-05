import type { CustomerChoice } from '../../actions/sales'
import type { MenuItem, Sale, SaleLine, Settings, Variant } from '../../db/types'
import { formatDateTime } from '../../lib/dates'
import { inr } from '../../lib/money'

export type PayMode = 'cash' | 'online' | 'split'

export interface CartDraft {
  editingId?: string
  editingBillNo?: string
  lines: SaleLine[]
  isDelivery: boolean
  /** null = use the fee from Settings */
  deliveryFee: number | null
  address: string
  phone: string
  customer: CustomerChoice
  discountMode: 'flat' | 'percent'
  discountValue: number | null
  discountReason: string
  payMode: PayMode
  cashTendered: number | null
  online: number | null
  shortfallAs?: 'credit' | 'discount'
  redeem: string[]
  note: string
}

export const emptyCart = (): CartDraft => ({
  lines: [], isDelivery: false, deliveryFee: null, address: '', phone: '', customer: { mode: 'guest' }, discountMode: 'flat',
  discountValue: null, discountReason: '', payMode: 'cash', cashTendered: null, online: null, redeem: [], note: '',
})

export const lineKey = (menuItemId: string, variantId?: string, price?: number) => `${menuItemId}|${variantId ?? ''}|${price ?? ''}`

export function lineName(item: MenuItem, v?: Variant) {
  return v ? `${item.name} (${v.name})` : item.name
}

export function addToCart(c: CartDraft, item: MenuItem, v?: Variant, qty = 1): CartDraft {
  const price = v ? v.price : item.price
  const key = lineKey(item.id, v?.id)
  const existing = c.lines.find((l) => l.key === key && !l.isReward)
  if (existing) return { ...c, lines: c.lines.map((l) => (l === existing ? { ...l, qty: l.qty + qty } : l)) }
  return { ...c, lines: [...c.lines, { key, menuItemId: item.id, variantId: v?.id, name: lineName(item, v), price, qty }] }
}

export function setQty(c: CartDraft, key: string, qty: number): CartDraft {
  if (qty <= 0) return { ...c, lines: c.lines.filter((l) => l.key !== key) }
  return { ...c, lines: c.lines.map((l) => (l.key === key ? { ...l, qty } : l)) }
}

export function cartCount(c: CartDraft) {
  return c.lines.reduce((s, l) => s + l.qty, 0)
}

export function fromSale(s: Sale): CartDraft {
  const discountReason = s.discountReason ?? ''
  return {
    ...emptyCart(),
    editingId: s.id,
    editingBillNo: s.billNo,
    lines: s.lines.map((l) => ({ ...l })),
    isDelivery: s.isDelivery,
    deliveryFee: s.isDelivery ? s.deliveryFee : null,
    address: s.address ?? '',
    phone: s.phone ?? '',
    customer: s.customerId ? { mode: 'existing', id: s.customerId } : { mode: 'none' },
    discountValue: (s.discountParts ? s.discountParts.manual : s.discount) || null,
    discountReason,
    payMode: s.cash > 0 && s.online > 0 ? 'split' : s.online > 0 && s.cash === 0 ? 'online' : 'cash',
    cashTendered: s.cashTendered || null,
    online: s.online || null,
    shortfallAs: s.credit > 0 ? 'credit' : undefined,
    redeem: s.rewardIds ?? [],
    note: s.note ?? '',
  }
}

export function billText(s: Sale, settings: Settings, customerName?: string) {
  const rows = s.lines.map((l) => `${l.qty} × ${l.name}${l.isReward ? ' 🎁' : ''}  ${inr(l.price * l.qty)}`)
  const paid = [s.cash > 0 && `Cash ${inr(s.cash)}`, s.online > 0 && `Online ${inr(s.online)}`, s.credit > 0 && `Due ${inr(s.credit)}`].filter(Boolean).join(' + ')
  return [
    `*${settings.shopName}*`,
    `Bill #${s.billNo} · ${formatDateTime(s.at)}`,
    customerName ? `Customer: ${customerName}` : '',
    '',
    ...rows,
    '',
    s.deliveryFee ? `Delivery  ${inr(s.deliveryFee)}` : '',
    s.discount ? `Discount  −${inr(s.discount)}` : '',
    `*Total  ${inr(s.total)}*`,
    paid ? `Paid: ${paid}` : '',
    '',
    'Thank you! 🥟',
  ]
    .filter((x, i, a) => x !== '' || (a[i - 1] !== '' && i > 0))
    .join('\n')
}
