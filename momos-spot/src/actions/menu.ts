import { alive, db } from '../db'
import type { MenuCategory, MenuItem, Variant } from '../db/types'
import { remove, save } from '../db/write'
import { tidyName, uid } from '../lib/ids'
import { UserError } from './common'

export async function saveMenuCategory(c: Partial<MenuCategory> & { name: string }) {
  const name = tidyName(c.name)
  if (!name) throw new UserError('Enter a category name.')
  const all = alive(await db.menuCategories.toArray())
  const [row] = await save<MenuCategory>('menuCategories', { id: c.id ?? uid(), name, sort: c.sort ?? all.length + 1 } as MenuCategory)
  return row
}

export async function deleteMenuCategory(id: string) {
  const items = alive(await db.menuItems.where('categoryId').equals(id).toArray()).filter((i) => !i.archived)
  if (items.length) throw new UserError('Move or archive the items in this category first.')
  await remove('menuCategories', id)
}

export interface MenuItemInput {
  id?: string
  name: string
  categoryId: string
  price: number
  variants: Variant[]
  available?: boolean
  sort?: number
}

export async function saveMenuItem(o: MenuItemInput) {
  const name = tidyName(o.name)
  if (!name) throw new UserError('Enter the item name.')
  if (!o.categoryId) throw new UserError('Choose a category.')
  const variants = o.variants.map((v) => ({ ...v, name: tidyName(v.name) })).filter((v) => v.name)
  if (variants.some((v) => !(v.price >= 0))) throw new UserError('Every size needs a price.')
  const names = variants.map((v) => v.name.toLowerCase())
  if (new Set(names).size !== names.length) throw new UserError('Two sizes have the same name.')
  if (!variants.length && !(o.price > 0)) throw new UserError('Enter the price.')
  const existing = o.id ? await db.menuItems.get(o.id) : undefined
  const all = alive(await db.menuItems.toArray())
  const clash = all.find((m) => !m.archived && m.id !== o.id && m.name.toLowerCase() === name.toLowerCase())
  if (clash) throw new UserError(`"${clash.name}" is already on the menu.`)
  const [row] = await save<MenuItem>('menuItems', {
    ...(existing ?? {}),
    id: o.id ?? uid(), name, categoryId: o.categoryId, price: variants.length ? variants[0].price : o.price, variants,
    available: o.available ?? existing?.available ?? true, archived: existing?.archived, sort: o.sort ?? existing?.sort ?? all.length + 1,
  } as MenuItem)
  return row
}

/** Add a new size to an item while selling. */
export async function addVariant(item: MenuItem, name: string, price: number): Promise<Variant> {
  const n = tidyName(name)
  if (!n) throw new UserError('Enter the size name.')
  if (!(price > 0)) throw new UserError('Enter the price.')
  if (item.variants.some((v) => v.name.toLowerCase() === n.toLowerCase())) throw new UserError('That size already exists.')
  const v: Variant = { id: uid(), name: n, price }
  // An item with no sizes yet keeps its normal price as a "Regular" size.
  const variants = item.variants.length ? [...item.variants, v] : [{ id: uid(), name: 'Regular', price: item.price }, v]
  await save<MenuItem>('menuItems', { ...item, variants })
  return v
}

export async function setAvailable(item: MenuItem, available: boolean) {
  await save<MenuItem>('menuItems', { ...item, available })
}

async function everSold(id: string): Promise<boolean> {
  let found = false
  await db.sales.each((s) => {
    if (!found && s.lines.some((l) => l.menuItemId === id)) found = true
  })
  return found
}

/** Items that were sold are archived (kept for reports); never-sold items are deleted. */
export async function deleteMenuItem(item: MenuItem): Promise<'archived' | 'deleted'> {
  if (await everSold(item.id)) {
    await save<MenuItem>('menuItems', { ...item, archived: true })
    return 'archived'
  }
  await remove('menuItems', item.id)
  return 'deleted'
}

export async function restoreMenuItem(item: MenuItem) {
  await save<MenuItem>('menuItems', { ...item, archived: false })
}

export async function moveMenuItem(item: MenuItem, dir: -1 | 1) {
  const list = alive(await db.menuItems.where('categoryId').equals(item.categoryId).toArray()).filter((m) => !m.archived).sort((a, b) => a.sort - b.sort)
  const i = list.findIndex((m) => m.id === item.id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return
  const a = list[i]
  const b = list[j]
  await save<MenuItem>('menuItems', [{ ...a, sort: b.sort === a.sort ? b.sort + dir : b.sort }, { ...b, sort: a.sort }])
}

const v = (name: string, rupees: number): Variant => ({ id: uid(), name, price: rupees * 100 })

/** A starter momos menu the owner can edit. */
export async function loadSampleMenu() {
  const cats: [string, [string, Variant[] | number][]][] = [
    ['Steamed Momos', [['Veg Steamed', [v('Half (5 pcs)', 50), v('Full (10 pcs)', 90)]], ['Paneer Steamed', [v('Half (5 pcs)', 70), v('Full (10 pcs)', 130)]], ['Chicken Steamed', [v('Half (5 pcs)', 70), v('Full (10 pcs)', 130)]]]],
    ['Fried Momos', [['Veg Fried', [v('Half (5 pcs)', 60), v('Full (10 pcs)', 110)]], ['Chicken Fried', [v('Half (5 pcs)', 80), v('Full (10 pcs)', 150)]]]],
    ['Special Momos', [['Kurkure Momos', [v('Half (5 pcs)', 80), v('Full (10 pcs)', 150)]], ['Tandoori Momos', [v('Half (5 pcs)', 90), v('Full (10 pcs)', 170)]], ['Gravy / Jhol Momos', [v('Half (5 pcs)', 80), v('Full (10 pcs)', 150)]]]],
    ['Soups & Sides', [['Veg Thukpa', 90], ['Chicken Thukpa', 120], ['Extra Chutney', 10]]],
    ['Drinks', [['Cold Drink', 20], ['Water Bottle', 20]]],
  ]
  let ci = 0
  for (const [cname, items] of cats) {
    const cat = await saveMenuCategory({ name: cname, sort: ++ci })
    let si = 0
    for (const [name, p] of items) {
      await saveMenuItem({ name, categoryId: cat.id, price: typeof p === 'number' ? p * 100 : 0, variants: typeof p === 'number' ? [] : p, sort: ++si })
    }
  }
}
