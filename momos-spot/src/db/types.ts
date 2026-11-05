/** Every synced record has these fields. Money is integer paise. Times are ISO strings. Days are 'YYYY-MM-DD'. */
export interface Base {
  id: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type PayMode = 'cash' | 'online'

/* ---------------- Stock ---------------- */

export type StockKind = 'vegetable' | 'packaged' | 'gas' | 'other'

export interface StockCategory extends Base {
  name: string
  kind: StockKind
  sort: number
}

export const UNITS = ['kg', 'g', 'litre', 'ml', 'piece', 'packet', 'dozen', 'box', 'bundle', 'cylinder', 'bottle', 'tray'] as const
export type Unit = (typeof UNITS)[number]

export interface Item extends Base {
  name: string
  nameKey: string
  alias?: string
  categoryId: string
  unit: Unit
  archived?: boolean
  mergedIntoId?: string
}

export interface Trip extends Base {
  at: string
  day: string
  vendor?: string
  declaredTotal?: number
  note?: string
}

export interface Purchase extends Base {
  itemId: string
  tripId?: string
  qty: number
  unit: Unit
  amount: number
  at: string
  day: string
  payMode: PayMode
  vendor?: string
  note?: string
}

export interface Restock extends Base {
  itemId: string
  at: string
  note?: string
  resolvedAt?: string
  resolvedPurchaseId?: string
}

export type CylinderStatus = 'in_stock' | 'in_use' | 'empty'

export interface Cylinder extends Base {
  purchaseId?: string
  price: number
  boughtAt: string
  connectedAt?: string
  emptiedAt?: string
  status: CylinderStatus
  supplier?: string
  note?: string
}

/* ---------------- Menu & sales ---------------- */

export interface MenuCategory extends Base {
  name: string
  sort: number
}

export interface Variant {
  id: string
  name: string
  price: number
}

export interface MenuItem extends Base {
  name: string
  categoryId: string
  price: number
  variants: Variant[]
  available: boolean
  archived?: boolean
  sort: number
}

export interface Customer extends Base {
  name: string
  nameKey: string
  phone?: string
  isGuest: boolean
  guestCode?: string
  mergedIntoId?: string
  note?: string
}

export interface SaleLine {
  key: string
  menuItemId?: string
  variantId?: string
  name: string
  /** price per unit actually charged */
  price: number
  /** menu price at sale time, when the price was changed by hand */
  listPrice?: number
  qty: number
  isReward?: boolean
}

export type SaleStatus = 'done' | 'void'

export interface Sale extends Base {
  billNo: string
  day: string
  at: string
  customerId?: string
  isDelivery: boolean
  address?: string
  phone?: string
  lines: SaleLine[]
  subtotal: number
  deliveryFee: number
  discount: number
  /** how the discount is made up, so an edit can show it correctly */
  discountParts?: { manual: number; reward: number; short: number }
  discountReason?: string
  total: number
  /** cash kept (tendered − change) */
  cash: number
  cashTendered: number
  change: number
  online: number
  /** unpaid part added to the customer's credit (udhaar) */
  credit: number
  status: SaleStatus
  voidReason?: string
  voidedAt?: string
  rewardIds?: string[]
  note?: string
}

export interface CreditPayment extends Base {
  customerId: string
  amount: number
  cash: number
  online: number
  at: string
  day: string
  note?: string
}

/* ---------------- Loyalty & offers ---------------- */

export type TriggerType = 'every_n' | 'n_in_days' | 'streak' | 'spend'
export type RewardType = 'free_item' | 'percent' | 'flat' | 'text'

export interface LoyaltyRule extends Base {
  name: string
  trigger: TriggerType
  /** orders (every_n, n_in_days) or days (streak) */
  n: number
  /** window for n_in_days */
  days?: number
  /** spend target for 'spend' */
  spend?: number
  /** only bills of at least this amount count */
  minBill?: number
  rewardType: RewardType
  rewardMenuItemId?: string
  rewardVariantId?: string
  rewardQty?: number
  /** percent (1–100) or flat paise */
  rewardValue?: number
  rewardText?: string
  repeat: boolean
  expiryDays?: number
  active: boolean
  startsOn?: string
  endsOn?: string
  note?: string
}

export type RewardStatus = 'waiting' | 'redeemed' | 'cancelled'

export interface CustomerReward extends Base {
  customerId: string
  ruleId: string
  ruleName: string
  rewardLabel: string
  unlockedBySaleId: string
  unlockedAt: string
  status: RewardStatus
  redeemedSaleId?: string
  redeemedAt?: string
  expiresAt?: string
}

export interface OfferNote extends Base {
  title: string
  details?: string
  startsOn?: string
  endsOn?: string
  showOnSell: boolean
}

/* ---------------- Money ---------------- */

export interface ExpenseCategory extends Base {
  name: string
  sort: number
}

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'every_n_days'

export interface AmountChange {
  from: string
  amount: number
}

export interface Recurring extends Base {
  name: string
  categoryId: string
  frequency: Frequency
  intervalN?: number
  /** monthly: day of month 1–31 (default: start date's day) */
  dueDay?: number
  startsOn: string
  endsOn?: string
  installments?: number
  amounts: AmountChange[]
  autoPaid: boolean
  payMode: PayMode
  /** paused periods; due dates inside them are skipped */
  pauses?: { from: string; to?: string }[]
  note?: string
}

export interface Expense extends Base {
  name: string
  categoryId: string
  amount: number
  at: string
  day: string
  payMode: PayMode
  remarks?: string
  recurringId?: string
  /** the due date (occurrence) of the recurring cost this pays */
  dueDate?: string
}

export interface CashSession extends Base {
  /** id = day key */
  day: string
  opening: number
  counted?: number
  closedAt?: string
  note?: string
}

/* ---------------- Settings ---------------- */

export interface Settings extends Base {
  shopName: string
  upiId?: string
  upiName?: string
  deliveryFee: number
  freeDeliveryAbove?: number
  dayCutoffHour: number
  cashChips: number[]
  theme: 'system' | 'light' | 'dark'
  pin?: string
  backupReminderDays: number
  onboarded?: boolean
}

export interface OutboxEntry {
  seq?: number
  table: string
  rowId: string
  at: string
}

export interface MetaRow {
  key: string
  value: unknown
}
