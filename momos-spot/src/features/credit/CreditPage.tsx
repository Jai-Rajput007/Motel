import { HandCoins } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Customer } from '../../db/types'
import { useToday } from '../../hooks'
import { relativeDay } from '../../lib/dates'
import { inr } from '../../lib/money'
import { shareText } from '../../lib/share'
import { Button, Card, Empty, List, Page, Row } from '../../ui/kit'
import { useCustomerStats } from '../sell/useSellData'
import { ReceiveSheet } from './ReceiveSheet'

export default function CreditPage() {
  const cs = useCustomerStats()
  const nav = useNavigate()
  const today = useToday()
  const [rec, setRec] = useState<{ c: Customer; due: number } | null>(null)
  if (!cs) return null
  const due = cs.customers.map((c) => ({ c, s: cs.stats.get(c.id) })).filter((x) => (x.s?.credit ?? 0) > 0).sort((a, b) => b.s!.credit - a.s!.credit)
  const total = due.reduce((s, x) => s + x.s!.credit, 0)
  return (
    <Page title="Udhaar (credit)" back>
      <Card>
        <div className="text-sm text-muted">Total to collect</div>
        <div className="tabular text-3xl font-bold text-bad">{inr(total)}</div>
        <div className="text-sm text-muted">{due.length} customer{due.length === 1 ? '' : 's'}</div>
      </Card>
      <div className="mt-4">
        {due.length === 0 ? (
          <Empty icon={<HandCoins size={34} />} title="Nobody owes you money">When a customer pays less, choose “Add to udhaar” at checkout.</Empty>
        ) : (
          <List>
            {due.map(({ c, s }) => (
              <div key={c.id} className="flex items-center gap-2 pr-3">
                <div className="min-w-0 flex-1">
                  <Row onClick={() => nav(`/customers/${c.id}`)} title={c.name} sub={`${inr(s!.credit)} due${s!.lastDay ? ` · last visit ${relativeDay(s!.lastDay, today).toLowerCase()}` : ''}`} />
                </div>
                {c.phone && (
                  <Button size="sm" variant="ghost" onClick={() => void shareText(`Hi ${c.name}, a gentle reminder: ${inr(s!.credit)} is pending at The Momos Spot. Thank you! 🙏`, c.phone)}>
                    Remind
                  </Button>
                )}
                <Button size="sm" variant="soft" onClick={() => setRec({ c, due: s!.credit })}>
                  Receive
                </Button>
              </div>
            ))}
          </List>
        )}
      </div>
      {rec && <ReceiveSheet customer={rec.c} due={rec.due} onClose={() => setRec(null)} />}
    </Page>
  )
}
