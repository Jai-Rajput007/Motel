import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useDraft, useSettings, useToday } from '../../hooks'
import { profitOf, totalOf, type DaySummary } from '../../lib/calc/summary'
import { addMonths, dayKey, eachDay, formatDay, formatMonth, monthBounds, monthKey, parts, weekdayMon0 } from '../../lib/dates'
import { inr, inrShort } from '../../lib/money'
import { Card, List, Page, Row, SectionTitle, Segmented, Stat } from '../../ui/kit'
import { RangeChips, rangeFor, rangeLabel, type Range } from '../../ui/RangePicker'
import { SyncDot } from '../../ui/SyncDot'
import { DaySheet } from './DaySheet'
import { useRangeData, type RangeData } from './useRangeData'

export type ProfitMode = 'spread' | 'cash'

export default function CalendarPage() {
  const today = useToday()
  const settings = useSettings()
  const [view, setView] = useDraft<'month' | 'range'>('calView', () => 'month')
  const [mode, setMode] = useDraft<ProfitMode>('profitMode', () => 'spread')
  const [month, setMonth] = useState(monthKey(today))
  const [range, setRange] = useState<Range>(() => rangeFor('7d', today))
  const [from, to] = view === 'month' ? monthBounds(month) : [range.from, range.to]
  const data = useRangeData(from, to, settings.dayCutoffHour)
  const [openDay, setOpenDay] = useState<string | null>(null)

  return (
    <Page title="Calendar" actions={<SyncDot />}>
      <div className="mb-3 flex gap-2">
        <Segmented className="flex-1" value={view} onChange={setView} options={[{ value: 'month', label: 'Month' }, { value: 'range', label: 'Pick dates' }]} />
      </div>
      {view === 'month' ? (
        <>
          <div className="mb-2 flex items-center justify-between">
            <button aria-label="Previous month" className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surface-2" onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft />
            </button>
            <button className="text-lg font-bold" onClick={() => setMonth(monthKey(today))}>
              {formatMonth(month)}
            </button>
            <button aria-label="Next month" className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surface-2" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight />
            </button>
          </div>
          {data && <MonthGrid month={month} today={today} data={data} mode={mode} onPick={setOpenDay} cutoff={settings.dayCutoffHour} />}
        </>
      ) : (
        <RangeChips value={range} onChange={setRange} today={today} presets={['7d', '30d', 'month', 'lastmonth', 'custom']} />
      )}

      {data && <Totals data={data} mode={mode} setMode={setMode} label={view === 'month' ? formatMonth(month) : rangeLabel(range)} today={today} onPick={setOpenDay} showChart={view === 'range'} />}
      {openDay && <DaySheet day={openDay} mode={mode} onClose={() => setOpenDay(null)} />}
    </Page>
  )
}

function MonthGrid({ month, today, data, mode, onPick, cutoff }: { month: string; today: string; data: RangeData; mode: ProfitMode; onPick: (d: string) => void; cutoff: number }) {
  const [a, b] = monthBounds(month)
  const lead = weekdayMon0(a)
  const flags = useMemo(() => {
    const m = new Map<string, Set<string>>()
    const add = (d: string, f: string) => {
      if (!m.has(d)) m.set(d, new Set())
      m.get(d)!.add(f)
    }
    data.purchases.forEach((p) => p.itemId !== 'item-gas' && add(p.day, 'veg'))
    data.gas.forEach((g) => g.kind !== 'empty' && add(g.day, g.kind === 'bought' ? 'gasBuy' : 'gasOn'))
    data.expenses.forEach((e) => add(e.day, 'exp'))
    data.redeemed.forEach((r) => add(dayKey(r.redeemedAt!, cutoff), 'gift'))
    return m
  }, [data, cutoff])
  return (
    <div>
      <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-muted">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <div key={`x${i}`} />
        ))}
        {eachDay(a, b).map((d) => {
          const s = data.days.get(d)!
          const p = profitOf(s, mode)
          const f = flags.get(d)
          const future = d > today
          const has = s.sales || s.purchases || s.expensesOneTime || s.expensesRecurring
          return (
            <button
              key={d}
              onClick={() => onPick(d)}
              className={clsx(
                'flex aspect-[4/5] flex-col items-center rounded-xl border px-0.5 pt-1 text-center active:scale-95',
                d === today ? 'border-brand bg-brand-soft' : 'border-line bg-surface',
                future && 'opacity-50',
              )}
            >
              <span className={clsx('text-xs font-bold', d === today && 'text-brand')}>{parts(d).d}</span>
              <span className="tabular mt-0.5 text-[11px] font-semibold leading-tight text-good">{s.sales ? inrShort(s.sales) : ''}</span>
              {has && !future ? <span className={clsx('mt-0.5 h-1 w-6 rounded-full', p >= 0 ? 'bg-good' : 'bg-bad')} /> : null}
              <span className="mt-auto mb-1 flex flex-wrap justify-center gap-px text-[9px] leading-none">
                {f?.has('veg') && <span title="Stock bought">🥬</span>}
                {f?.has('gasBuy') && <span title="Gas bought">🛢️</span>}
                {f?.has('gasOn') && <span title="Gas connected">🔥</span>}
                {f?.has('exp') && <span title="Expense">💸</span>}
                {f?.has('gift') && <span title="Reward given">🎁</span>}
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
        <span>🥬 stock</span>
        <span>🛢️ gas bought</span>
        <span>🔥 gas connected</span>
        <span>💸 expense</span>
        <span>🎁 reward given</span>
      </div>
    </div>
  )
}

function Totals({ data, mode, setMode, label, today, onPick, showChart }: { data: RangeData; mode: ProfitMode; setMode: (m: ProfitMode) => void; label: string; today: string; onPick: (d: string) => void; showChart: boolean }) {
  const days = [...data.days.values()].filter((d) => d.day <= today)
  const t = totalOf(days)
  const profit = profitOf(t, mode)
  const withSales = days.filter((d) => d.orders > 0)
  const best = [...withSales].sort((a, b) => b.sales - a.sales)[0]
  const worst = [...withSales].sort((a, b) => a.sales - b.sales)[0]
  const chart = days.map((d) => ({ day: formatDay(d.day), sales: d.sales / 100, profit: profitOf(d, mode) / 100 }))

  return (
    <>
      <SectionTitle>{label}</SectionTitle>
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-sm text-muted">Earned (sales)</div>
            <div className="tabular text-2xl font-bold text-good">{inr(t.sales)}</div>
          </div>
          <div>
            <div className="text-sm text-muted">Profit</div>
            <div className={clsx('tabular text-2xl font-bold', profit >= 0 ? 'text-good' : 'text-bad')}>{inr(Math.round(profit))}</div>
          </div>
        </div>
        <div className="tabular mt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted">Stock bought</span><span>−{inr(t.purchases)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Other spends</span><span>−{inr(t.expensesOneTime)}</span></div>
          {mode === 'spread' ? (
            <div className="flex justify-between"><span className="text-muted">Fixed costs (share of rent, EMI…)</span><span>−{inr(Math.round(t.recurringShare))}</span></div>
          ) : (
            <div className="flex justify-between"><span className="text-muted">Rent, EMI… paid</span><span>−{inr(t.expensesRecurring)}</span></div>
          )}
        </div>
        <Segmented
          className="mt-3"
          value={mode}
          onChange={setMode}
          options={[{ value: 'spread', label: 'Spread daily' }, { value: 'cash', label: 'As paid' }]}
        />
      </Card>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Orders" value={t.orders} />
        <Stat label="Avg per day" value={inrShort(withSales.length ? t.sales / withSales.length : 0)} sub={`${withSales.length} days open`} />
        <Stat label="Avg bill" value={inrShort(t.orders ? t.sales / t.orders : 0)} />
      </div>

      {showChart && chart.length > 1 && (
        <Card className="mt-3">
          <div className="mb-1 text-sm font-semibold">Daily sales</div>
          <div className="h-44">
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <Tooltip cursor={{ fill: 'var(--surface-2)' }} formatter={(v, n) => [`₹${Math.round(Number(v))}`, n === 'sales' ? 'Sales' : 'Profit']} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }} />
                <Bar dataKey="sales" radius={[5, 5, 0, 0]}>
                  {chart.map((c, i) => (
                    <Cell key={i} fill={c.profit >= 0 ? 'var(--good)' : 'var(--bad)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-muted">Green = profit that day, red = loss</div>
        </Card>
      )}

      {best && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Card onClick={() => onPick(best.day)} className="!p-3">
            <div className="text-xs text-muted">Best day</div>
            <div className="font-bold">{formatDay(best.day, { weekday: true })}</div>
            <div className="tabular text-sm text-good">{inr(best.sales)}</div>
          </Card>
          {worst && worst.day !== best.day && (
            <Card onClick={() => onPick(worst.day)} className="!p-3">
              <div className="text-xs text-muted">Slowest day</div>
              <div className="font-bold">{formatDay(worst.day, { weekday: true })}</div>
              <div className="tabular text-sm">{inr(worst.sales)}</div>
            </Card>
          )}
        </div>
      )}

      {showChart && (
        <>
          <SectionTitle>Each day</SectionTitle>
          <List>
            {[...days].reverse().map((d: DaySummary) => (
              <Row
                key={d.day}
                onClick={() => onPick(d.day)}
                title={formatDay(d.day, { weekday: true })}
                sub={`${d.orders} orders · spent ${inr(d.purchases + d.expensesOneTime + d.expensesRecurring)}`}
                right={
                  <div className="tabular">
                    <div className="font-semibold text-good">{inr(d.sales)}</div>
                    <div className={clsx('text-xs', profitOf(d, mode) >= 0 ? 'text-good' : 'text-bad')}>profit {inr(Math.round(profitOf(d, mode)))}</div>
                  </div>
                }
              />
            ))}
          </List>
        </>
      )}
    </>
  )
}
