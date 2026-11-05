import { Gift, Search, Users } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { alive, db } from '../../db'
import { useToday } from '../../hooks'
import { usableRewards } from '../../lib/calc/loyalty'
import { diffDays, relativeDay } from '../../lib/dates'
import { nameKey } from '../../lib/ids'
import { inr } from '../../lib/money'
import { shareText } from '../../lib/share'
import { Badge, Chip, ChipRow, Empty, List, Page, Row, TextInput } from '../../ui/kit'
import { useCustomerStats } from '../sell/useSellData'

type Filter = 'regular' | 'all' | 'reward' | 'credit' | 'inactive' | 'guest'

export default function CustomersPage() {
  const nav = useNavigate()
  const today = useToday()
  const cs = useCustomerStats()
  const rewards = useLiveQuery(async () => usableRewards(alive(await db.rewards.where('status').equals('waiting').toArray())), [])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('regular')
  const withReward = useMemo(() => new Set((rewards ?? []).map((r) => r.customerId)), [rewards])

  if (!cs) return null
  const k = nameKey(q)
  const st = (id: string) => cs.stats.get(id) ?? { visits: 0, spent: 0, credit: 0 }
  let list = cs.customers.filter((c) => !c.mergedIntoId)
  if (k) list = list.filter((c) => c.nameKey.includes(k) || c.phone?.includes(q.replace(/\D/g, '') || '@@') || c.guestCode?.toLowerCase() === k)
  else
    list = list.filter((c) => {
      const s = st(c.id)
      switch (filter) {
        case 'regular':
          return !c.isGuest && s.visits >= 1
        case 'all':
          return !c.isGuest
        case 'guest':
          return c.isGuest
        case 'reward':
          return withReward.has(c.id)
        case 'credit':
          return s.credit > 0
        case 'inactive':
          return !c.isGuest && s.visits >= 3 && !!s.lastDay && diffDays(s.lastDay, today) >= 21
      }
    })
  list.sort((a, b) => (filter === 'credit' ? st(b.id).credit - st(a.id).credit : filter === 'all' || filter === 'regular' ? st(b.id).visits - st(a.id).visits : (st(b.id).lastDay ?? '').localeCompare(st(a.id).lastDay ?? '')))
  const totalCredit = cs.customers.reduce((s, c) => s + Math.max(0, st(c.id).credit), 0)

  return (
    <Page title="Customers" back>
      <div className="relative mb-3">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <TextInput placeholder="Name, phone or guest code" value={q} onChange={(e) => setQ(e.target.value)} className="pl-11" />
      </div>
      {!k && (
        <ChipRow>
          <Chip active={filter === 'regular'} onClick={() => setFilter('regular')}>Top customers</Chip>
          <Chip active={filter === 'reward'} onClick={() => setFilter('reward')}>🎁 Reward waiting ({withReward.size})</Chip>
          <Chip active={filter === 'credit'} onClick={() => setFilter('credit')}>Udhaar · {inr(totalCredit)}</Chip>
          <Chip active={filter === 'inactive'} onClick={() => setFilter('inactive')}>Stopped coming</Chip>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All named</Chip>
          <Chip active={filter === 'guest'} onClick={() => setFilter('guest')}>Guests</Chip>
        </ChipRow>
      )}
      {filter === 'inactive' && !k && <p className="mb-3 px-1 text-sm text-muted">Regulars (3+ visits) who have not come for 3 weeks or more. Tap one to send them a message.</p>}
      {list.length === 0 ? (
        <Empty icon={<Users size={34} />} title="No customers here">Customers are added when you type a name while billing.</Empty>
      ) : (
        <List>
          {list.slice(0, 300).map((c) => {
            const s = st(c.id)
            return (
              <Row
                key={c.id}
                onClick={() => nav(`/customers/${c.id}`)}
                title={
                  <span className="flex items-center gap-1.5">
                    {c.name}
                    {withReward.has(c.id) && <Gift size={14} className="text-brand" />}
                  </span>
                }
                sub={`${s.visits} visit${s.visits === 1 ? '' : 's'} · ${inr(s.spent)}${s.lastDay ? ` · ${relativeDay(s.lastDay, today).toLowerCase()}` : ''}`}
                right={
                  s.credit > 0 ? (
                    <Badge tone="warn">Due {inr(s.credit)}</Badge>
                  ) : filter === 'inactive' && c.phone ? (
                    <button
                      className="rounded-full bg-good-soft px-3 py-1 text-xs font-semibold text-good"
                      onClick={(e) => {
                        e.stopPropagation()
                        void shareText(`Hi ${c.name}! We miss you at The Momos Spot 🥟 Come by for your favourite momos soon!`, c.phone)
                      }}
                    >
                      Message
                    </button>
                  ) : undefined
                }
              />
            )
          })}
        </List>
      )}
    </Page>
  )
}
