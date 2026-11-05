import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, CalendarClock, ChevronRight, Flame, Gift, HandCoins, LayoutGrid, PackageOpen, Plus, ReceiptIndianRupee, ShoppingBasket, ShoppingCart, Wallet } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { alive, db, getMeta } from '../../db'
import type { Recurring } from '../../db/types'
import { useSettings, useSyncStatus, useToday } from '../../hooks'
import { gasStats } from '../../lib/calc/gas'
import { usableRewards } from '../../lib/calc/loyalty'
import { occurrences, withStatus } from '../../lib/calc/recurring'
import { addDays, diffDays, formatDay, relativeDay, keyOfLocalDate } from '../../lib/dates'
import { inr } from '../../lib/money'
import { Badge, Button, Card, SectionTitle } from '../../ui/kit'
import { SyncDot } from '../../ui/SyncDot'
import { useRangeData } from '../calendar/useRangeData'
import { ExpenseSheet } from '../money/ExpenseSheet'
import { FinishedSheet } from '../stock/FinishedSheet'
import { PurchaseSheet } from '../stock/PurchaseSheet'

export default function TodayPage() {
  const today = useToday()
  const settings = useSettings()
  const nav = useNavigate()
  const sync = useSyncStatus()
  const data = useRangeData(addDays(today, -7), today, settings.dayCutoffHour)
  const extra = useLiveQuery(async () => {
    const [menu, restock, cylinders, rewards, customers, recurring, recExp, lastBackup, session] = await Promise.all([
      db.menuItems.count(),
      db.restock.toArray(),
      db.cylinders.toArray(),
      db.rewards.where('status').equals('waiting').toArray(),
      db.customers.toArray(),
      db.recurring.toArray(),
      db.expenses.where('recurringId').above('').toArray(),
      getMeta<string | null>('lastBackupAt', null),
      db.cashSessions.get(today),
    ])
    return {
      menu,
      toBuy: alive(restock).filter((r) => !r.resolvedAt).length,
      gas: gasStats(alive(cylinders)),
      rewards: usableRewards(alive(rewards)),
      customers: new Map(customers.map((c) => [c.id, c.name])),
      recurring: alive(recurring) as Recurring[],
      recExp: alive(recExp),
      lastBackup,
      session,
    }
  }, [today])
  const credit = useLiveQuery(async () => {
    const all = alive(await db.sales.toArray()).filter((s) => s.status === 'done' && s.credit > 0)
    const given = all.reduce((s, x) => s + x.credit, 0)
    const back = alive(await db.creditPayments.toArray()).reduce((s, p) => s + p.amount, 0)
    return given - back
  }, [])
  const [buy, setBuy] = useState(false)
  const [spend, setSpend] = useState(false)
  const [fin, setFin] = useState(false)

  const t = data?.days.get(today)
  const lastWeek = data?.days.get(addDays(today, -7))
  const yesterday = data?.days.get(addDays(today, -1))

  const due = (extra?.recurring ?? [])
    .flatMap((r) => withStatus(r, occurrences(r, addDays(today, -45), addDays(today, 3)), extra!.recExp, today).map((o) => ({ r, o })))
    .filter(({ o }) => o.status !== 'paid')
    .sort((a, b) => (a.o.date < b.o.date ? -1 : 1))

  const backupDue =
    sync.state === 'off' && settings.backupReminderDays > 0 && (t?.orders ?? 0) + (data?.sales.length ?? 0) > 0 && (!extra?.lastBackup || diffDays(keyOfLocalDate(new Date(extra.lastBackup)), today) >= settings.backupReminderDays)
  const expectedCash = t ? (extra?.session?.opening ?? 0) + t.cashIn + t.creditCollectedCash - t.purchasesCash - t.expensesCash : 0
  const profit = t ? Math.round(t.profitSpread) : 0

  return (
    <div className="mx-auto w-full max-w-lg pb-28">
      <header className="pt-safe sticky top-0 z-30 bg-bg/90 backdrop-blur">
        <div className="flex min-h-14 items-center gap-2 px-4">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-bold leading-tight">{settings.shopName}</div>
            <div className="text-xs text-muted">{formatDay(today, { weekday: true, year: true })}</div>
          </div>
          <SyncDot />
          <button aria-label="More" onClick={() => nav('/more')} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surface-2">
            <LayoutGrid size={22} />
          </button>
        </div>
      </header>

      <div className="px-4 pt-2">
        {extra && extra.menu === 0 && (
          <Card className="mb-3 border-brand bg-brand-soft">
            <div className="text-lg font-bold text-brand-soft-ink">Welcome! Let's set up in 3 steps</div>
            <ol className="mt-2 space-y-2 text-sm text-brand-soft-ink">
              <li><button className="font-semibold underline" onClick={() => nav('/menu')}>1. Add your menu & prices</button></li>
              <li><button className="font-semibold underline" onClick={() => nav('/money?tab=fixed')}>2. Add rent, EMIs and salaries</button></li>
              <li><button className="font-semibold underline" onClick={() => nav('/settings')}>3. Set delivery charge, UPI ID and cloud backup</button></li>
            </ol>
            <div className="mt-2 text-xs text-brand-soft-ink">Everything works without internet. You can start selling right away.</div>
          </Card>
        )}

        {backupDue && (
          <button onClick={() => nav('/reports')} className="mb-3 flex w-full items-center gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-left text-sm font-medium text-warn">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="flex-1">Cloud backup is off. {extra?.lastBackup ? `Last backup file ${relativeDay(keyOfLocalDate(new Date(extra.lastBackup))).toLowerCase()}.` : 'No backup file yet.'} Tap to save one.</span>
          </button>
        )}
        {sync.state === 'error' && (
          <button onClick={() => nav('/settings#cloud')} className="mb-3 flex w-full items-center gap-2 rounded-2xl bg-bad-soft px-4 py-3 text-left text-sm font-medium text-bad">
            <AlertTriangle size={18} className="shrink-0" /> Cloud sync has a problem. Your data is safe on the phone. Tap to see.
          </button>
        )}

        <Card onClick={() => nav('/sales')}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-muted">Today's sales</div>
              <div className="tabular text-4xl font-bold text-good">{inr(t?.sales ?? 0)}</div>
            </div>
            <ChevronRight className="mt-1 text-muted" />
          </div>
          <div className="tabular mt-1 text-sm text-muted">
            {t?.orders ?? 0} orders · Cash {inr(t?.cashIn ?? 0)} · Online {inr(t?.onlineIn ?? 0)}
            {t?.delivery ? ` · ${t.delivery} delivery` : ''}
          </div>
          {lastWeek && lastWeek.sales > 0 && (
            <div className={clsx('mt-1 text-xs font-semibold', (t?.sales ?? 0) >= lastWeek.sales ? 'text-good' : 'text-muted')}>
              Same day last week: {inr(lastWeek.sales)}
              {yesterday ? ` · yesterday ${inr(yesterday.sales)}` : ''}
            </div>
          )}
        </Card>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Card className="!p-3" onClick={() => nav('/money')}>
            <div className="text-xs text-muted">Today's profit</div>
            <div className={clsx('tabular text-xl font-bold', profit >= 0 ? 'text-good' : 'text-bad')}>{inr(profit)}</div>
            <div className="text-[11px] text-muted">after stock, spends & fixed costs</div>
          </Card>
          <Card className="!p-3" onClick={() => nav('/cash')}>
            <div className="text-xs text-muted">{extra?.session ? 'Cash in drawer (expected)' : 'Cash today (in − out)'}</div>
            <div className="tabular text-xl font-bold">{inr(expectedCash)}</div>
            <div className="text-[11px] text-muted">{extra?.session ? `opened with ${inr(extra.session.opening)}` : 'tap to count the drawer'}</div>
          </Card>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <Quick icon={<ShoppingCart />} label="Sale" onClick={() => nav('/sell')} primary />
          <Quick icon={<ShoppingBasket />} label="Purchase" onClick={() => setBuy(true)} />
          <Quick icon={<ReceiptIndianRupee />} label="Expense" onClick={() => setSpend(true)} />
          <Quick icon={<PackageOpen />} label="Finished" onClick={() => setFin(true)} />
        </div>

        {extra && extra.rewards.length > 0 && (
          <>
            <SectionTitle>Rewards waiting</SectionTitle>
            <Card className="!p-0">
              {extra.rewards.slice(0, 5).map((r) => (
                <button key={r.id} onClick={() => nav(`/customers/${r.customerId}`)} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0">
                  <Gift size={18} className="text-brand" />
                  <span className="min-w-0 flex-1 truncate">
                    <b>{extra.customers.get(r.customerId)}</b> · {r.rewardLabel}
                  </span>
                </button>
              ))}
              <div className="px-4 pb-3 text-xs text-muted">You'll be reminded at checkout when they come next.</div>
            </Card>
          </>
        )}

        <SectionTitle>Keep an eye on</SectionTitle>
        <div className="space-y-2">
          {extra && (
            <Line
              icon={<Flame size={18} />}
              onClick={() => nav('/gas')}
              title={extra.gas.inUse ? `Gas running ${Math.floor(extra.gas.currentDays ?? 0)} days` : 'No gas cylinder connected'}
              sub={`${extra.gas.spares.length} spare${extra.gas.avgLifeDays ? ` · usually lasts ${Math.round(extra.gas.avgLifeDays)} days` : ''}`}
              badge={extra.gas.warnNoSpare ? <Badge tone="warn">Buy spare</Badge> : undefined}
            />
          )}
          <Line icon={<ShoppingBasket size={18} />} onClick={() => nav('/stock?tab=list')} title={extra?.toBuy ? `${extra.toBuy} item${extra.toBuy === 1 ? '' : 's'} to buy` : 'Shopping list is empty'} sub="Items marked finished" />
          {(credit ?? 0) > 0 && <Line icon={<HandCoins size={18} />} onClick={() => nav('/credit')} title={`${inr(credit!)} udhaar to collect`} sub="Customers who paid less" />}
          {due.slice(0, 4).map(({ r, o }) => (
            <Line
              key={r.id + o.date}
              icon={<CalendarClock size={18} />}
              onClick={() => nav('/money?tab=fixed')}
              title={`${r.name} · ${inr(o.amount - o.paid)}`}
              sub={o.status === 'overdue' ? `Was due ${relativeDay(o.date, today).toLowerCase()}` : `Due ${relativeDay(o.date, today).toLowerCase()}`}
              badge={o.status === 'overdue' ? <Badge tone="bad">Overdue</Badge> : <Badge tone="warn">Due</Badge>}
            />
          ))}
          {extra && extra.recurring.length === 0 && (
            <Line icon={<Wallet size={18} />} onClick={() => nav('/money?tab=fixed')} title="Add rent, EMI, salary" sub="To see your real profit" badge={<Plus size={18} />} />
          )}
        </div>
        <div className="mt-6">
          <Button variant="ghost" block onClick={() => nav('/calendar')}>
            See every day on the calendar →
          </Button>
        </div>
      </div>

      <PurchaseSheet open={buy} onClose={() => setBuy(false)} />
      <ExpenseSheet open={spend} onClose={() => setSpend(false)} />
      <FinishedSheet open={fin} onClose={() => setFin(false)} />
    </div>
  )
}

function Quick({ icon, label, onClick, primary }: { icon: ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} className={clsx('flex flex-col items-center gap-1.5 rounded-3xl py-3 text-xs font-semibold active:scale-95', primary ? 'bg-brand text-brand-ink' : 'border border-line bg-surface')}>
      {icon}
      {label}
    </button>
  )
}

function Line({ icon, title, sub, onClick, badge }: { icon: ReactNode; title: string; sub?: string; onClick: () => void; badge?: ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left active:bg-surface-2">
      <span className="text-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {sub && <span className="block truncate text-xs text-muted">{sub}</span>}
      </span>
      {badge}
    </button>
  )
}
