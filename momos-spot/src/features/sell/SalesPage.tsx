import clsx from 'clsx'
import { Bike, Gift, Receipt } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { Customer, Sale } from '../../db/types'
import { useAll, useDays, useToday } from '../../hooks'
import { addDays, diffDays, formatTime, relativeDay } from '../../lib/dates'
import { inr } from '../../lib/money'
import { Badge, Card, Empty, List, Page, Row, SectionTitle, Stat } from '../../ui/kit'
import { RangeChips, rangeFor, rangeLabel, type Range } from '../../ui/RangePicker'
import { SaleSheet } from './SaleSheet'

export function salesStats(list: Sale[]) {
  const done = list.filter((s) => s.status === 'done' && !s.deletedAt)
  const total = done.reduce((t, s) => t + s.total, 0)
  return {
    done,
    total,
    orders: done.length,
    avg: done.length ? total / done.length : 0,
    cash: done.reduce((t, s) => t + s.cash, 0),
    online: done.reduce((t, s) => t + s.online, 0),
    credit: done.reduce((t, s) => t + s.credit, 0),
    delivery: done.filter((s) => s.isDelivery).length,
    deliveryFees: done.reduce((t, s) => t + s.deliveryFee, 0),
    discounts: done.reduce((t, s) => t + s.discount, 0),
    items: done.reduce((t, s) => t + s.lines.reduce((a, l) => a + l.qty, 0), 0),
    voided: list.filter((s) => s.status === 'void').length,
  }
}

export default function SalesPage() {
  const today = useToday()
  const [range, setRange] = useState<Range>(() => rangeFor('today', today))
  const len = diffDays(range.from, range.to) + 1
  const prevFrom = len === 1 ? addDays(range.from, -7) : addDays(range.from, -len)
  const prevTo = len === 1 ? addDays(range.to, -7) : addDays(range.from, -1)
  const sales = useDays<Sale>('sales', range.from, range.to)
  const prev = useDays<Sale>('sales', prevFrom, prevTo)
  const customers = useAll<Customer>('customers')
  const [open, setOpen] = useState<Sale | null>(null)
  const cById = useMemo(() => new Map((customers ?? []).map((c) => [c.id, c])), [customers])

  const list = useMemo(() => [...(sales ?? [])].sort((a, b) => (a.at < b.at ? 1 : -1)), [sales])
  const st = salesStats(list)
  const pst = salesStats(prev ?? [])
  const change = pst.total > 0 ? (st.total - pst.total) / pst.total : null

  const hours = useMemo(() => {
    const h = Array.from({ length: 24 }, (_, i) => ({ h: i, label: `${i % 12 || 12}${i < 12 ? 'a' : 'p'}`, total: 0 }))
    for (const s of st.done) h[new Date(s.at).getHours()].total += s.total / 100
    const used = h.filter((x) => x.total > 0).map((x) => x.h)
    if (!used.length) return []
    return h.slice(Math.min(...used), Math.max(...used) + 1)
  }, [st.done])

  const top = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; revenue: number }>()
    for (const s of st.done)
      for (const l of s.lines) {
        const key = l.name
        const x = m.get(key) ?? { name: key, qty: 0, revenue: 0 }
        x.qty += l.qty
        x.revenue += l.price * l.qty
        m.set(key, x)
      }
    return [...m.values()].sort((a, b) => b.qty - a.qty).slice(0, 8)
  }, [st.done])

  const byDay = useMemo(() => {
    const m = new Map<string, Sale[]>()
    for (const s of list) m.set(s.day, [...(m.get(s.day) ?? []), s])
    return [...m.entries()]
  }, [list])

  return (
    <Page title="Sales" back>
      <RangeChips value={range} onChange={setRange} today={today} />
      <Card>
        <div className="text-sm text-muted">{rangeLabel(range)} earnings</div>
        <div className="tabular text-3xl font-bold text-good">{inr(st.total)}</div>
        {change !== null && (
          <div className={clsx('text-sm font-semibold', change >= 0 ? 'text-good' : 'text-bad')}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(Math.round(change * 100))}% vs {len === 1 ? 'same day last week' : `previous ${len} days`} ({inr(pst.total)})
          </div>
        )}
      </Card>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Orders" value={st.orders} />
        <Stat label="Average bill" value={inr(Math.round(st.avg))} />
        <Stat label="Items sold" value={st.items} />
        <Stat label="Cash" value={inr(st.cash)} />
        <Stat label="Online" value={inr(st.online)} />
        <Stat label="Udhaar given" value={inr(st.credit)} tone={st.credit ? 'bad' : undefined} />
        <Stat label="Delivery orders" value={st.delivery} sub={st.deliveryFees ? `${inr(st.deliveryFees)} charges` : undefined} />
        <Stat label="Discounts" value={inr(st.discounts)} />
        <Stat label="Voided" value={st.voided} />
      </div>

      {hours.length > 1 && (
        <>
          <SectionTitle>Busiest hours</SectionTitle>
          <Card>
            <div className="h-36">
              <ResponsiveContainer>
                <BarChart data={hours} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} interval={0} />
                  <Tooltip cursor={{ fill: 'var(--surface-2)' }} formatter={(v) => [`₹${Math.round(Number(v))}`, 'Sales']} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }} />
                  <Bar dataKey="total" fill="var(--brand)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {top.length > 0 && (
        <>
          <SectionTitle>Top items</SectionTitle>
          <List>
            {top.map((t, i) => (
              <Row key={t.name} left={<span className="w-5 text-center font-bold text-muted">{i + 1}</span>} title={t.name} right={<div className="tabular text-right"><div className="font-semibold">{t.qty} sold</div><div className="text-xs text-muted">{inr(t.revenue)}</div></div>} />
            ))}
          </List>
        </>
      )}

      <SectionTitle>Bills</SectionTitle>
      {list.length === 0 ? (
        <Empty icon={<Receipt size={34} />} title="No sales in these dates" />
      ) : (
        byDay.map(([day, ss]) => (
          <div key={day} className="mb-4">
            <div className="mb-1.5 flex justify-between px-1 text-sm font-semibold">
              <span>{relativeDay(day, today)}</span>
              <span className="tabular">{inr(salesStats(ss).total)}</span>
            </div>
            <List>
              {ss.map((s) => {
                const c = s.customerId ? cById.get(s.customerId) : undefined
                return (
                  <Row
                    key={s.id}
                    onClick={() => setOpen(s)}
                    title={
                      <span className={clsx('flex items-center gap-1.5', s.status === 'void' && 'text-muted line-through')}>
                        #{s.billNo} · {c ? c.name : 'Walk-in'}
                        {s.isDelivery && <Bike size={14} className="text-info" />}
                        {s.rewardIds?.length ? <Gift size={14} className="text-brand" /> : null}
                      </span>
                    }
                    sub={`${formatTime(s.at)} · ${s.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}`}
                    right={
                      <div>
                        <div className={clsx('tabular font-semibold', s.status === 'void' && 'text-muted line-through')}>{inr(s.total)}</div>
                        <div className="text-xs text-muted">
                          {s.status === 'void' ? <Badge tone="bad">Void</Badge> : s.credit > 0 ? <Badge tone="warn">Udhaar</Badge> : s.cash && s.online ? 'Split' : s.online ? 'Online' : 'Cash'}
                        </div>
                      </div>
                    }
                  />
                )
              })}
            </List>
          </div>
        ))
      )}
      {open && <SaleSheet sale={open} customer={open.customerId ? cById.get(open.customerId) : undefined} onClose={() => setOpen(null)} />}
    </Page>
  )
}
