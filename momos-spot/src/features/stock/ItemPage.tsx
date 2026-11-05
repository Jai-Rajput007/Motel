import { Archive, GitMerge, PackageOpen, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { mergeItems, updateItem } from '../../actions/stock'
import { UNITS, type Item, type Purchase, type StockCategory, type Unit } from '../../db/types'
import { formatDay, relativeDay } from '../../lib/dates'
import { inr, inrShort } from '../../lib/money'
import { fmtQty, UNIT_LABEL, unitPrice } from '../../lib/units'
import { attempt, confirmDialog, toast } from '../../ui/feedback'
import { Button, Card, Chip, Empty, Field, List, Page, Row, SectionTitle, Select, Stat, TextInput } from '../../ui/kit'
import { Sheet } from '../../ui/Sheet'
import { itemStats, useStock } from './data'
import { EditPurchaseSheet } from './EditPurchaseSheet'
import { FinishedSheet } from './FinishedSheet'
import { PurchaseSheet } from './PurchaseSheet'

export default function ItemPage() {
  const { id = '' } = useParams()
  const data = useStock()
  const nav = useNavigate()
  const [buy, setBuy] = useState(false)
  const [fin, setFin] = useState(false)
  const [editing, setEditing] = useState(false)
  const [merging, setMerging] = useState(false)
  const [edit, setEdit] = useState<Purchase | null>(null)
  if (!data) return null
  const item = data.itemsById.get(id)
  if (!item || item.deletedAt)
    return (
      <Page title="Item" back="/stock?tab=items">
        <Empty title="This item was removed or merged" />
      </Page>
    )
  const hist = data.byItem.get(id) ?? []
  const st = itemStats(hist)
  const chart = hist
    .map((p) => ({ p, u: unitPrice(p.amount, p.qty, p.unit) }))
    .filter((x) => x.u && x.u.unit === st.baseUnit)
    .slice(0, 20)
    .reverse()
    .map((x) => ({ day: formatDay(x.p.day), price: Math.round(x.u!.price) / 100 }))
  const cat = data.catById.get(item.categoryId)

  return (
    <Page title={item.name} back actions={<Button size="sm" variant="ghost" icon={<Pencil size={16} />} onClick={() => setEditing(true)}>Edit</Button>}>
      <div className="-mt-1 mb-3 text-sm text-muted">
        {cat?.name}
        {item.alias ? ` · also “${item.alias}”` : ''}
        {item.archived ? ' · archived' : ''}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button icon={<Plus size={18} />} onClick={() => setBuy(true)}>
          Log purchase
        </Button>
        <Button variant="secondary" icon={<PackageOpen size={18} />} onClick={() => setFin(true)}>
          Finished
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat label="Last bought" value={st.last ? inr(st.last.amount) : '—'} sub={st.last ? `${fmtQty(st.last.qty, st.last.unit)} · ${relativeDay(st.last.day)}` : undefined} />
        <Stat label={`Average per ${st.baseUnit ?? 'unit'}`} value={st.avgUnit !== null ? inr(Math.round(st.avgUnit)) : '—'} sub="last 10 purchases" />
        <Stat label="Cheapest / costliest" value={st.minUnit !== null ? `${inr(Math.round(st.minUnit))} – ${inr(Math.round(st.maxUnit!))}` : '—'} sub={st.baseUnit ? `per ${st.baseUnit}` : undefined} />
        <Stat label="Spent this month" value={inr(st.spentMonth)} sub={`${st.count} purchases in total`} />
      </div>

      {chart.length >= 2 && (
        <>
          <SectionTitle>Price per {st.baseUnit}</SectionTitle>
          <Card>
            <div className="h-44">
              <ResponsiveContainer>
                <LineChart data={chart} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `₹${v}`} width={52} />
                  <Tooltip formatter={(v) => [`₹${v}`, 'Price']} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }} />
                  <Line type="monotone" dataKey="price" stroke="var(--brand)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      <SectionTitle>History</SectionTitle>
      {hist.length === 0 ? (
        <Empty title="Not bought yet" />
      ) : (
        <List>
          {hist.slice(0, 100).map((p) => {
            const u = unitPrice(p.amount, p.qty, p.unit)
            return (
              <Row
                key={p.id}
                onClick={() => setEdit(p)}
                title={`${fmtQty(p.qty, p.unit)} for ${inr(p.amount)}`}
                sub={`${formatDay(p.day, { weekday: true })}${p.vendor ? ` · ${p.vendor}` : ''}`}
                right={u && <span className="text-sm text-muted">{inrShort(u.price)}/{u.unit}</span>}
              />
            )
          })}
        </List>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="secondary" icon={<GitMerge size={18} />} onClick={() => setMerging(true)}>
          Merge
        </Button>
        <Button
          variant="secondary"
          icon={<Archive size={18} />}
          onClick={() =>
            attempt(async () => {
              await updateItem(item, { archived: !item.archived })
              toast(item.archived ? 'Item restored' : 'Item archived. History is kept.')
            })
          }
        >
          {item.archived ? 'Restore' : 'Archive'}
        </Button>
      </div>

      <PurchaseSheet open={buy} itemId={id} onClose={() => setBuy(false)} />
      <FinishedSheet open={fin} itemId={id} onClose={() => setFin(false)} />
      <EditPurchaseSheet purchase={edit} name={item.name} onClose={() => setEdit(null)} />
      {editing && <EditItemSheet onClose={() => setEditing(false)} item={item} categories={data.categories} />}
      <Sheet open={merging} onClose={() => setMerging(false)} title={`Merge “${item.name}” into…`} subtitle="Use this when the same thing was added twice. All purchases move to the item you pick.">
        <div className="flex flex-wrap gap-2">
          {data.items
            .filter((i) => i.id !== item.id && !i.archived)
            .map((i) => (
              <Chip
                key={i.id}
                onClick={async () => {
                  if (!(await confirmDialog({ title: `Merge into “${i.name}”?`, body: `All ${hist.length} purchases of “${item.name}” will move to “${i.name}”.`, ok: 'Merge' }))) return
                  const ok = await attempt(() => mergeItems(item.id, i.id))
                  if (ok) {
                    toast('Items merged')
                    nav(`/stock/item/${i.id}`, { replace: true })
                  }
                }}
              >
                {i.name}
              </Chip>
            ))}
        </div>
      </Sheet>
    </Page>
  )
}

function EditItemSheet({ item, categories, onClose }: { item: Item; categories: StockCategory[]; onClose: () => void }) {
  const [name, setName] = useState(item.name)
  const [alias, setAlias] = useState(item.alias ?? '')
  const [cat, setCat] = useState(item.categoryId)
  const [unit, setUnit] = useState<Unit>(item.unit)
  return (
    <Sheet
      open
      onClose={onClose}
      title="Edit item"
      footer={
        <Button
          block
          onClick={async () => {
            const ok = await attempt(() => updateItem(item, { name, alias, categoryId: cat, unit }))
            if (ok) {
              toast('Saved')
              onClose()
            }
          }}
        >
          Save
        </Button>
      }
    >
      <Field label="Name">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Other name (optional)" hint="Search finds this too, e.g. Pyaz for Onion">
        <TextInput value={alias} onChange={(e) => setAlias(e.target.value)} />
      </Field>
      <Field label="Category">
        <Select value={cat} onChange={setCat} options={categories.filter((c) => c.kind !== 'gas').map((c) => ({ value: c.id, label: c.name }))} />
      </Field>
      <Field label="Usual unit">
        <Select value={unit} onChange={setUnit} options={UNITS.filter((u) => u !== 'cylinder').map((u) => ({ value: u, label: UNIT_LABEL[u] }))} />
      </Field>
    </Sheet>
  )
}
