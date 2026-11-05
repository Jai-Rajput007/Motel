import Dexie, { type Table } from 'dexie'
import type {
  CashSession, CreditPayment, Customer, CustomerReward, Cylinder, Expense, ExpenseCategory, Item, LoyaltyRule,
  MenuCategory, MenuItem, MetaRow, OfferNote, OutboxEntry, Purchase, Recurring, Restock, Sale, Settings,
  StockCategory, Trip,
} from './types'

export class MomosDB extends Dexie {
  stockCategories!: Table<StockCategory, string>
  items!: Table<Item, string>
  trips!: Table<Trip, string>
  purchases!: Table<Purchase, string>
  restock!: Table<Restock, string>
  cylinders!: Table<Cylinder, string>
  menuCategories!: Table<MenuCategory, string>
  menuItems!: Table<MenuItem, string>
  customers!: Table<Customer, string>
  sales!: Table<Sale, string>
  creditPayments!: Table<CreditPayment, string>
  loyaltyRules!: Table<LoyaltyRule, string>
  rewards!: Table<CustomerReward, string>
  offerNotes!: Table<OfferNote, string>
  expenseCategories!: Table<ExpenseCategory, string>
  recurring!: Table<Recurring, string>
  expenses!: Table<Expense, string>
  cashSessions!: Table<CashSession, string>
  settings!: Table<Settings, string>
  outbox!: Table<OutboxEntry, number>
  meta!: Table<MetaRow, string>

  constructor(name = 'momos-spot') {
    super(name)
    this.version(1).stores({
      stockCategories: 'id',
      items: 'id, nameKey, categoryId',
      trips: 'id, day',
      purchases: 'id, itemId, day, tripId, at',
      restock: 'id, itemId',
      cylinders: 'id, status, boughtAt',
      menuCategories: 'id',
      menuItems: 'id, categoryId',
      customers: 'id, nameKey, guestCode',
      sales: 'id, day, at, customerId',
      creditPayments: 'id, customerId, day',
      loyaltyRules: 'id',
      rewards: 'id, customerId, status, unlockedBySaleId, redeemedSaleId',
      offerNotes: 'id',
      expenseCategories: 'id',
      recurring: 'id',
      expenses: 'id, day, recurringId',
      cashSessions: 'id, day',
      settings: 'id',
      outbox: '++seq, [table+rowId]',
      meta: 'key',
    })
  }
}

export const db = new MomosDB()

/** Tables that are synced to the cloud and included in backups. */
export const SYNC_TABLES = [
  'stockCategories', 'items', 'trips', 'purchases', 'restock', 'cylinders', 'menuCategories', 'menuItems',
  'customers', 'sales', 'creditPayments', 'loyaltyRules', 'rewards', 'offerNotes', 'expenseCategories',
  'recurring', 'expenses', 'cashSessions', 'settings',
] as const
export type SyncTable = (typeof SYNC_TABLES)[number]

/** Seed rows use a 1970 timestamp so any real (cloud or edited) version always wins. */
export const SEED_TIME = '1970-01-01T00:00:00.000Z'
export const GAS_ITEM_ID = 'item-gas'
export const GAS_CATEGORY_ID = 'cat-gas'
export const SETTINGS_ID = 'main'

const seed = <T extends object>(rows: T[]) =>
  rows.map((r) => ({ ...r, createdAt: SEED_TIME, updatedAt: SEED_TIME }))

export const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  createdAt: SEED_TIME,
  updatedAt: SEED_TIME,
  shopName: 'The Momos Spot',
  deliveryFee: 2000,
  dayCutoffHour: 0,
  cashChips: [5000, 10000, 20000, 50000],
  theme: 'system',
  backupReminderDays: 7,
}

/** Adds default categories, the Gas item and settings, without overwriting anything that already exists. */
export async function ensureSeed(d: MomosDB = db) {
  await d.transaction('rw', [d.stockCategories, d.items, d.expenseCategories, d.settings], async () => {
    const stock = seed<Omit<StockCategory, 'createdAt' | 'updatedAt'>>([
      { id: 'cat-veg', name: 'Vegetables', kind: 'vegetable', sort: 1 },
      { id: 'cat-meat', name: 'Meat, Paneer & Dairy', kind: 'other', sort: 2 },
      { id: 'cat-packaged', name: 'Packaged & Grocery', kind: 'packaged', sort: 3 },
      { id: 'cat-packing', name: 'Packing material', kind: 'packaged', sort: 4 },
      { id: GAS_CATEGORY_ID, name: 'Gas', kind: 'gas', sort: 5 },
      { id: 'cat-other', name: 'Other', kind: 'other', sort: 6 },
    ])
    for (const c of stock) if (!(await d.stockCategories.get(c.id))) await d.stockCategories.put(c as StockCategory)

    if (!(await d.items.get(GAS_ITEM_ID))) {
      await d.items.put({
        id: GAS_ITEM_ID, name: 'Gas cylinder', nameKey: 'gas cylinder', categoryId: GAS_CATEGORY_ID, unit: 'cylinder',
        createdAt: SEED_TIME, updatedAt: SEED_TIME,
      })
    }

    const exp = seed<Omit<ExpenseCategory, 'createdAt' | 'updatedAt'>>([
      { id: 'exp-rent', name: 'Rent', sort: 1 },
      { id: 'exp-emi', name: 'EMI / Loan', sort: 2 },
      { id: 'exp-salary', name: 'Salary & Wages', sort: 3 },
      { id: 'exp-electricity', name: 'Electricity', sort: 4 },
      { id: 'exp-water', name: 'Water', sort: 5 },
      { id: 'exp-phone', name: 'Phone & Internet', sort: 6 },
      { id: 'exp-repairs', name: 'Repairs & Maintenance', sort: 7 },
      { id: 'exp-equipment', name: 'Equipment', sort: 8 },
      { id: 'exp-transport', name: 'Transport', sort: 9 },
      { id: 'exp-staff-food', name: 'Staff food', sort: 10 },
      { id: 'exp-other', name: 'Other', sort: 11 },
    ])
    for (const c of exp) if (!(await d.expenseCategories.get(c.id))) await d.expenseCategories.put(c as ExpenseCategory)

    if (!(await d.settings.get(SETTINGS_ID))) await d.settings.put(DEFAULT_SETTINGS)
  })
}

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const r = await db.meta.get(key)
  return r === undefined ? fallback : (r.value as T)
}

export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value })
}

export const alive = <T extends { deletedAt?: string | null }>(rows: T[]) => rows.filter((r) => !r.deletedAt)
