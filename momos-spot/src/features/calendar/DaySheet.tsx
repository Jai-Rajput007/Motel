import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { alive, db, GAS_ITEM_ID } from '../../db'
import type { Customer, Sale } from '../../db/types'
import { useSettings } from '../../hooks'
import { profitOf } from '../../lib/calc/summary'
import { formatDay, formatTime } from '../../lib/dates'
import { inr } from '../../lib/money'
import { fmtQty } from '../../lib/units'
import { Button } from '../../ui/kit'
import { Sheet } from '../../ui/Sheet'
import { ExpenseSheet } from '../money/ExpenseSheet'
import { SaleSheet } from '../sell/SaleSheet'
import { PurchaseSheet } from '../stock/PurchaseSheet'
import type { ProfitMode } from './CalendarPage'
import { useRangeData } from './useRangeData'

export function DaySheet({ day, mode, onClose }: { day: string; mode: ProfitMode; onClose: () => void }) {
  const settings = useSettings()
  const data = useRangeData(day, day, settings.dayCutoffHour)
  const names = useLiveQuery(async () => {
    const [items, customers] = await Promise.all([db.items.toArray(), db.customers.toArray()])
    return { items: new Map(items.map((i) => [i.id, i.name])), customers: new Map(alive(customers).map((c) => [c.id, c])) }
  }, [])
  const [sale, setSale] = useState<Sale | null>(null)
  const [buy, setBuy] = useState(false)
  const [spend, setSpend] = useState(false)
  const s = data?.days.get(day)
  const sales = useMemo(() => [...(data?.sales ?? [])].sort((a, b) => (a.at < b.at ? 1 : -1)), [data])

  return (
    <Sheet open onClose={onClose} tall title={formatDay(day, { weekday: true, year: true })}>
      {!s || !data ? null : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-good-soft p-3">
              <div className="text-xs font-semibold text-good">Sales</div>
              <div className="tabular text-xl font-bold text-good">{inr(s.sales)}</div>
              <div className="text-xs text-good">{s.orders} orders</div>
            </div>
            <div className={clsx('rounded-2xl p-3', profitOf(s, mode) >= 0 ? 'bg-surface-2' : 'bg-bad-soft')}>
              <div className="text-xs font-semibold text-muted">Profit</div>
              <div className={clsx('tabular text-xl font-bold', profitOf(s, mode) >= 0 ? 'text-good' : 'text-bad')}>{inr(Math.round(profitOf(s, mode)))}</div>
              <div className="text-xs text-muted">{mode === 'spread' ? 'fixed costs spread' : 'as paid'}</div>
            </div>
          </div>
          <div className="tabular mt-3 space-y-1 rounded-2xl border border-line p-3 text-sm">
            <div className="flex justify-between"><span>Cash received</span><span>{inr(s.cashIn + s.creditCollectedCash)}</span></div>
            <div className="flex justify-between"><span>Online received</span><span>{inr(s.onlineIn + s.creditCollectedOnline)}</span></div>
            {s.creditGiven > 0 && <div className="flex justify-between text-warn"><span>Udhaar given</span><span>{inr(s.creditGiven)}</span></div>}
            {s.creditCollected > 0 && <div className="flex justify-between text-good"><span>Udhaar collected</span><span>{inr(s.creditCollected)}</span></div>}
            <div className="flex justify-between"><span>Stock bought</span><span>−{inr(s.purchases)}</span></div>
            <div className="flex justify-between"><span>Other spends</span><span>−{inr(s.expensesOneTime)}</span></div>
            <div className="flex justify-between"><span>{mode === 'spread' ? "Fixed costs' share" : 'Rent, EMI… paid'}</span><span>−{inr(Math.round(mode === 'spread' ? s.recurringShare : s.expensesRecurring))}</span></div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="soft" size="sm" onClick={() => setBuy(true)}>+ Purchase</Button>
            <Button variant="soft" size="sm" onClick={() => setSpend(true)}>+ Expense</Button>
          </div>

          {data.gas.length > 0 && (
            <Section title="Gas">
              {data.gas.map((g, i) => (
                <Line key={i} left={`${g.kind === 'bought' ? '🛢️ Bought cylinder' : g.kind === 'connected' ? '🔥 Connected cylinder' : '⭕ Cylinder empty'}`} sub={formatTime(g.at)} right={g.kind === 'bought' ? inr(g.c.price) : ''} />
              ))}
            </Section>
          )}

          {data.purchases.length > 0 && (
            <Section title={`Stock bought · ${inr(s.purchases)}`}>
              {data.purchases.map((p) => (
                <Line key={p.id} left={p.itemId === GAS_ITEM_ID ? 'Gas cylinder' : names?.items.get(p.itemId) ?? 'Item'} sub={`${fmtQty(p.qty, p.unit)} · ${formatTime(p.at)}${p.vendor ? ` · ${p.vendor}` : ''}`} right={inr(p.amount)} />
              ))}
            </Section>
          )}

          {data.expenses.length > 0 && (
            <Section title="Expenses">
              {data.expenses.map((e) => (
                <Line key={e.id} left={e.name} sub={`${e.recurringId ? 'Recurring · ' : ''}${e.remarks ?? formatTime(e.at)}`} right={inr(e.amount)} />
              ))}
            </Section>
          )}

          {data.redeemed.length > 0 && (
            <Section title="Rewards given">
              {data.redeemed.map((r) => (
                <Line key={r.id} left={`🎁 ${r.rewardLabel}`} sub={names?.customers.get(r.customerId)?.name} right="" />
              ))}
            </Section>
          )}

          <Section title={`Sales · ${sales.length}`}>
            {sales.length === 0 && <div className="p-3 text-sm text-muted">No sales.</div>}
            {sales.map((x) => (
              <button key={x.id} className="block w-full text-left active:bg-surface-2" onClick={() => setSale(x)}>
                <Line
                  left={<span className={clsx(x.status === 'void' && 'text-muted line-through')}>#{x.billNo} · {x.customerId ? names?.customers.get(x.customerId)?.name ?? '' : 'Walk-in'}</span>}
                  sub={`${formatTime(x.at)} · ${x.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}`}
                  right={<span className={clsx(x.status === 'void' && 'text-muted line-through')}>{inr(x.total)}</span>}
                />
              </button>
            ))}
          </Section>
        </>
      )}
      {sale && <SaleSheet sale={sale} customer={sale.customerId ? names?.customers.get(sale.customerId) as Customer | undefined : undefined} onClose={() => setSale(null)} />}
      <PurchaseSheet open={buy} day={day} onClose={() => setBuy(false)} />
      <ExpenseSheet open={spend} day={day} onClose={() => setSpend(false)} />
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-1.5 text-sm font-semibold text-muted">{title}</div>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">{children}</div>
    </div>
  )
}

function Line({ left, sub, right }: { left: React.ReactNode; sub?: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{left}</div>
        {sub && <div className="truncate text-xs text-muted">{sub}</div>}
      </div>
      <div className="tabular shrink-0 font-semibold">{right}</div>
    </div>
  )
}
