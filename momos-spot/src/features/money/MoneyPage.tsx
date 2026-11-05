import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, Plus, Repeat, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { alive, db } from '../../db'
import type { Expense, Recurring } from '../../db/types'
import { useDraft, useSettings, useToday } from '../../hooks'
import { amountOn, deductionMeter, emiProgress, fixedCostPerDay, isPaused, occurrences, withStatus, type OccurrenceWithStatus } from '../../lib/calc/recurring'
import { profitOf, totalOf } from '../../lib/calc/summary'
import { addDays, addMonths, formatDay, formatMonth, formatTime, monthBounds, monthKey, relativeDay } from '../../lib/dates'
import { inr } from '../../lib/money'
import { Badge, Button, Card, Empty, List, Page, Progress, Row, SectionTitle, Segmented, Stat } from '../../ui/kit'
import { RangeChips, rangeFor, type Range } from '../../ui/RangePicker'
import { Sheet } from '../../ui/Sheet'
import { SyncDot } from '../../ui/SyncDot'
import { useRangeData, type RangeData } from '../calendar/useRangeData'
import { ExpenseSheet, useExpenseCategories } from './ExpenseSheet'
import { freqText, PaySheet, RecurringDetail, RecurringSheet, statusBadge } from './RecurringSheets'

type Tab = 'overview' | 'fixed' | 'expenses'
const COLORS = ['#ea580c', '#16a34a', '#2563eb', '#9333ea', '#db2777', '#0891b2', '#ca8a04', '#64748b', '#dc2626', '#4f46e5', '#65a30d', '#0d9488']

function useMoneyBase() {
  return useLiveQuery(async () => {
    const [rec, exps, items, stockCats] = await Promise.all([db.recurring.toArray(), db.expenses.where('recurringId').above('').toArray(), db.items.toArray(), db.stockCategories.toArray()])
    return {
      recurring: alive(rec) as Recurring[],
      recExpenses: alive(exps) as Expense[],
      items: new Map(items.map((i) => [i.id, i])),
      stockCats: new Map(stockCats.map((c) => [c.id, c.name])),
    }
  }, [])
}

export default function MoneyPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'overview'
  const [addExp, setAddExp] = useState(false)
  const [addRec, setAddRec] = useState(false)
  const today = useToday()
  return (
    <Page title="Money" actions={<SyncDot />}>
      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" icon={<Plus size={20} />} onClick={() => setAddExp(true)}>
          Expense
        </Button>
        <Button size="lg" variant="secondary" icon={<Repeat size={20} />} onClick={() => setAddRec(true)}>
          Rent / EMI
        </Button>
      </div>
      <Segmented
        className="mt-4"
        value={tab}
        onChange={(t) => setParams({ tab: t }, { replace: true })}
        options={[{ value: 'overview', label: 'Overview' }, { value: 'fixed', label: 'Fixed costs' }, { value: 'expenses', label: 'Expenses' }]}
      />
      <div className="mt-4">{tab === 'overview' ? <Overview /> : tab === 'fixed' ? <Fixed onAdd={() => setAddRec(true)} /> : <Expenses />}</div>
      <ExpenseSheet open={addExp} onClose={() => setAddExp(false)} />
      <RecurringSheet open={addRec} onClose={() => setAddRec(false)} today={today} />
    </Page>
  )
}

function Overview() {
  const today = useToday()
  const settings = useSettings()
  const [mode, setMode] = useDraft<'spread' | 'cash'>('profitMode', () => 'spread')
  const [month, setMonth] = useState(monthKey(today))
  const [a, b] = monthBounds(month)
  const end = month === monthKey(today) ? today : b
  const data = useRangeData(a, end < a ? a : end, settings.dayCutoffHour)
  const [pa, pb] = monthBounds(addMonths(month, -1))
  const prev = useRangeData(pa, pb, settings.dayCutoffHour)
  const base = useMoneyBase()
  const expCats = useExpenseCategories()
  const [drill, setDrill] = useState<string | null>(null)
  const [pay, setPay] = useState<{ r: Recurring; o: OccurrenceWithStatus } | null>(null)

  const breakdown = useMemo(() => {
    if (!data || !base) return []
    const m = new Map<string, { key: string; name: string; total: number }>()
    const add = (key: string, name: string, v: number) => {
      const x = m.get(key) ?? { key, name, total: 0 }
      x.total += v
      m.set(key, x)
    }
    for (const p of data.purchases) {
      const cat = base.items.get(p.itemId)?.categoryId ?? 'cat-other'
      add(`s:${cat}`, base.stockCats.get(cat) ?? 'Stock', p.amount)
    }
    for (const e of data.expenses) add(`e:${e.categoryId}`, expCats.find((c) => c.id === e.categoryId)?.name ?? 'Other', e.amount)
    return [...m.values()].sort((x, y) => y.total - x.total)
  }, [data, base, expCats])

  if (!data || !prev || !base) return null
  const days = [...data.days.values()].filter((d) => d.day <= today)
  const t = totalOf(days)
  const pt = totalOf([...prev.days.values()])
  const profit = profitOf(t, mode)
  const pprofit = profitOf(pt, mode)
  const spend = t.purchases + t.expensesOneTime + (mode === 'spread' ? t.recurringShare : t.expensesRecurring)
  const todaySum = data.days.get(today)
  const isCurrent = month === monthKey(today)
  const meter = deductionMeter(base.recurring, base.recExpenses, today)
  const perDay = fixedCostPerDay(base.recurring, month)
  const due = isCurrent
    ? base.recurring
        .flatMap((r) => withStatus(r, occurrences(r, addDays(today, -62), addDays(today, 5)), base.recExpenses, today).map((o) => ({ r, o })))
        .filter(({ o }) => o.status !== 'paid')
        .sort((x, y) => (x.o.date < y.o.date ? -1 : 1))
    : []
  const totalSpend = breakdown.reduce((s, x) => s + x.total, 0)
  const moneyIn = { cash: t.cashIn + t.creditCollectedCash, online: t.onlineIn + t.creditCollectedOnline }
  const moneyOut = { cash: t.purchasesCash + t.expensesCash, online: t.purchases - t.purchasesCash + t.expensesOneTime + t.expensesRecurring - t.expensesCash }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <button aria-label="Previous month" className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surface-2" onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeft />
        </button>
        <span className="text-lg font-bold">{formatMonth(month)}</span>
        <button aria-label="Next month" disabled={isCurrent} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surface-2 disabled:opacity-30" onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight />
        </button>
      </div>

      <Card>
        <div className="text-sm text-muted">{isCurrent ? 'Profit this month so far' : 'Profit'}</div>
        <div className={clsx('tabular text-3xl font-bold', profit >= 0 ? 'text-good' : 'text-bad')}>{inr(Math.round(profit))}</div>
        <div className="text-sm text-muted">
          Sales {inr(t.sales)} − spent {inr(Math.round(spend))}
          {t.sales > 0 && profit > 0 && ` · margin ${Math.round((profit / t.sales) * 100)}%`}
        </div>
        <Segmented className="mt-3" value={mode} onChange={setMode} options={[{ value: 'spread', label: 'Spread daily' }, { value: 'cash', label: 'As paid' }]} />
      </Card>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {isCurrent && todaySum && <Stat label="Today's profit" value={inr(Math.round(profitOf(todaySum, mode)))} tone={profitOf(todaySum, mode) >= 0 ? 'good' : 'bad'} sub={`sales ${inr(todaySum.sales)}`} />}
        <Stat label="Fixed costs per day" value={inr(Math.round(perDay))} sub="rent, EMI, salary… ÷ days" />
        <Stat label="Stock bought" value={inr(t.purchases)} />
        <Stat label="Other expenses" value={inr(t.expensesOneTime)} />
      </div>
      {perDay > 0 && isCurrent && <p className="mt-2 px-1 text-xs text-muted">You need about {inr(Math.round(perDay))} profit from sales each day just to cover fixed costs.</p>}

      {isCurrent && meter.monthTotal > 0 && (
        <>
          <SectionTitle>Fixed costs this month</SectionTitle>
          <Card>
            <div className="text-sm">
              Up to today <b className="tabular">{inr(meter.dueSoFar)}</b> should have gone out. Paid <b className="tabular text-good">{inr(meter.paidSoFar)}</b>
              {meter.pending > 0 && (
                <>
                  , pending <b className="tabular text-bad">{inr(meter.pending)}</b>
                </>
              )}
              .
            </div>
            <div className="mt-2">
              <Progress value={meter.paidSoFar} max={meter.monthTotal} tone="good" />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>Paid {inr(meter.paidSoFar)}</span>
              <span>Whole month {inr(meter.monthTotal)}</span>
            </div>
          </Card>
        </>
      )}

      {due.length > 0 && (
        <>
          <SectionTitle>Due & overdue</SectionTitle>
          <List>
            {due.slice(0, 8).map(({ r, o }) => (
              <Row
                key={`${r.id}${o.date}`}
                title={r.name}
                sub={<span className="flex items-center gap-2">{relativeDay(o.date, today)} · {inr(o.amount - o.paid)} {statusBadge(o)}</span>}
                right={<Button size="sm" variant="soft" onClick={() => setPay({ r, o })}>Pay</Button>}
              />
            ))}
          </List>
        </>
      )}

      <SectionTitle>Where the money went</SectionTitle>
      {breakdown.length === 0 ? (
        <Empty icon={<Wallet size={32} />} title="No spending recorded this month" />
      ) : (
        <Card>
          <div className="flex items-center gap-4">
            <div className="h-36 w-36 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={breakdown} dataKey="total" nameKey="name" innerRadius="58%" outerRadius="100%" paddingAngle={2} stroke="none" isAnimationActive={false}>
                    {breakdown.map((x, i) => (
                      <Cell key={x.key} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="min-w-0">
              <div className="text-sm text-muted">Total spent</div>
              <div className="tabular text-xl font-bold">{inr(totalSpend)}</div>
              <div className="text-xs text-muted">Stock + expenses actually paid</div>
            </div>
          </div>
          <div className="mt-3 divide-y divide-line">
            {breakdown.map((x, i) => (
              <button key={x.key} onClick={() => setDrill(x.key)} className="flex w-full items-center gap-3 py-2.5 text-left">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="flex-1 truncate font-medium">{x.name}</span>
                <span className="text-xs text-muted">{Math.round((x.total / totalSpend) * 100)}%</span>
                <span className="tabular w-24 text-right font-semibold">{inr(x.total)}</span>
                <ChevronRight size={16} className="text-muted" />
              </button>
            ))}
          </div>
        </Card>
      )}

      <SectionTitle>Money in & out</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="In · cash" value={inr(moneyIn.cash)} tone="good" />
        <Stat label="In · online" value={inr(moneyIn.online)} tone="good" />
        <Stat label="Out · cash" value={inr(moneyOut.cash)} />
        <Stat label="Out · online" value={inr(moneyOut.online)} />
      </div>
      {t.creditGiven > 0 && <p className="mt-2 px-1 text-xs text-muted">Udhaar given this month: {inr(t.creditGiven)} (counted in sales, not yet received).</p>}

      <SectionTitle>Compared with {formatMonth(addMonths(month, -1))}</SectionTitle>
      <List>
        <Compare label="Sales" now={t.sales} before={pt.sales} good="up" />
        <Compare label="Stock bought" now={t.purchases} before={pt.purchases} good="down" />
        <Compare label="Other expenses" now={t.expensesOneTime} before={pt.expensesOneTime} good="down" />
        <Compare label="Profit" now={Math.round(profit)} before={Math.round(pprofit)} good="up" />
        <Compare label="Orders" now={t.orders} before={pt.orders} good="up" count />
      </List>
      {isCurrent && <p className="mt-2 px-1 text-xs text-muted">This month is not over yet, so it has fewer days than last month.</p>}

      {drill && <Drill keyName={drill} data={data} base={base} expCatName={(id) => expCats.find((c) => c.id === id)?.name ?? 'Other'} onClose={() => setDrill(null)} />}
      {pay && <PaySheet rec={pay.r} occ={pay.o} onClose={() => setPay(null)} />}
    </>
  )
}

function Compare({ label, now, before, good, count }: { label: string; now: number; before: number; good: 'up' | 'down'; count?: boolean }) {
  const diff = now - before
  const better = good === 'up' ? diff >= 0 : diff <= 0
  return (
    <Row
      title={label}
      sub={`was ${count ? before : inr(before)}`}
      right={
        <div className="tabular">
          <div className="font-semibold">{count ? now : inr(now)}</div>
          {diff !== 0 && <div className={clsx('text-xs font-semibold', better ? 'text-good' : 'text-bad')}>{diff > 0 ? '▲' : '▼'} {count ? Math.abs(diff) : inr(Math.abs(diff))}</div>}
        </div>
      }
    />
  )
}

function Drill({ keyName, data, base, expCatName, onClose }: { keyName: string; data: RangeData; base: NonNullable<ReturnType<typeof useMoneyBase>>; expCatName: (id: string) => string; onClose: () => void }) {
  const [kind, id] = keyName.split(/:(.*)/s)
  const rows = new Map<string, { name: string; total: number; n: number }>()
  let title = ''
  if (kind === 's') {
    title = base.stockCats.get(id) ?? 'Stock'
    for (const p of data.purchases) {
      const it = base.items.get(p.itemId)
      if ((it?.categoryId ?? 'cat-other') !== id) continue
      const name = it?.name ?? 'Item'
      const x = rows.get(name) ?? { name, total: 0, n: 0 }
      x.total += p.amount
      x.n++
      rows.set(name, x)
    }
  } else {
    title = expCatName(id)
    for (const e of data.expenses) {
      if (e.categoryId !== id) continue
      const x = rows.get(e.name) ?? { name: e.name, total: 0, n: 0 }
      x.total += e.amount
      x.n++
      rows.set(e.name, x)
    }
  }
  const list = [...rows.values()].sort((a, b) => b.total - a.total)
  return (
    <Sheet open onClose={onClose} title={title} subtitle={`${inr(list.reduce((s, x) => s + x.total, 0))} this month`}>
      <div className="divide-y divide-line">
        {list.map((x) => (
          <div key={x.name} className="flex justify-between py-2.5">
            <span>
              {x.name} <span className="text-xs text-muted">×{x.n}</span>
            </span>
            <span className="tabular font-semibold">{inr(x.total)}</span>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

function Fixed({ onAdd }: { onAdd: () => void }) {
  const today = useToday()
  const base = useMoneyBase()
  const [open, setOpen] = useState<Recurring | null>(null)
  const [edit, setEdit] = useState<Recurring | null>(null)
  if (!base) return null
  const list = [...base.recurring].sort((a, b) => a.name.localeCompare(b.name))
  if (list.length === 0)
    return (
      <Empty icon={<Repeat size={34} />} title="No fixed costs yet" action={<Button onClick={onAdd}>Add rent, EMI or salary</Button>}>
        Add rent, EMIs (even daily ones), salaries and bills. You will see what is due, what is paid and your real daily profit.
      </Empty>
    )
  const [ma, mb] = monthBounds(monthKey(today))
  return (
    <>
      <List>
        {list.map((r) => {
          const occ = withStatus(r, occurrences(r, ma, mb), base.recExpenses, today)
          const next = occurrences(r, today, addDays(today, 400))[0]
          const emi = emiProgress(r, base.recExpenses)
          const bad = occ.some((o) => o.status === 'overdue')
          const paid = occ.filter((o) => o.status === 'paid').length
          return (
            <button key={r.id} onClick={() => setOpen(r)} className="block w-full px-4 py-3 text-left active:bg-surface-2">
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate font-semibold">{r.name}</span>
                {isPaused(r, today) ? <Badge>Paused</Badge> : bad ? <Badge tone="bad">Overdue</Badge> : occ.length && paid === occ.length ? <Badge tone="good">Paid</Badge> : null}
                <span className="tabular font-semibold">{inr(amountOn(r, today))}</span>
              </div>
              <div className="text-sm text-muted">
                {freqText(r)}
                {next ? ` · next ${relativeDay(next.date, today).toLowerCase()}` : ' · finished'}
                {r.autoPaid ? ' · auto' : ''}
              </div>
              {r.frequency !== 'monthly' && occ.length > 1 && (
                <div className="text-xs text-muted">
                  This month: {paid}/{occ.length} paid
                </div>
              )}
              {emi && (
                <div className="mt-2">
                  <Progress value={emi.done} max={emi.total} tone="good" />
                  <div className="mt-1 text-xs text-muted">
                    {emi.done}/{emi.total} paid · {inr(emi.leftAmount)} left
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </List>
      {open && (
        <RecurringDetail
          rec={base.recurring.find((r) => r.id === open.id) ?? open}
          expenses={base.recExpenses}
          today={today}
          onClose={() => setOpen(null)}
          onEdit={() => {
            setEdit(open)
            setOpen(null)
          }}
        />
      )}
      <RecurringSheet open={!!edit} rec={edit} onClose={() => setEdit(null)} today={today} />
    </>
  )
}

function Expenses() {
  const today = useToday()
  const [range, setRange] = useState<Range>(() => rangeFor('month', today))
  const cats = useExpenseCategories()
  const list = useLiveQuery(async () => alive(await db.expenses.where('day').between(range.from, range.to, true, true).toArray()).sort((a, b) => (a.at < b.at ? 1 : -1)), [range.from, range.to])
  const [edit, setEdit] = useState<Expense | null>(null)
  const byDay = useMemo(() => {
    const m = new Map<string, Expense[]>()
    for (const e of list ?? []) m.set(e.day, [...(m.get(e.day) ?? []), e])
    return [...m.entries()]
  }, [list])
  return (
    <>
      <RangeChips value={range} onChange={setRange} today={today} />
      {list && list.length === 0 && <Empty icon={<Wallet size={32} />} title="No expenses in these dates" />}
      {list && list.length > 0 && (
        <div className="mb-2 px-1 text-sm text-muted">
          {list.length} entries · <b className="text-ink">{inr(list.reduce((s, e) => s + e.amount, 0))}</b>
        </div>
      )}
      {byDay.map(([day, es]) => (
        <div key={day} className="mb-4">
          <div className="mb-1.5 flex justify-between px-1 text-sm font-semibold">
            <span>{formatDay(day, { weekday: true })}</span>
            <span className="tabular">{inr(es.reduce((s, e) => s + e.amount, 0))}</span>
          </div>
          <List>
            {es.map((e) => (
              <Row
                key={e.id}
                onClick={() => setEdit(e)}
                title={
                  <span className="flex items-center gap-1.5">
                    {e.name} {e.recurringId && <Repeat size={13} className="text-muted" />}
                  </span>
                }
                sub={`${cats.find((c) => c.id === e.categoryId)?.name ?? ''} · ${formatTime(e.at)}${e.remarks ? ` · ${e.remarks}` : ''}`}
                right={
                  <div>
                    <div className="tabular font-semibold">{inr(e.amount)}</div>
                    <div className="text-xs text-muted">{e.payMode === 'cash' ? 'Cash' : 'Online'}</div>
                  </div>
                }
              />
            ))}
          </List>
        </div>
      ))}
      <ExpenseSheet open={!!edit} expense={edit} onClose={() => setEdit(null)} />
    </>
  )
}
