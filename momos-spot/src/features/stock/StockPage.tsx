import { Check, ChevronRight, Flame, History, PackageOpen, Plus, Send, ShoppingBasket } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { resolveRestock } from '../../actions/stock'
import { reopenRestock } from '../../actions/stock'
import { alive, GAS_ITEM_ID } from '../../db'
import type { Purchase, Restock } from '../../db/types'
import { useAll, useToday } from '../../hooks'
import { gasStats } from '../../lib/calc/gas'
import { formatTime, keyOfLocalDate, relativeDay } from '../../lib/dates'
import { nameKey } from '../../lib/ids'
import { inr } from '../../lib/money'
import { shareText } from '../../lib/share'
import { fmtQty } from '../../lib/units'
import { attempt, toast } from '../../ui/feedback'
import { Badge, Button, Card, Chip, ChipRow, Empty, List, Page, Row, Segmented, TextInput } from '../../ui/kit'
import { RangeChips, rangeFor, type Range } from '../../ui/RangePicker'
import { Sheet } from '../../ui/Sheet'
import { SyncDot } from '../../ui/SyncDot'
import type { Cylinder } from '../../db/types'
import { lastedDays, useStock, type StockData } from './data'
import { EditPurchaseSheet } from './EditPurchaseSheet'
import { FinishedSheet } from './FinishedSheet'
import { PurchaseSheet } from './PurchaseSheet'

type Tab = 'list' | 'purchases' | 'items'

export default function StockPage() {
  const data = useStock()
  const cylinders = useAll<Cylinder>('cylinders')
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'purchases'
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })
  const [buy, setBuy] = useState<{ itemId?: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const nav = useNavigate()
  const openList = data ? data.restock.filter((r) => !r.resolvedAt).length : 0
  const gas = cylinders ? gasStats(cylinders) : null

  return (
    <Page title="Stock" actions={<SyncDot />}>
      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" icon={<Plus size={22} />} onClick={() => setBuy({})}>
          Purchase
        </Button>
        <Button size="lg" variant="secondary" icon={<PackageOpen size={22} />} onClick={() => setFinished(true)}>
          Finished
        </Button>
      </div>

      <Card className="mt-3" onClick={() => nav('/gas')}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-ink">
            <Flame size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">Gas cylinders</div>
            <div className="truncate text-sm text-muted">
              {gas?.inUse
                ? `In use for ${Math.floor(gas.currentDays ?? 0)} days${gas.avgLifeDays ? ` · usually lasts ${Math.round(gas.avgLifeDays)}` : ''}`
                : 'No cylinder connected'}
              {gas ? ` · ${gas.spares.length} spare` : ''}
            </div>
          </div>
          {gas?.warnNoSpare && <Badge tone="warn">Buy spare</Badge>}
          <ChevronRight className="text-muted" size={20} />
        </div>
      </Card>

      <Segmented
        className="mt-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'purchases', label: 'Purchases' },
          { value: 'list', label: `To buy${openList ? ` (${openList})` : ''}` },
          { value: 'items', label: 'Items' },
        ]}
      />
      <div className="mt-4">
        {!data ? null : tab === 'purchases' ? (
          <Purchases data={data} />
        ) : tab === 'list' ? (
          <ShoppingList data={data} onBuy={(itemId) => setBuy({ itemId })} onAdd={() => setFinished(true)} />
        ) : (
          <Items data={data} />
        )}
      </div>

      <PurchaseSheet open={!!buy} itemId={buy?.itemId} onClose={() => setBuy(null)} />
      <FinishedSheet open={finished} onClose={() => setFinished(false)} />
    </Page>
  )
}

function Purchases({ data }: { data: StockData }) {
  const today = useToday()
  const [range, setRange] = useState<Range>(() => rangeFor('7d', today))
  const [cat, setCat] = useState<string>('all')
  const [edit, setEdit] = useState<Purchase | null>(null)

  const list = data.purchases.filter(
    (p) => p.day >= range.from && p.day <= range.to && (cat === 'all' || data.itemsById.get(p.itemId)?.categoryId === cat),
  )
  const total = list.reduce((s, p) => s + p.amount, 0)
  const byDay = useMemo(() => {
    const m = new Map<string, Purchase[]>()
    for (const p of list) m.set(p.day, [...(m.get(p.day) ?? []), p])
    return [...m.entries()]
  }, [list])
  const byCat = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of data.purchases.filter((p) => p.day >= range.from && p.day <= range.to)) {
      const c = data.itemsById.get(p.itemId)?.categoryId ?? 'cat-other'
      m.set(c, (m.get(c) ?? 0) + p.amount)
    }
    return m
  }, [data, range])

  return (
    <>
      <RangeChips value={range} onChange={setRange} today={today} />
      <ChipRow>
        <Chip active={cat === 'all'} onClick={() => setCat('all')}>
          All · {inr([...byCat.values()].reduce((a, b) => a + b, 0))}
        </Chip>
        {data.categories
          .filter((c) => byCat.get(c.id))
          .map((c) => (
            <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
              {c.name} · {inr(byCat.get(c.id) ?? 0)}
            </Chip>
          ))}
      </ChipRow>
      {list.length === 0 ? (
        <Empty icon={<ShoppingBasket size={36} />} title="No purchases in these dates">
          Tap <b>Purchase</b> after shopping to log what you bought and the price.
        </Empty>
      ) : (
        <>
          <div className="mb-2 px-1 text-sm text-muted">
            {list.length} purchases · <b className="text-ink">{inr(total)}</b>
          </div>
          {byDay.map(([day, ps]) => (
            <div key={day} className="mb-4">
              <div className="mb-1.5 flex justify-between px-1 text-sm font-semibold">
                <span>{relativeDay(day, today)}</span>
                <span className="tabular">{inr(ps.reduce((s, p) => s + p.amount, 0))}</span>
              </div>
              <List>
                {ps.map((p) => (
                  <Row
                    key={p.id}
                    onClick={() => setEdit(p)}
                    title={data.itemsById.get(p.itemId)?.name ?? 'Item'}
                    sub={`${fmtQty(p.qty, p.unit)} · ${formatTime(p.at)}${p.vendor ? ` · ${p.vendor}` : ''}${p.note ? ` · ${p.note}` : ''}`}
                    right={
                      <div>
                        <div className="tabular font-semibold">{inr(p.amount)}</div>
                        <div className="text-xs text-muted">{p.payMode === 'cash' ? 'Cash' : 'Online'}</div>
                      </div>
                    }
                  />
                ))}
              </List>
            </div>
          ))}
        </>
      )}
      <EditPurchaseSheet purchase={edit} name={edit ? data.itemsById.get(edit.itemId)?.name ?? 'item' : ''} onClose={() => setEdit(null)} />
    </>
  )
}

function ShoppingList({ data, onBuy, onAdd }: { data: StockData; onBuy: (itemId: string) => void; onAdd: () => void }) {
  const open = data.restock.filter((r) => !r.resolvedAt).sort((a, b) => (a.at < b.at ? 1 : -1))
  const [peek, setPeek] = useState<Restock | null>(null)
  const expected = open.reduce((s, r) => s + (data.byItem.get(r.itemId)?.[0]?.amount ?? 0), 0)

  const share = () => {
    const lines = data.categories
      .map((c) => {
        const rows = open.filter((r) => data.itemsById.get(r.itemId)?.categoryId === c.id)
        if (!rows.length) return ''
        return `*${c.name}*\n${rows
          .map((r) => {
            const it = data.itemsById.get(r.itemId)
            const last = data.byItem.get(r.itemId)?.[0]
            return `• ${it?.name}${r.note ? ` (${r.note})` : ''}${last ? ` · last ${inr(last.amount)} for ${fmtQty(last.qty, last.unit)}` : ''}`
          })
          .join('\n')}`
      })
      .filter(Boolean)
      .join('\n\n')
    void shareText(`🛒 Shopping list · The Momos Spot\n\n${lines}`)
  }

  if (open.length === 0)
    return (
      <Empty icon={<Check size={36} />} title="Nothing to buy" action={<Button variant="soft" onClick={onAdd}>Mark an item finished</Button>}>
        When something runs out, tap <b>Finished</b>. It shows up here with its last price.
      </Empty>
    )

  return (
    <>
      <Card className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted">Expected cost (last prices)</div>
            <div className="tabular text-xl font-bold">≈ {inr(expected)}</div>
          </div>
          <Button variant="soft" icon={<Send size={18} />} onClick={share}>
            Share
          </Button>
        </div>
      </Card>
      {data.categories.map((c) => {
        const rows = open.filter((r) => data.itemsById.get(r.itemId)?.categoryId === c.id)
        if (!rows.length) return null
        return (
          <div key={c.id} className="mb-4">
            <div className="mb-1.5 px-1 text-sm font-semibold text-muted">{c.name}</div>
            <List>
              {rows.map((r) => {
                const it = data.itemsById.get(r.itemId)
                const last = data.byItem.get(r.itemId)?.[0]
                return (
                  <div key={r.id} className="flex items-center gap-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{it?.name}</div>
                      <div className="truncate text-sm text-muted">
                        Finished {relativeDay(keyOfLocalDate(new Date(r.at))).toLowerCase()}
                        {r.note ? ` · ${r.note}` : ''}
                      </div>
                      {last && (
                        <button onClick={() => setPeek(r)} className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-soft-ink">
                          <History size={12} /> Last {inr(last.amount)}
                        </button>
                      )}
                    </div>
                    <Button size="sm" variant="soft" onClick={() => onBuy(r.itemId)}>
                      Bought
                    </Button>
                    <button
                      aria-label="Remove from list"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted"
                      onClick={() => attempt(async () => {
                        await resolveRestock(r)
                        toast(`${it?.name} removed`, { undo: () => reopenRestock(r) })
                      })}
                    >
                      <Check size={18} />
                    </button>
                  </div>
                )
              })}
            </List>
          </div>
        )
      })}
      <LastPricePopup data={data} r={peek} onClose={() => setPeek(null)} onBuy={onBuy} />
    </>
  )
}

function LastPricePopup({ data, r, onClose, onBuy }: { data: StockData; r: Restock | null; onClose: () => void; onBuy: (id: string) => void }) {
  if (!r) return null
  const it = data.itemsById.get(r.itemId)
  const hist = data.byItem.get(r.itemId) ?? []
  const lasted = lastedDays(hist, r.at)
  return (
    <Sheet open onClose={onClose} title={it?.name} subtitle="Last prices">
      {hist.slice(0, 5).map((p, i) => (
        <div key={p.id} className={`flex items-center justify-between py-2 ${i ? 'border-t border-line' : ''}`}>
          <div>
            <div className="font-medium">{fmtQty(p.qty, p.unit)} for {inr(p.amount)}</div>
            <div className="text-sm text-muted">
              {relativeDay(p.day)}
              {p.vendor ? ` · ${p.vendor}` : ''}
            </div>
          </div>
          {i === 0 && <Badge tone="brand">Last</Badge>}
        </div>
      ))}
      {lasted !== null && <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm">The last stock lasted about <b>{lasted} day{lasted === 1 ? '' : 's'}</b>.</p>}
      <Button
        block
        className="mt-4"
        onClick={() => {
          onClose()
          onBuy(r.itemId)
        }}
      >
        Log purchase
      </Button>
    </Sheet>
  )
}

function Items({ data }: { data: StockData }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const k = nameKey(q)
  const items = alive(data.items).filter((i) => (showArchived ? i.archived : !i.archived) && (!k || i.nameKey.includes(k) || (i.alias ?? '').toLowerCase().includes(k)))
  return (
    <>
      <TextInput placeholder="Search items" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3" />
      {data.categories.map((c) => {
        const rows = items.filter((i) => i.categoryId === c.id)
        if (!rows.length) return null
        return (
          <div key={c.id} className="mb-4">
            <div className="mb-1.5 px-1 text-sm font-semibold text-muted">{c.name}</div>
            <List>
              {rows.map((i) => {
                const last = data.byItem.get(i.id)?.[0]
                return (
                  <Row
                    key={i.id}
                    onClick={() => nav(i.id === GAS_ITEM_ID ? '/gas' : `/stock/item/${i.id}`)}
                    title={i.name}
                    sub={last ? `${fmtQty(last.qty, last.unit)} for ${inr(last.amount)} · ${relativeDay(last.day)}` : 'Not bought yet'}
                    right={<ChevronRight size={18} className="text-muted" />}
                  />
                )
              })}
            </List>
          </div>
        )
      })}
      {items.length === 0 && <Empty title={showArchived ? 'No archived items' : 'No items yet'}>Items are added the first time you log a purchase.</Empty>}
      <button className="mt-2 w-full py-3 text-sm font-semibold text-muted" onClick={() => setShowArchived(!showArchived)}>
        {showArchived ? 'Show active items' : 'Show archived items'}
      </button>
    </>
  )
}
