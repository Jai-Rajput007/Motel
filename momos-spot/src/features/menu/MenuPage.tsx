import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import { deleteMenuCategory, deleteMenuItem, loadSampleMenu, moveMenuItem, restoreMenuItem, saveMenuCategory, saveMenuItem, setAvailable } from '../../actions/menu'
import type { MenuCategory, MenuItem, Variant } from '../../db/types'
import { uid } from '../../lib/ids'
import { inr } from '../../lib/money'
import { attempt, confirmDialog, promptDialog, toast } from '../../ui/feedback'
import { AmountInput, Badge, Button, Empty, Field, IconButton, Page, SectionTitle, Select, TextInput, Toggle } from '../../ui/kit'
import { Sheet } from '../../ui/Sheet'
import { useMenu } from '../sell/useSellData'

export default function MenuPage() {
  const menu = useMenu()
  const [edit, setEdit] = useState<MenuItem | { categoryId: string } | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  if (!menu) return null
  const archived = menu.all.filter((m) => m.archived)

  const addCategory = async () => {
    const name = await promptDialog({ title: 'New menu category', placeholder: 'e.g. Fried Momos' })
    if (name) await attempt(() => saveMenuCategory({ name }))
  }

  return (
    <Page title="Menu" back actions={<Button size="sm" variant="soft" icon={<Plus size={16} />} onClick={addCategory}>Category</Button>}>
      {menu.categories.length === 0 ? (
        <Empty
          icon={<UtensilsCrossed size={36} />}
          title="No menu yet"
          action={
            <div className="flex flex-col gap-2">
              <Button onClick={addCategory}>Add a category</Button>
              <Button variant="soft" onClick={() => attempt(async () => { await loadSampleMenu(); toast('Sample menu added. Tap any item to change its price.') })}>
                Use a sample momos menu
              </Button>
            </div>
          }
        >
          Start with categories like “Steamed Momos”, then add items with prices.
        </Empty>
      ) : (
        menu.categories.map((c) => <CategoryBlock key={c.id} c={c} items={menu.items.filter((m) => m.categoryId === c.id)} onEdit={setEdit} />)
      )}

      {archived.length > 0 && (
        <>
          <button className="mt-6 flex w-full items-center justify-center gap-1 py-2 text-sm font-semibold text-muted" onClick={() => setShowArchived(!showArchived)}>
            Archived items ({archived.length}) {showArchived ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showArchived && (
            <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
              {archived.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex-1 text-muted">{m.name}</span>
                  <Button size="sm" variant="soft" onClick={() => attempt(() => restoreMenuItem(m))}>
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {edit && <ItemSheet item={'id' in edit ? edit : null} categoryId={edit.categoryId} categories={menu.categories} onClose={() => setEdit(null)} />}
    </Page>
  )
}

function CategoryBlock({ c, items, onEdit }: { c: MenuCategory; items: MenuItem[]; onEdit: (m: MenuItem | { categoryId: string }) => void }) {
  return (
    <>
      <SectionTitle
        action={
          <div className="flex items-center gap-1">
            <IconButton
              label="Rename category"
              onClick={async () => {
                const name = await promptDialog({ title: 'Rename category', initial: c.name })
                if (name) await attempt(() => saveMenuCategory({ ...c, name }))
              }}
            >
              <Pencil size={16} />
            </IconButton>
            <IconButton
              label="Delete category"
              onClick={async () => {
                if (await confirmDialog({ title: `Delete “${c.name}”?`, ok: 'Delete', danger: true })) await attempt(() => deleteMenuCategory(c.id))
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </div>
        }
      >
        {c.name}
      </SectionTitle>
      <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
        {items.map((m, i) => (
          <div key={m.id} className="flex items-center gap-2 py-2 pl-4 pr-2">
            <button className="min-w-0 flex-1 text-left" onClick={() => onEdit(m)}>
              <div className="flex items-center gap-2 truncate font-medium">
                {m.name} {!m.available && <Badge tone="bad">Sold out</Badge>}
              </div>
              <div className="tabular truncate text-sm text-muted">{m.variants.length ? m.variants.map((v) => `${v.name} ${inr(v.price)}`).join(' · ') : inr(m.price)}</div>
            </button>
            <div className="flex flex-col">
              <button aria-label="Move up" disabled={i === 0} className="p-1 text-muted disabled:opacity-20" onClick={() => attempt(() => moveMenuItem(m, -1))}>
                <ArrowUp size={16} />
              </button>
              <button aria-label="Move down" disabled={i === items.length - 1} className="p-1 text-muted disabled:opacity-20" onClick={() => attempt(() => moveMenuItem(m, 1))}>
                <ArrowDown size={16} />
              </button>
            </div>
          </div>
        ))}
        <button className="flex w-full items-center gap-2 px-4 py-3 text-left font-semibold text-brand active:bg-surface-2" onClick={() => onEdit({ categoryId: c.id })}>
          <Plus size={18} /> Add item
        </button>
      </div>
    </>
  )
}

function ItemSheet({ item, categoryId, categories, onClose }: { item: MenuItem | null; categoryId: string; categories: MenuCategory[]; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [cat, setCat] = useState(item?.categoryId ?? categoryId)
  const [price, setPrice] = useState<number | null>(item && !item.variants.length ? item.price : null)
  const [variants, setVariants] = useState<Variant[]>(item?.variants ?? [])
  const [available, setAvail] = useState(item?.available ?? true)
  const [advanced, setAdvanced] = useState(!!item?.variants.length)

  const setV = (id: string, p: Partial<Variant>) => setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, ...p } : v)))

  return (
    <Sheet
      open
      onClose={onClose}
      tall
      title={item ? 'Edit menu item' : 'Add menu item'}
      footer={
        <div className="flex gap-2">
          {item && (
            <Button
              variant="secondary"
              className="text-bad"
              onClick={async () => {
                if (!(await confirmDialog({ title: `Remove ${item.name}?`, body: 'If it was ever sold, it is archived so old bills and reports stay correct.', ok: 'Remove', danger: true }))) return
                await attempt(async () => {
                  const r = await deleteMenuItem(item)
                  toast(r === 'archived' ? 'Archived (it has sales history)' : 'Deleted')
                  onClose()
                })
              }}
            >
              Remove
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={async () => {
              const ok = await attempt(async () => {
                await saveMenuItem({ id: item?.id, name, categoryId: cat, price: price ?? 0, variants: advanced ? variants : [], available })
              })
              if (ok) {
                toast(item ? 'Saved. New price applies to new bills only.' : `${name.trim()} added`)
                onClose()
              }
            }}
          >
            Save
          </Button>
        </div>
      }
    >
      <Field label="Name">
        <TextInput autoFocus={!item} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Veg Steamed Momos" />
      </Field>
      <Field label="Category">
        <Select value={cat} onChange={setCat} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
      </Field>
      {!(advanced && variants.length) && (
        <Field label="Price">
          <AmountInput value={price} onChange={setPrice} big />
        </Field>
      )}
      <Toggle checked={available} onChange={setAvail}  label="Available now" sub="Turn off when it is sold out. It stays on the menu, greyed out, until you turn it back on." />

      <div className="mt-2 rounded-2xl border border-line">
        <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-semibold" onClick={() => setAdvanced(!advanced)}>
          Advanced: sizes (Half / Full, 5 pcs / 10 pcs…)
          {advanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {advanced && (
          <div className="border-t border-line p-3">
            <p className="mb-3 text-xs text-muted">With sizes, you choose the size when billing. Each size has its own price.</p>
            {variants.map((v) => (
              <div key={v.id} className="mb-2 flex items-center gap-2">
                <TextInput className="flex-1" value={v.name} onChange={(e) => setV(v.id, { name: e.target.value })} placeholder="Size name" />
                <AmountInput className="w-28" value={v.price || null} onChange={(p) => setV(v.id, { price: p ?? 0 })} />
                <IconButton label="Remove size" onClick={() => setVariants((vs) => vs.filter((x) => x.id !== v.id))}>
                  <Trash2 size={16} />
                </IconButton>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="soft" onClick={() => setVariants((vs) => [...vs, { id: uid(), name: '', price: 0 }])}>
                + Add size
              </Button>
              {variants.length === 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setVariants([
                      { id: uid(), name: 'Half', price: price ?? 0 },
                      { id: uid(), name: 'Full', price: price ? price * 2 - 1000 : 0 },
                    ])
                  }
                >
                  Quick: Half + Full
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      {item && <Button variant="ghost" block className="mt-3" onClick={() => attempt(() => setAvailable(item, !item.available))}>{item.available ? 'Mark sold out now' : 'Mark available now'}</Button>}
    </Sheet>
  )
}
