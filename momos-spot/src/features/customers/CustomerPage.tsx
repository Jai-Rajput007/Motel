import { useLiveQuery } from 'dexie-react-hooks'
import { Gift, MessageCircle, Pencil, Phone } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { mergeCustomers, updateCustomer } from '../../actions/customers'
import { cancelReward, markRewardGiven } from '../../actions/sales'
import { alive, db } from '../../db'
import type { Customer, Sale } from '../../db/types'
import { useToday } from '../../hooks'
import { progress, rewardState, ruleActiveOn } from '../../lib/calc/loyalty'
import { formatDateTime, formatDay, relativeDay, keyOfLocalDate } from '../../lib/dates'
import { nameKey } from '../../lib/ids'
import { inr } from '../../lib/money'
import { shareText } from '../../lib/share'
import { attempt, confirmDialog, toast } from '../../ui/feedback'
import { Badge, Button, Card, Empty, Field, List, Page, Progress, Row, SectionTitle, Stat, TextInput } from '../../ui/kit'
import { Sheet } from '../../ui/Sheet'
import { ReceiveSheet } from '../credit/ReceiveSheet'
import { SaleSheet } from '../sell/SaleSheet'
import { useOffersData } from '../sell/useSellData'

export default function CustomerPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const today = useToday()
  const offers = useOffersData()
  const d = useLiveQuery(async () => {
    const [c, sales, rewards, payments] = await Promise.all([
      db.customers.get(id),
      db.sales.where('customerId').equals(id).toArray(),
      db.rewards.where('customerId').equals(id).toArray(),
      db.creditPayments.where('customerId').equals(id).toArray(),
    ])
    return { c, sales: alive(sales).sort((a, b) => (a.at < b.at ? 1 : -1)), rewards: alive(rewards), payments: alive(payments) }
  }, [id])
  const [edit, setEdit] = useState(false)
  const [merge, setMerge] = useState(false)
  const [receive, setReceive] = useState(false)
  const [sale, setSale] = useState<Sale | null>(null)
  if (!d) return null
  const c = d.c
  if (!c || c.deletedAt)
    return (
      <Page title="Customer" back>
        <Empty title={c?.mergedIntoId ? 'This customer was merged' : 'Customer not found'} action={c?.mergedIntoId ? <Button onClick={() => nav(`/customers/${c.mergedIntoId}`, { replace: true })}>Open merged customer</Button> : undefined} />
      </Page>
    )
  const done = d.sales.filter((s) => s.status === 'done')
  const spent = done.reduce((s, x) => s + x.total, 0)
  const credit = done.reduce((s, x) => s + x.credit, 0) - d.payments.reduce((s, p) => s + p.amount, 0)
  const fav = new Map<string, number>()
  for (const s of done) for (const l of s.lines) if (!l.isReward) fav.set(l.name, (fav.get(l.name) ?? 0) + l.qty)
  const favs = [...fav.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  const rules = (offers?.rules ?? []).filter((r) => ruleActiveOn(r, today))
  const rewards = d.rewards.map((r) => rewardState(r)).sort((a, b) => (a.unlockedAt < b.unlockedAt ? 1 : -1))

  return (
    <Page title={c.name} back actions={<Button size="sm" variant="ghost" icon={<Pencil size={16} />} onClick={() => setEdit(true)}>Edit</Button>}>
      {c.isGuest && <div className="mb-3 rounded-2xl bg-info-soft p-3 text-sm text-info">This is a guest. Tap Edit to give them a name so their visits count for rewards.</div>}
      {c.phone && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <a href={`tel:${c.phone}`} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-semibold">
            <Phone size={18} /> Call
          </a>
          <button onClick={() => void shareText(`Hi ${c.name}! `, c.phone)} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-semibold">
            <MessageCircle size={18} /> WhatsApp
          </button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Visits" value={done.length} />
        <Stat label="Spent" value={inr(spent)} />
        <Stat label="Avg bill" value={inr(done.length ? Math.round(spent / done.length) : 0)} />
      </div>
      <div className="mt-2 text-sm text-muted">
        {done[0] ? `Last visit ${relativeDay(done[0].day, today).toLowerCase()}` : 'No visits yet'}
        {done.length ? ` · first ${formatDay(done[done.length - 1].day, { year: true })}` : ''}
        {favs.length ? ` · loves ${favs.map(([n]) => n).join(', ')}` : ''}
      </div>

      {(credit > 0 || d.payments.length > 0) && (
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted">Udhaar (credit) due</div>
              <div className={`tabular text-2xl font-bold ${credit > 0 ? 'text-bad' : 'text-good'}`}>{inr(Math.max(0, credit))}</div>
            </div>
            {credit > 0 && <Button onClick={() => setReceive(true)}>Receive</Button>}
          </div>
          {credit > 0 && c.phone && (
            <button className="mt-2 text-sm font-semibold text-brand" onClick={() => void shareText(`Hi ${c.name}, a gentle reminder: ${inr(credit)} is pending at The Momos Spot. Thank you! 🙏`, c.phone)}>
              Send reminder on WhatsApp
            </button>
          )}
        </Card>
      )}

      {!c.isGuest && (rules.length > 0 || rewards.length > 0) && (
        <>
          <SectionTitle>Rewards</SectionTitle>
          <div className="space-y-2">
            {rewards
              .filter((r) => r.status === 'waiting' && !r.expired)
              .map((r) => (
                <div key={r.id} className="rounded-2xl border-2 border-brand bg-brand-soft p-3 text-brand-soft-ink">
                  <div className="flex items-center gap-2 font-bold">
                    <Gift size={18} /> {r.rewardLabel}
                  </div>
                  <div className="text-xs">
                    {r.ruleName} · unlocked {formatDateTime(r.unlockedAt)}
                    {r.expiresAt ? ` · valid till ${formatDateTime(r.expiresAt).split(',')[0]}` : ''}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => attempt(async () => { await markRewardGiven(r); toast('Marked as given') })}>Mark given</Button>
                    <Button size="sm" variant="ghost" onClick={async () => (await confirmDialog({ title: 'Cancel this reward?', ok: 'Cancel reward', danger: true })) && attempt(() => cancelReward(r))}>Cancel</Button>
                  </div>
                </div>
              ))}
            {rules.map((rule) => {
              const p = progress(rule, d.sales, d.rewards, { at: new Date().toISOString(), day: today })
              if (p.finished) return null
              return (
                <div key={rule.id} className="rounded-2xl bg-surface-2 p-3">
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-semibold">{rule.name}</span>
                    <span className="text-muted">{p.text}</span>
                  </div>
                  <Progress value={p.current} max={p.target} />
                </div>
              )
            })}
            {rewards
              .filter((r) => r.status !== 'waiting' || r.expired)
              .slice(0, 10)
              .map((r) => (
                <div key={r.id} className="flex items-center justify-between px-1 text-sm text-muted">
                  <span>{r.rewardLabel}</span>
                  <Badge tone={r.status === 'redeemed' ? 'good' : 'neutral'}>{r.expired ? 'Expired' : r.status === 'redeemed' ? `Given ${r.redeemedAt ? formatDay(keyOfLocalDate(new Date(r.redeemedAt))) : ''}` : 'Cancelled'}</Badge>
                </div>
              ))}
          </div>
        </>
      )}

      <SectionTitle>Bills</SectionTitle>
      {d.sales.length === 0 ? (
        <Empty title="No bills yet" />
      ) : (
        <List>
          {d.sales.slice(0, 100).map((s) => (
            <Row
              key={s.id}
              onClick={() => setSale(s)}
              title={<span className={s.status === 'void' ? 'text-muted line-through' : ''}>#{s.billNo} · {formatDay(s.day, { weekday: true })}</span>}
              sub={s.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}
              right={<span className="tabular font-semibold">{inr(s.total)}</span>}
            />
          ))}
        </List>
      )}
      {d.payments.length > 0 && (
        <>
          <SectionTitle>Udhaar payments received</SectionTitle>
          <List>
            {d.payments.map((p) => (
              <Row key={p.id} title={inr(p.amount)} sub={`${formatDateTime(p.at)}${p.note ? ` · ${p.note}` : ''}`} />
            ))}
          </List>
        </>
      )}

      {!c.isGuest && (
        <Button variant="ghost" block className="mt-6 text-muted" onClick={() => setMerge(true)}>
          Same person saved twice? Merge
        </Button>
      )}

      {edit && <EditCustomer c={c} onClose={() => setEdit(false)} />}
      {merge && <MergeSheet c={c} onClose={() => setMerge(false)} />}
      {receive && <ReceiveSheet customer={c} due={credit} onClose={() => setReceive(false)} />}
      {sale && <SaleSheet sale={sale} customer={c} onClose={() => setSale(null)} />}
    </Page>
  )
}

function EditCustomer({ c, onClose }: { c: Customer; onClose: () => void }) {
  const [name, setName] = useState(c.isGuest ? '' : c.name)
  const [phone, setPhone] = useState(c.phone ?? '')
  const [note, setNote] = useState(c.note ?? '')
  return (
    <Sheet open onClose={onClose} title={c.isGuest ? `Name guest ${c.guestCode}` : 'Edit customer'} footer={<Button block onClick={async () => { if (await attempt(() => updateCustomer(c, { name, phone, note }))) { toast('Saved'); onClose() } }}>Save</Button>}>
      <Field label="Name">
        <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Phone">
        <TextInput inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label="Note">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. likes extra chutney" />
      </Field>
    </Sheet>
  )
}

function MergeSheet({ c, onClose }: { c: Customer; onClose: () => void }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const all = useLiveQuery(async () => alive(await db.customers.toArray()).filter((x) => !x.isGuest && x.id !== c.id), [c.id]) ?? []
  const k = nameKey(q || c.name.split(' ')[0])
  const list = all.filter((x) => x.nameKey.includes(k)).slice(0, 20)
  return (
    <Sheet open onClose={onClose} title={`Merge ${c.name} into…`} subtitle="All bills, rewards and udhaar move to the customer you pick.">
      <TextInput placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3" />
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {list.map((x) => (
          <button
            key={x.id}
            className="block w-full px-4 py-3 text-left active:bg-surface-2"
            onClick={async () => {
              if (!(await confirmDialog({ title: `Merge into ${x.name}?`, body: `${c.name} will be removed and everything moves to ${x.name}.`, ok: 'Merge' }))) return
              if (await attempt(() => mergeCustomers(c.id, x.id))) {
                toast('Merged')
                nav(`/customers/${x.id}`, { replace: true })
              }
            }}
          >
            <div className="font-medium">{x.name}</div>
            {x.phone && <div className="text-sm text-muted">{x.phone}</div>}
          </button>
        ))}
        {list.length === 0 && <div className="p-4 text-sm text-muted">No matching customers.</div>}
      </div>
    </Sheet>
  )
}
