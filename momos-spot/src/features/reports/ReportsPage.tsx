import { Capacitor } from '@capacitor/core'
import { useLiveQuery } from 'dexie-react-hooks'
import { FileJson, FileSpreadsheet, Printer, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { alive, db, getMeta } from '../../db'
import type { Customer, Expense, Item, Purchase, Sale } from '../../db/types'
import { useSettings, useToday } from '../../hooks'
import { downloadBackup, restoreBackup, saveFile, toCSV } from '../../lib/backup'
import { profitOf, summarize, totalOf } from '../../lib/calc/summary'
import { formatDateTime, formatDay, relativeDay, keyOfLocalDate } from '../../lib/dates'
import { inr } from '../../lib/money'
import { attempt, confirmDialog, toast } from '../../ui/feedback'
import { Button, Card, Page, SectionTitle } from '../../ui/kit'
import { RangeChips, rangeFor, rangeLabel, type Range } from '../../ui/RangePicker'

const rs = (p: number) => (p / 100).toFixed(2)

export default function ReportsPage() {
  const today = useToday()
  const settings = useSettings()
  const [range, setRange] = useState<Range>(() => rangeFor('month', today))
  const lastBackup = useLiveQuery(() => getMeta<string | null>('lastBackupAt', null), [])
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const between = <T,>(t: 'sales' | 'purchases' | 'expenses' | 'creditPayments') => db.table(t).where('day').between(range.from, range.to, true, true).toArray() as Promise<T[]>
    const [sales, purchases, expenses, credit, recurring, items, customers, cats, ecats] = await Promise.all([
      between<Sale>('sales'), between<Purchase>('purchases'), between<Expense>('expenses'), between('creditPayments'),
      db.recurring.toArray(), db.items.toArray(), db.customers.toArray(), db.stockCategories.toArray(), db.expenseCategories.toArray(),
    ])
    return {
      sales: alive(sales), purchases: alive(purchases), expenses: alive(expenses), credit: alive(credit as never[]), recurring: alive(recurring),
      items: new Map(items.map((i: Item) => [i.id, i])), customers: new Map(customers.map((c: Customer) => [c.id, c])),
      cats: new Map(cats.map((c) => [c.id, c.name])), ecats: new Map(ecats.map((c) => [c.id, c.name])),
    }
  }
  const tag = `${range.from}_to_${range.to}`

  const exportCSV = (kind: 'sales' | 'items' | 'purchases' | 'expenses' | 'days') =>
    attempt(async () => {
      const d = await load()
      let csv = ''
      if (kind === 'sales')
        csv = toCSV(
          ['Date', 'Time', 'Bill', 'Status', 'Customer', 'Items', 'Delivery', 'Discount', 'Total', 'Cash', 'Online', 'Udhaar', 'Note'],
          d.sales.sort((a, b) => (a.at < b.at ? -1 : 1)).map((s) => [s.day, formatDateTime(s.at), s.billNo, s.status, s.customerId ? d.customers.get(s.customerId)?.name : '', s.lines.map((l) => `${l.qty}x ${l.name}`).join('; '), rs(s.deliveryFee), rs(s.discount), rs(s.total), rs(s.cash), rs(s.online), rs(s.credit), s.voidReason ?? s.note ?? '']),
        )
      if (kind === 'items') {
        const m = new Map<string, { qty: number; rev: number }>()
        for (const s of d.sales) if (s.status === 'done') for (const l of s.lines) { const x = m.get(l.name) ?? { qty: 0, rev: 0 }; x.qty += l.qty; x.rev += l.qty * l.price; m.set(l.name, x) }
        csv = toCSV(['Item', 'Quantity sold', 'Revenue'], [...m.entries()].sort((a, b) => b[1].qty - a[1].qty).map(([n, x]) => [n, x.qty, rs(x.rev)]))
      }
      if (kind === 'purchases')
        csv = toCSV(['Date', 'Time', 'Item', 'Category', 'Qty', 'Unit', 'Price', 'Paid by', 'Vendor', 'Note'], d.purchases.sort((a, b) => (a.at < b.at ? -1 : 1)).map((p) => { const it = d.items.get(p.itemId); return [p.day, formatDateTime(p.at), it?.name, d.cats.get(it?.categoryId ?? ''), p.qty, p.unit, rs(p.amount), p.payMode, p.vendor ?? '', p.note ?? ''] }))
      if (kind === 'expenses')
        csv = toCSV(['Date', 'Name', 'Category', 'Amount', 'Paid by', 'Recurring', 'Remarks'], d.expenses.sort((a, b) => (a.at < b.at ? -1 : 1)).map((e) => [e.day, e.name, d.ecats.get(e.categoryId), rs(e.amount), e.payMode, e.recurringId ? 'yes' : '', e.remarks ?? '']))
      if (kind === 'days') {
        const days = summarize(range.from, range.to, { ...d, creditPayments: d.credit })
        csv = toCSV(['Date', 'Orders', 'Sales', 'Cash in', 'Online in', 'Stock bought', 'Other expenses', 'Fixed costs paid', 'Fixed cost share', 'Profit (spread)', 'Profit (as paid)'], [...days.values()].map((x) => [x.day, x.orders, rs(x.sales), rs(x.cashIn), rs(x.onlineIn), rs(x.purchases), rs(x.expensesOneTime), rs(x.expensesRecurring), rs(Math.round(x.recurringShare)), rs(Math.round(x.profitSpread)), rs(x.profitCash)]))
      }
      const where = await saveFile(`momos-${kind}-${tag}.csv`, '﻿' + csv, 'text/csv')
      toast(`Saved to ${where}. Opens in Excel / Google Sheets.`)
    })

  const printReport = () =>
    attempt(async () => {
      const d = await load()
      const days = [...summarize(range.from, range.to, { ...d, creditPayments: d.credit }).values()]
      const t = totalOf(days)
      const top = new Map<string, number>()
      for (const s of d.sales) if (s.status === 'done') for (const l of s.lines) top.set(l.name, (top.get(l.name) ?? 0) + l.qty)
      const spend = new Map<string, number>()
      for (const p of d.purchases) { const c = d.cats.get(d.items.get(p.itemId)?.categoryId ?? '') ?? 'Stock'; spend.set(c, (spend.get(c) ?? 0) + p.amount) }
      for (const e of d.expenses) { const c = d.ecats.get(e.categoryId) ?? 'Other'; spend.set(c, (spend.get(c) ?? 0) + e.amount) }
      const row = (a: string, b: string) => `<tr><td>${a}</td><td style="text-align:right">${b}</td></tr>`
      const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${settings.shopName} report</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;color:#1f1a17}h1{margin:0}h2{margin-top:24px;font-size:16px;border-bottom:1px solid #ddd;padding-bottom:4px}table{width:100%;border-collapse:collapse;font-size:14px}td{padding:4px 0;border-bottom:1px solid #f0ebe5}.big{font-size:28px;font-weight:700}</style></head><body>
<h1>${settings.shopName}</h1><div>${rangeLabel(range)} · ${formatDay(range.from, { year: true })} – ${formatDay(range.to, { year: true })}</div>
<h2>Summary</h2><table>${row('Sales', inr(t.sales))}${row('Orders', String(t.orders))}${row('Stock bought', inr(t.purchases))}${row('Other expenses', inr(t.expensesOneTime))}${row('Fixed costs (spread)', inr(Math.round(t.recurringShare)))}${row('<b>Profit</b>', `<b>${inr(Math.round(profitOf(t, 'spread')))}</b>`)}${row('Cash received', inr(t.cashIn))}${row('Online received', inr(t.onlineIn))}${row('Udhaar given', inr(t.creditGiven))}</table>
<h2>Spending by category</h2><table>${[...spend.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => row(k, inr(v))).join('')}</table>
<h2>Top items</h2><table>${[...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => row(k, `${v} sold`)).join('')}</table>
<h2>Each day</h2><table>${days.filter((x) => x.orders || x.purchases || x.expensesOneTime).map((x) => row(formatDay(x.day, { weekday: true }), `${inr(x.sales)} · profit ${inr(Math.round(x.profitSpread))}`)).join('')}</table>
<p style="color:#888;font-size:12px;margin-top:24px">Made with The Momos Spot app</p><script>setTimeout(()=>print(),300)</script></body></html>`
      const w = Capacitor.isNativePlatform() ? null : window.open('', '_blank')
      if (w) {
        w.document.write(html)
        w.document.close()
      } else {
        const where = await saveFile(`momos-report-${tag}.html`, html, 'text/html')
        toast(`Report saved to ${where}. Open it in Chrome and use Share → Print → Save as PDF.`, { ms: 7000 })
      }
    })

  return (
    <Page title="Reports & backup" back>
      <SectionTitle>Export for Excel</SectionTitle>
      <RangeChips value={range} onChange={setRange} today={today} />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" icon={<FileSpreadsheet size={18} />} onClick={() => exportCSV('sales')}>Sales</Button>
        <Button variant="secondary" icon={<FileSpreadsheet size={18} />} onClick={() => exportCSV('items')}>Items sold</Button>
        <Button variant="secondary" icon={<FileSpreadsheet size={18} />} onClick={() => exportCSV('purchases')}>Purchases</Button>
        <Button variant="secondary" icon={<FileSpreadsheet size={18} />} onClick={() => exportCSV('expenses')}>Expenses</Button>
        <Button variant="secondary" icon={<FileSpreadsheet size={18} />} onClick={() => exportCSV('days')}>Daily profit</Button>
        <Button variant="soft" icon={<Printer size={18} />} onClick={printReport}>Report / PDF</Button>
      </div>

      <SectionTitle>Backup file</SectionTitle>
      <Card>
        <p className="text-sm text-muted">
          A full copy of everything as one file on this phone. Keep it safe (e.g. send it to yourself on WhatsApp or Google Drive). It can be restored on any phone, even without the cloud.
        </p>
        <div className="mt-2 text-sm">Last backup: <b>{lastBackup ? relativeDay(keyOfLocalDate(new Date(lastBackup))) : 'never'}</b></div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button icon={<FileJson size={18} />} onClick={() => attempt(async () => toast(`Backup saved to ${await downloadBackup()}`))}>Save backup</Button>
          <Button variant="secondary" icon={<Upload size={18} />} onClick={() => fileRef.current?.click()}>Restore</Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            if (!(await confirmDialog({ title: 'Restore this backup?', body: 'It is merged with what is on this phone. Newer entries on the phone are kept.', ok: 'Restore' }))) return
            await attempt(async () => {
              const r = await restoreBackup(await f.text())
              toast(`Restored: ${r.added} added, ${r.updated} updated, ${r.skipped} already up to date`)
            })
          }}
        />
      </Card>
    </Page>
  )
}
