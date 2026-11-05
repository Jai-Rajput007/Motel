import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { closeDay, openDay } from '../../actions/money'
import { alive, db } from '../../db'
import { useSettings, useToday } from '../../hooks'
import { formatDateTime, formatDay } from '../../lib/dates'
import { inr } from '../../lib/money'
import { shareText } from '../../lib/share'
import { attempt, toast } from '../../ui/feedback'
import { AmountInput, Button, Card, DateInput, Field, List, Page, Row, SectionTitle, TextInput } from '../../ui/kit'
import { useRangeData } from '../calendar/useRangeData'

export default function CashPage() {
  const today = useToday()
  const settings = useSettings()
  const [day, setDay] = useState(today)
  const data = useRangeData(day, day, settings.dayCutoffHour)
  const sessions = useLiveQuery(async () => alive(await db.cashSessions.toArray()).sort((a, b) => (a.day < b.day ? 1 : -1)), [])
  const session = sessions?.find((s) => s.day === day)
  const prevClosed = sessions?.find((s) => s.day < day && s.counted !== undefined)
  const [opening, setOpening] = useState<number | null>(null)
  const [counted, setCounted] = useState<number | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    setOpening(session?.opening ?? prevClosed?.counted ?? null)
    setCounted(session?.counted ?? null)
    setNote(session?.note ?? '')
  }, [session?.id, session?.updatedAt, prevClosed?.id, day]) // eslint-disable-line react-hooks/exhaustive-deps

  const s = data?.days.get(day)
  if (!s) return null
  const cashIn = s.cashIn + s.creditCollectedCash
  const cashOut = s.purchasesCash + s.expensesCash
  const expected = (opening ?? 0) + cashIn - cashOut
  const diff = counted !== null ? counted - expected : null

  const summary = () =>
    [
      `*${settings.shopName}* · ${formatDay(day, { weekday: true })}`,
      `Sales: ${inr(s.sales)} (${s.orders} orders)`,
      `Cash ${inr(s.cashIn)} · Online ${inr(s.onlineIn)}`,
      s.creditGiven ? `Udhaar given: ${inr(s.creditGiven)}` : '',
      `Spent: ${inr(s.purchases + s.expensesOneTime + s.expensesRecurring)}`,
      `Cash in drawer: expected ${inr(expected)}${counted !== null ? `, counted ${inr(counted)}` : ''}`,
    ]
      .filter(Boolean)
      .join('\n')

  return (
    <Page title="Cash drawer" back>
      <p className="mb-3 text-sm text-muted">Optional. Count the cash at the start and end of the day to catch mistakes.</p>
      <Field label="Day">
        <DateInput value={day} onChange={setDay} max={today} />
      </Field>
      <Card>
        <Field label="Opening cash" hint={prevClosed?.counted !== undefined && !session ? `From the closing count on ${formatDay(prevClosed.day)}` : undefined}>
          <AmountInput value={opening} onChange={setOpening} />
        </Field>
        <div className="tabular space-y-1 text-sm">
          <div className="flex justify-between"><span>+ Cash from sales</span><span>{inr(s.cashIn)}</span></div>
          {s.creditCollectedCash > 0 && <div className="flex justify-between"><span>+ Udhaar collected (cash)</span><span>{inr(s.creditCollectedCash)}</span></div>}
          <div className="flex justify-between"><span>− Cash spent (stock & expenses)</span><span>{inr(cashOut)}</span></div>
          <div className="flex justify-between border-t border-line pt-1 text-base font-bold"><span>Should be in drawer</span><span>{inr(expected)}</span></div>
        </div>
        {!session && (
          <Button block variant="soft" className="mt-3" onClick={() => attempt(async () => { await openDay(day, opening ?? 0); toast('Day opened') })}>
            Save opening cash
          </Button>
        )}
      </Card>

      <Card className="mt-3">
        <Field label="Counted cash at closing">
          <AmountInput value={counted} onChange={setCounted} big />
        </Field>
        {diff !== null && (
          <div className={clsx('mb-3 rounded-2xl px-4 py-3 text-sm font-semibold', diff === 0 ? 'bg-good-soft text-good' : diff > 0 ? 'bg-info-soft text-info' : 'bg-bad-soft text-bad')}>
            {diff === 0 ? 'Matches exactly ✓' : diff > 0 ? `${inr(diff)} extra in the drawer` : `${inr(-diff)} short in the drawer`}
          </div>
        )}
        <Field label="Note">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. gave ₹200 to helper" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" icon={<Send size={16} />} onClick={() => void shareText(summary())}>
            Share summary
          </Button>
          <Button
            onClick={() =>
              attempt(async () => {
                if (!session) await openDay(day, opening ?? 0)
                await closeDay(day, counted ?? 0, note)
                toast('Day closed')
              })
            }
            disabled={counted === null}
          >
            Close day
          </Button>
        </div>
        {session?.closedAt && <div className="mt-2 text-xs text-muted">Closed {formatDateTime(session.closedAt)}</div>}
      </Card>

      {sessions && sessions.length > 0 && (
        <>
          <SectionTitle>Past days</SectionTitle>
          <List>
            {sessions.slice(0, 60).map((x) => (
              <Row key={x.id} onClick={() => setDay(x.day)} title={formatDay(x.day, { weekday: true })} sub={`Opened ${inr(x.opening)}${x.counted !== undefined ? ` · counted ${inr(x.counted)}` : ' · not closed'}`} right={x.note ? <span className="text-xs text-muted">{x.note}</span> : undefined} />
            ))}
          </List>
        </>
      )}
    </Page>
  )
}
