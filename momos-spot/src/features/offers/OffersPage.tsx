import { useLiveQuery } from 'dexie-react-hooks'
import { Gift, Megaphone, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { alive, db } from '../../db'
import type { LoyaltyRule, OfferNote, RewardType, TriggerType } from '../../db/types'
import { remove, save } from '../../db/write'
import { useToday } from '../../hooks'
import { rewardLabel, triggerText } from '../../lib/calc/loyalty'
import { formatDay, keyOfLocalDate } from '../../lib/dates'
import { uid } from '../../lib/ids'
import { attempt, confirmDialog, toast } from '../../ui/feedback'
import { AmountInput, Badge, Button, Chip, DateInput, Empty, Field, List, NumberInput, Page, Row, SectionTitle, Segmented, Select, TextArea, TextInput, Toggle } from '../../ui/kit'
import { Sheet } from '../../ui/Sheet'
import { UserError } from '../../actions/common'
import { useMenu } from '../sell/useSellData'

export default function OffersPage() {
  const today = useToday()
  const menu = useMenu()
  const data = useLiveQuery(async () => {
    const [rules, notes, rewards] = await Promise.all([db.loyaltyRules.toArray(), db.offerNotes.toArray(), db.rewards.toArray()])
    return { rules: alive(rules), notes: alive(notes), rewards: alive(rewards) }
  }, [])
  const [rule, setRule] = useState<LoyaltyRule | 'new' | null>(null)
  const [note, setNote] = useState<OfferNote | 'new' | null>(null)
  if (!data || !menu) return null
  return (
    <Page title="Offers & loyalty" back>
      <p className="mb-4 text-sm text-muted">
        Set rules like “every 5th order, a free plate”. When a named customer completes a rule, you see a popup. On their <b>next visit</b> the app reminds you to give the reward.
      </p>
      <Button block icon={<Plus size={18} />} onClick={() => setRule('new')}>
        New loyalty offer
      </Button>

      <SectionTitle>Loyalty offers</SectionTitle>
      {data.rules.length === 0 ? (
        <Empty icon={<Gift size={34} />} title="No loyalty offers yet">Create one to reward customers who keep coming back.</Empty>
      ) : (
        <List>
          {data.rules.map((r) => {
            const rw = data.rewards.filter((x) => x.ruleId === r.id)
            return (
              <Row
                key={r.id}
                onClick={() => setRule(r)}
                title={
                  <span className="flex items-center gap-2">
                    {r.name} {!r.active && <Badge>Off</Badge>}
                    {r.endsOn && r.endsOn < today && <Badge>Ended</Badge>}
                  </span>
                }
                sub={`${triggerText(r)} → ${rewardLabel(r, menu.all)}`}
                right={
                  <div className="text-right text-xs text-muted">
                    <div>{rw.filter((x) => x.status !== 'cancelled').length} unlocked</div>
                    <div>{rw.filter((x) => x.status === 'redeemed').length} given</div>
                  </div>
                }
              />
            )
          })}
        </List>
      )}

      <SectionTitle action={<button className="text-sm font-semibold text-brand" onClick={() => setNote('new')}>+ Add</button>}>Offer reminders (shop-wide)</SectionTitle>
      {data.notes.length === 0 ? (
        <Empty icon={<Megaphone size={30} />} title="No offer reminders">Note down festival combos or weekly deals. Active ones show on the Sell screen so you don't forget.</Empty>
      ) : (
        <List>
          {data.notes.map((n) => {
            const active = (!n.startsOn || n.startsOn <= today) && (!n.endsOn || n.endsOn >= today)
            return (
              <Row
                key={n.id}
                onClick={() => setNote(n)}
                title={<span className="flex items-center gap-2">{n.title} {active ? <Badge tone="good">Active</Badge> : <Badge>{n.endsOn && n.endsOn < today ? 'Ended' : 'Upcoming'}</Badge>}</span>}
                sub={`${n.startsOn ? formatDay(n.startsOn) : 'Any time'}${n.endsOn ? ` – ${formatDay(n.endsOn)}` : ''}${n.details ? ` · ${n.details}` : ''}`}
              />
            )
          })}
        </List>
      )}
      {rule && <RuleSheet rule={rule === 'new' ? null : rule} onClose={() => setRule(null)} />}
      {note && <NoteSheet note={note === 'new' ? null : note} onClose={() => setNote(null)} />}
    </Page>
  )
}

type Draft = Omit<LoyaltyRule, 'id' | 'createdAt' | 'updatedAt'>
const blank = (): Draft => ({ name: '', trigger: 'every_n', n: 5, rewardType: 'free_item', rewardQty: 1, repeat: true, active: true })

const TEMPLATES: { label: string; d: Partial<Draft> }[] = [
  { label: '6th order: free plate', d: { name: '6th plate free', trigger: 'every_n', n: 5, rewardType: 'free_item', repeat: true } },
  { label: '5 orders in 30 days: 10% off', d: { name: 'Regular 10% off', trigger: 'n_in_days', n: 5, days: 30, rewardType: 'percent', rewardValue: 10, repeat: true } },
  { label: '7 days in a row: free drink', d: { name: '7-day streak', trigger: 'streak', n: 7, rewardType: 'text', rewardText: 'Free cold drink', repeat: true } },
  { label: 'Spend ₹2,000: ₹100 off', d: { name: 'Big fan ₹100 off', trigger: 'spend', spend: 200000, rewardType: 'flat', rewardValue: 10000, repeat: true } },
]

function RuleSheet({ rule, onClose }: { rule: LoyaltyRule | null; onClose: () => void }) {
  const menu = useMenu()
  const [d, setD] = useState<Draft>(rule ?? blank())
  const [limit, setLimit] = useState(!!(rule?.startsOn || rule?.endsOn))
  useEffect(() => {
    setD(rule ?? blank())
  }, [rule])
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))
  const item = menu?.all.find((m) => m.id === d.rewardMenuItemId)

  const submit = async () => {
    const ok = await attempt(async () => {
      if (!d.name.trim()) throw new UserError('Give the offer a name.')
      if (d.trigger === 'spend' ? !(d.spend && d.spend > 0) : !(d.n >= 1)) throw new UserError('Set the target.')
      if (d.trigger === 'n_in_days' && !(d.days && d.days >= 1)) throw new UserError('Set the number of days.')
      if (d.rewardType === 'free_item' && !d.rewardMenuItemId) throw new UserError('Pick the free item.')
      if (d.rewardType === 'percent' && !(d.rewardValue && d.rewardValue > 0 && d.rewardValue <= 100)) throw new UserError('Discount % must be 1–100.')
      if (d.rewardType === 'flat' && !(d.rewardValue && d.rewardValue > 0)) throw new UserError('Enter the discount amount.')
      if (d.rewardType === 'text' && !d.rewardText?.trim()) throw new UserError('Describe the gift.')
      await save<LoyaltyRule>('loyaltyRules', {
        ...(rule ?? {}),
        ...d,
        id: rule?.id ?? uid(),
        name: d.name.trim(),
        startsOn: limit ? d.startsOn : undefined,
        endsOn: limit ? d.endsOn : undefined,
      } as LoyaltyRule)
    })
    if (ok) {
      toast(rule ? 'Offer updated' : 'Offer created')
      onClose()
    }
  }

  const nLabel = d.trigger === 'streak' ? 'Days in a row' : 'Number of orders'
  return (
    <Sheet
      open
      onClose={onClose}
      tall
      title={rule ? 'Edit loyalty offer' : 'New loyalty offer'}
      footer={
        <div className="flex gap-2">
          {rule && (
            <Button
              variant="secondary"
              className="text-bad"
              onClick={async () => {
                if (!(await confirmDialog({ title: 'Delete this offer?', body: 'Rewards already unlocked stay with customers.', ok: 'Delete', danger: true }))) return
                if (await attempt(() => remove('loyaltyRules', rule.id))) onClose()
              }}
            >
              Delete
            </Button>
          )}
          <Button className="flex-1" onClick={submit}>
            Save offer
          </Button>
        </div>
      }
    >
      {!rule && (
        <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5">
          {TEMPLATES.map((t) => (
            <Chip key={t.label} onClick={() => setD({ ...blank(), ...t.d })}>
              {t.label}
            </Chip>
          ))}
        </div>
      )}
      <Field label="Offer name">
        <TextInput value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. 6th plate free" />
      </Field>

      <div className="mb-2 text-sm font-semibold">When does a customer earn it?</div>
      <Select<TriggerType>
        value={d.trigger}
        onChange={(v) => set({ trigger: v })}
        options={[
          { value: 'every_n', label: 'After a number of orders' },
          { value: 'n_in_days', label: 'Orders within some days' },
          { value: 'streak', label: 'Orders on days in a row' },
          { value: 'spend', label: 'Total spend reaches an amount' },
        ]}
      />
      <div className="mt-3 flex gap-3">
        {d.trigger !== 'spend' ? (
          <Field label={nLabel}>
            <NumberInput value={d.n} onChange={(v) => set({ n: v ?? 0 })} decimals={false} />
          </Field>
        ) : (
          <Field label="Spend target">
            <AmountInput value={d.spend ?? null} onChange={(p) => set({ spend: p ?? undefined })} />
          </Field>
        )}
        {d.trigger === 'n_in_days' && (
          <Field label="Within days">
            <NumberInput value={d.days ?? null} onChange={(v) => set({ days: v ?? undefined })} decimals={false} />
          </Field>
        )}
      </div>
      <Field label="Only count bills of at least (optional)">
        <AmountInput value={d.minBill ?? null} onChange={(p) => set({ minBill: p ?? undefined })} placeholder="Any bill" />
      </Field>
      <div className="mb-4 rounded-2xl bg-surface-2 p-3 text-sm">
        <b>{triggerText(d)}</b>
        {d.trigger === 'every_n' && d.n ? ` → reward on their visit after the ${d.n}th order` : ''}
      </div>

      <div className="mb-2 text-sm font-semibold">What do they get?</div>
      <Segmented<RewardType>
        className="mb-3"
        value={d.rewardType}
        onChange={(v) => set({ rewardType: v })}
        options={[{ value: 'free_item', label: 'Free item' }, { value: 'percent', label: '% off' }, { value: 'flat', label: '₹ off' }, { value: 'text', label: 'Gift' }]}
      />
      {d.rewardType === 'free_item' && menu && (
        <>
          <Field label="Free item">
            <Select
              value={d.rewardMenuItemId ?? ''}
              onChange={(v) => set({ rewardMenuItemId: v || undefined, rewardVariantId: menu.all.find((m) => m.id === v)?.variants[0]?.id })}
              options={[{ value: '', label: 'Choose…' }, ...menu.items.map((m) => ({ value: m.id, label: m.name }))]}
            />
          </Field>
          {item && item.variants.length > 0 && (
            <Field label="Size">
              <Select value={d.rewardVariantId ?? item.variants[0].id} onChange={(v) => set({ rewardVariantId: v })} options={item.variants.map((v) => ({ value: v.id, label: v.name }))} />
            </Field>
          )}
          <Field label="How many">
            <NumberInput value={d.rewardQty ?? 1} onChange={(v) => set({ rewardQty: v ?? 1 })} decimals={false} />
          </Field>
        </>
      )}
      {d.rewardType === 'percent' && (
        <Field label="Discount %">
          <NumberInput value={d.rewardValue ?? null} onChange={(v) => set({ rewardValue: v ?? undefined })} decimals={false} />
        </Field>
      )}
      {d.rewardType === 'flat' && (
        <Field label="Discount amount">
          <AmountInput value={d.rewardValue ?? null} onChange={(p) => set({ rewardValue: p ?? undefined })} />
        </Field>
      )}
      {d.rewardType === 'text' && (
        <Field label="Gift / offer">
          <TextInput value={d.rewardText ?? ''} onChange={(e) => set({ rewardText: e.target.value })} placeholder="e.g. Free cold drink, keychain" />
        </Field>
      )}

      <Toggle checked={d.repeat} onChange={(v) => set({ repeat: v })} label="Repeat" sub={d.repeat ? 'They can earn it again and again' : 'Only once per customer'} />
      <Field label="Reward valid for (days, optional)" hint="Leave empty to never expire">
        <NumberInput value={d.expiryDays ?? null} onChange={(v) => set({ expiryDays: v ?? undefined })} decimals={false} placeholder="Never expires" />
      </Field>
      <Toggle checked={limit} onChange={setLimit} label="Only between certain dates" />
      {limit && (
        <div className="flex gap-3">
          <Field label="From">
            <DateInput value={d.startsOn ?? keyOfLocalDate(new Date())} onChange={(v) => set({ startsOn: v })} />
          </Field>
          <Field label="To">
            <DateInput value={d.endsOn ?? keyOfLocalDate(new Date(Date.now() + 30 * 86400_000))} onChange={(v) => set({ endsOn: v })} />
          </Field>
        </div>
      )}
      <Toggle checked={d.active} onChange={(v) => set({ active: v })} label="Offer is on" />
    </Sheet>
  )
}

function NoteSheet({ note, onClose }: { note: OfferNote | null; onClose: () => void }) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [details, setDetails] = useState(note?.details ?? '')
  const [from, setFrom] = useState(note?.startsOn ?? '')
  const [to, setTo] = useState(note?.endsOn ?? '')
  const [show, setShow] = useState(note?.showOnSell ?? true)
  return (
    <Sheet
      open
      onClose={onClose}
      title={note ? 'Edit offer reminder' : 'New offer reminder'}
      footer={
        <div className="flex gap-2">
          {note && (
            <Button variant="secondary" className="text-bad" onClick={async () => { if (await attempt(() => remove('offerNotes', note.id))) onClose() }}>
              Delete
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={async () => {
              const ok = await attempt(async () => {
                if (!title.trim()) throw new UserError('Enter a title.')
                if (from && to && to < from) throw new UserError('End date is before the start date.')
                await save<OfferNote>('offerNotes', { ...(note ?? {}), id: note?.id ?? uid(), title: title.trim(), details: details.trim() || undefined, startsOn: from || undefined, endsOn: to || undefined, showOnSell: show } as OfferNote)
              })
              if (ok) onClose()
            }}
          >
            Save
          </Button>
        </div>
      }
    >
      <Field label="Title">
        <TextInput autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali combo ₹199" />
      </Field>
      <Field label="Details">
        <TextArea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What is included, who gets it" />
      </Field>
      <div className="flex gap-3">
        <Field label="From (optional)">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="min-h-12 w-full rounded-2xl border border-line bg-surface px-3" />
        </Field>
        <Field label="To (optional)">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="min-h-12 w-full rounded-2xl border border-line bg-surface px-3" />
        </Field>
      </div>
      <Toggle checked={show} onChange={setShow} label="Show on the Sell screen while active" />
    </Sheet>
  )
}
