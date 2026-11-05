import { AlertTriangle, Flame, Plug, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { addExistingCylinder, buyGas, connectCylinder, deleteCylinder, markEmpty, updateCylinder } from '../../actions/gas'
import type { Cylinder, CylinderStatus, PayMode } from '../../db/types'
import { useAll } from '../../hooks'
import { gasStats } from '../../lib/calc/gas'
import { formatDateTime, fromLocalInput, toLocalInput } from '../../lib/dates'
import { inr } from '../../lib/money'
import { attempt, confirmDialog, toast } from '../../ui/feedback'
import { AmountInput, Badge, Button, Card, Empty, Field, List, NumberInput, Page, Progress, Row, SectionTitle, Segmented, Stat, TextInput, Toggle, WhenField, resolveWhen, whenNow, type When } from '../../ui/kit'
import { Sheet } from '../../ui/Sheet'

const days = (n: number | null) => (n === null ? '—' : `${n < 10 ? n.toFixed(1).replace(/\.0$/, '') : Math.round(n)} day${Math.round(n) === 1 ? '' : 's'}`)

export default function GasPage() {
  const cylinders = useAll<Cylinder>('cylinders')
  const [buy, setBuy] = useState(false)
  const [connect, setConnect] = useState(false)
  const [existing, setExisting] = useState(false)
  const [edit, setEdit] = useState<Cylinder | null>(null)
  if (!cylinders) return null
  const st = gasStats(cylinders)
  const history = [...cylinders].sort((a, b) => ((b.connectedAt ?? b.boughtAt) > (a.connectedAt ?? a.boughtAt) ? 1 : -1))

  return (
    <Page title="Gas" back>
      {st.warnNoSpare && (
        <div className="mb-3 flex items-start gap-2 rounded-2xl bg-warn-soft p-3 text-sm font-medium text-warn">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          {st.inUse && st.daysLeft !== null
            ? `No spare cylinder. The current one may finish in about ${days(Math.max(0, st.daysLeft))}.`
            : 'No spare cylinder in stock. Buy one so you are not caught without gas.'}
        </div>
      )}

      <Card>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-ink">
            <Flame size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted">Cylinder in use</div>
            <div className="text-lg font-bold">{st.inUse ? `Running ${days(st.currentDays)}` : 'None connected'}</div>
            {st.inUse?.connectedAt && <div className="text-xs text-muted">Connected {formatDateTime(st.inUse.connectedAt)}</div>}
          </div>
        </div>
        {st.inUse && st.avgLifeDays && (
          <div className="mt-3">
            <Progress value={st.currentDays ?? 0} max={st.avgLifeDays} tone={st.daysLeft !== null && st.daysLeft <= 2 ? 'bad' : 'brand'} />
            <div className="mt-1.5 flex justify-between text-xs text-muted">
              <span>Usually lasts {days(st.avgLifeDays)}</span>
              {st.predictedEmptyAt && <span>Likely empty ~{formatDateTime(st.predictedEmptyAt).split(',')[0]}</span>}
            </div>
          </div>
        )}
      </Card>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Spares" value={st.spares.length} />
        <Stat label="Avg price" value={st.avgPrice ? inr(Math.round(st.avgPrice)) : '—'} />
        <Stat label="Gas per day" value={st.costPerDay ? inr(Math.round(st.costPerDay)) : '—'} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button size="lg" icon={<ShoppingCart size={20} />} onClick={() => setBuy(true)}>
          Bought gas
        </Button>
        <Button size="lg" variant="secondary" icon={<Plug size={20} />} onClick={() => setConnect(true)} disabled={st.spares.length === 0}>
          Connect new
        </Button>
      </div>
      {st.inUse && (
        <Button
          block
          variant="ghost"
          className="mt-2"
          onClick={async () => {
            if (!(await confirmDialog({ title: 'Mark the current cylinder empty now?', ok: 'Mark empty' }))) return
            if (await attempt(() => markEmpty(st.inUse!.id, new Date().toISOString()))) toast('Marked empty')
          }}
        >
          Current cylinder is empty
        </Button>
      )}

      <SectionTitle action={<button className="text-sm font-semibold text-brand" onClick={() => setExisting(true)}>+ Already have one</button>}>
        All cylinders
      </SectionTitle>
      {history.length === 0 ? (
        <Empty icon={<Flame size={34} />} title="No cylinders yet">
          Tap <b>Bought gas</b> when you buy one. Then tap <b>Connect new</b> on the day you start using it. Both dates show on the calendar.
        </Empty>
      ) : (
        <List>
          {history.map((c) => {
            const life = c.connectedAt && c.emptiedAt ? (new Date(c.emptiedAt).getTime() - new Date(c.connectedAt).getTime()) / 86400_000 : null
            return (
              <Row
                key={c.id}
                onClick={() => setEdit(c)}
                title={
                  <span className="flex items-center gap-2">
                    {inr(c.price)} <StatusBadge s={c.status} />
                  </span>
                }
                sub={
                  c.status === 'in_stock'
                    ? `Bought ${formatDateTime(c.boughtAt)}`
                    : c.status === 'in_use'
                      ? `Connected ${formatDateTime(c.connectedAt!)}`
                      : `Connected ${c.connectedAt ? formatDateTime(c.connectedAt) : '—'} · lasted ${days(life)}`
                }
              />
            )
          })}
        </List>
      )}

      <BuySheet open={buy} onClose={() => setBuy(false)} />
      <ConnectSheet open={connect} onClose={() => setConnect(false)} spares={st.spares} hasCurrent={!!st.inUse} />
      <ExistingSheet open={existing} onClose={() => setExisting(false)} />
      {edit && <EditCylinder c={edit} onClose={() => setEdit(null)} />}
    </Page>
  )
}

function StatusBadge({ s }: { s: CylinderStatus }) {
  return s === 'in_use' ? <Badge tone="brand">In use</Badge> : s === 'in_stock' ? <Badge tone="good">Spare</Badge> : <Badge>Empty</Badge>
}

function BuySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [count, setCount] = useState<number | null>(1)
  const [total, setTotal] = useState<number | null>(null)
  const [payMode, setPayMode] = useState<PayMode>('cash')
  const [when, setWhen] = useState<When>(whenNow())
  const [supplier, setSupplier] = useState('')
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Bought gas"
      subtitle="Counts as a stock purchase. Connect it later when you start using it."
      footer={
        <Button
          block
          onClick={async () => {
            const ok = await attempt(() => buyGas({ count: count ?? 0, total: total ?? 0, at: resolveWhen(when), payMode, supplier }))
            if (ok) {
              toast(`${count} cylinder${count === 1 ? '' : 's'} added as spare`)
              setTotal(null)
              onClose()
            }
          }}
        >
          Save
        </Button>
      }
    >
      <div className="flex gap-3">
        <Field label="Cylinders">
          <NumberInput value={count} onChange={setCount} decimals={false} className="w-24" />
        </Field>
        <Field label="Total price">
          <AmountInput value={total} onChange={setTotal} autoFocus />
        </Field>
      </div>
      <Field label="Paid by">
        <Segmented value={payMode} onChange={setPayMode} options={[{ value: 'cash', label: 'Cash' }, { value: 'online', label: 'Online' }]} />
      </Field>
      <WhenField value={when} onChange={setWhen} label="Bought just now" />
      <Field label="Supplier (optional)">
        <TextInput value={supplier} onChange={(e) => setSupplier(e.target.value)} />
      </Field>
    </Sheet>
  )
}

function ConnectSheet({ open, onClose, spares, hasCurrent }: { open: boolean; onClose: () => void; spares: Cylinder[]; hasCurrent: boolean }) {
  const [pick, setPick] = useState<string>('')
  const [when, setWhen] = useState<When>(whenNow())
  const [emptyPrev, setEmptyPrev] = useState(true)
  const chosen = pick || spares[0]?.id
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Connect a new cylinder"
      footer={
        <Button
          block
          disabled={!chosen}
          onClick={async () => {
            const ok = await attempt(() => connectCylinder(chosen!, resolveWhen(when), emptyPrev))
            if (ok) {
              toast('New cylinder connected')
              onClose()
            }
          }}
        >
          Connect
        </Button>
      }
    >
      {spares.length > 1 && (
        <Field label="Which spare?">
          <div className="space-y-2">
            {spares.map((c) => (
              <button key={c.id} onClick={() => setPick(c.id)} className={`w-full rounded-2xl border p-3 text-left ${chosen === c.id ? 'border-brand bg-brand-soft' : 'border-line'}`}>
                {inr(c.price)} · bought {formatDateTime(c.boughtAt)}
              </button>
            ))}
          </div>
        </Field>
      )}
      <WhenField value={when} onChange={setWhen} label="Connected just now" />
      {hasCurrent && <Toggle checked={emptyPrev} onChange={setEmptyPrev} label="Mark the old cylinder empty at the same time" />}
    </Sheet>
  )
}

function ExistingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [inUse, setInUse] = useState(true)
  const [when, setWhen] = useState<When>(whenNow())
  const [price, setPrice] = useState<number | null>(null)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="A cylinder you already have"
      subtitle="For cylinders bought before you started using this app. It is not counted as a purchase."
      footer={
        <Button
          block
          onClick={async () => {
            if (await attempt(() => addExistingCylinder({ inUse, at: resolveWhen(when), price: price ?? 0 }))) {
              toast('Cylinder added')
              onClose()
            }
          }}
        >
          Add
        </Button>
      }
    >
      <Field label="It is">
        <Segmented value={inUse ? 'use' : 'spare'} onChange={(v) => setInUse(v === 'use')} options={[{ value: 'use', label: 'In use now' }, { value: 'spare', label: 'A spare' }]} />
      </Field>
      <WhenField value={when} onChange={setWhen} label={inUse ? 'Connected just now' : 'Got it just now'} />
      <Field label="Price (optional)" hint="Used for the average gas price">
        <AmountInput value={price} onChange={setPrice} />
      </Field>
    </Sheet>
  )
}

function EditCylinder({ c, onClose }: { c: Cylinder; onClose: () => void }) {
  const [status, setStatus] = useState<CylinderStatus>(c.status)
  const [con, setCon] = useState(c.connectedAt ? toLocalInput(c.connectedAt) : '')
  const [emp, setEmp] = useState(c.emptiedAt ? toLocalInput(c.emptiedAt) : '')
  const cls = 'w-full min-h-12 rounded-2xl border border-line bg-surface px-4'
  return (
    <Sheet
      open
      onClose={onClose}
      title="Fix cylinder dates"
      subtitle={`${inr(c.price)} · bought ${formatDateTime(c.boughtAt)}`}
      footer={
        <div className="flex gap-2">
          {!c.purchaseId && (
            <Button
              variant="secondary"
              className="text-bad"
              onClick={async () => {
                if (await attempt(() => deleteCylinder(c))) onClose()
              }}
            >
              Delete
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={async () => {
              const ok = await attempt(() =>
                updateCylinder(c, { status, connectedAt: fromLocalInput(con) ?? undefined, emptiedAt: fromLocalInput(emp) ?? undefined }),
              )
              if (ok) {
                toast('Saved')
                onClose()
              }
            }}
          >
            Save
          </Button>
        </div>
      }
    >
      <Field label="Status">
        <Segmented value={status} onChange={setStatus} options={[{ value: 'in_stock', label: 'Spare' }, { value: 'in_use', label: 'In use' }, { value: 'empty', label: 'Empty' }]} />
      </Field>
      {status !== 'in_stock' && (
        <Field label="Connected on">
          <input type="datetime-local" className={cls} value={con} onChange={(e) => setCon(e.target.value)} />
        </Field>
      )}
      {status === 'empty' && (
        <Field label="Became empty on">
          <input type="datetime-local" className={cls} value={emp} onChange={(e) => setEmp(e.target.value)} />
        </Field>
      )}
      {c.purchaseId && <p className="text-xs text-muted">Price and purchase date are changed from the purchase in Stock → Purchases.</p>}
    </Sheet>
  )
}
