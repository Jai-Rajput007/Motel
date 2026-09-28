import { useState } from 'react'
import { Plus } from 'lucide-react'
import clsx from 'clsx'
import { HOTELS, hotelById } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { useScoped } from '../../lib/hooks'
import { fmtDate } from '../../lib/utils'
import { Badge, Card, Field, Modal, PageHeader, Stat } from '../../components/admin/ui'
import type { Ticket } from '../../types'

const prio: Record<string, string> = { Low: 'bg-kohl/5 text-stone', Medium: 'bg-peacock/10 text-peacock', High: 'bg-gold/15 text-[#8a6a36]', Urgent: 'bg-sindoor/10 text-sindoor' }

export default function Maintenance() {
  const { tickets, property } = useScoped()
  const { updateTicket, addTicket, rooms, setRoomHK } = useStore()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ hotelId: property === 'all' ? HOTELS[0].id : property, roomNo: '', title: '', category: 'Plumbing' as Ticket['category'], priority: 'Medium' as Ticket['priority'], assignee: 'Mohan (Engg.)', ooo: false })
  const cols: Ticket['status'][] = ['Open', 'In Progress', 'Resolved']
  return (
    <div className="space-y-6">
      <PageHeader title="Maintenance" sub="Engineering tickets linked to rooms" actions={<button onClick={() => setOpen(true)} className="a-btn"><Plus size={14} /> New ticket</button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open" value={tickets.filter((t) => t.status === 'Open').length} tone="sindoor" />
        <Stat label="In progress" value={tickets.filter((t) => t.status === 'In Progress').length} tone="gold" />
        <Stat label="Resolved" value={tickets.filter((t) => t.status === 'Resolved').length} tone="leaf" />
        <Stat label="Avg. resolution" value="3.4 h" hint="last 30 days" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {cols.map((c) => (
          <Card key={c} title={`${c} (${tickets.filter((t) => t.status === c).length})`} pad={false}>
            <ul className="space-y-2 p-3">
              {tickets.filter((t) => t.status === c).map((t) => (
                <li key={t.id} className="rounded-lg border border-kohl/10 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-sand">
                  <div className="flex items-start justify-between gap-2"><p className="font-medium dark:text-ivory">{t.title}</p><Badge className={prio[t.priority]}>{t.priority}</Badge></div>
                  <p className="mt-1 text-xs text-stone">{t.id} · Room {t.roomNo} · {hotelById(t.hotelId).city} · {t.category}</p>
                  <p className="text-xs text-stone">{t.assignee} · {fmtDate(t.createdAt, 'd MMM')}</p>
                  <div className="mt-2 flex gap-1.5">
                    {cols.filter((x) => x !== c).map((x) => (
                      <button key={x} onClick={() => { updateTicket(t.id, { status: x }); if (x === 'Resolved') { const r = rooms.find((r) => r.hotelId === t.hotelId && r.number === t.roomNo && r.hk === 'out-of-order'); if (r) setRoomHK(r.id, 'dirty') } }} className={clsx('rounded-md border border-kohl/10 px-2 py-1 text-[11px] hover:bg-kohl/5 dark:border-white/10', x === 'Resolved' && 'text-leaf')}>→ {x}</button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="New maintenance ticket">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Property"><select className="a-input" value={f.hotelId} onChange={(e) => setF({ ...f, hotelId: e.target.value })}>{HOTELS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
          <Field label="Room"><select className="a-input" value={f.roomNo} onChange={(e) => setF({ ...f, roomNo: e.target.value })}><option value="">Select</option>{rooms.filter((r) => r.hotelId === f.hotelId).map((r) => <option key={r.id}>{r.number}</option>)}</select></Field>
          <div className="col-span-2"><Field label="Issue"><input className="a-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. AC not cooling" /></Field></div>
          <Field label="Category"><select className="a-input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Ticket['category'] })}>{['Plumbing', 'Electrical', 'HVAC', 'Furniture', 'IT', 'Other'].map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Priority"><select className="a-input" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Ticket['priority'] })}>{['Low', 'Medium', 'High', 'Urgent'].map((c) => <option key={c}>{c}</option>)}</select></Field>
          <label className="col-span-2 flex items-center gap-2 text-sm dark:text-sand"><input type="checkbox" checked={f.ooo} onChange={(e) => setF({ ...f, ooo: e.target.checked })} /> Take room out of order (blocks it from sale)</label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className="a-btn-ghost">Cancel</button>
          <button disabled={!f.roomNo || !f.title} onClick={() => { addTicket({ hotelId: f.hotelId, roomNo: f.roomNo, title: f.title, category: f.category, priority: f.priority, assignee: f.assignee }); if (f.ooo) { const r = rooms.find((r) => r.hotelId === f.hotelId && r.number === f.roomNo); if (r) setRoomHK(r.id, 'out-of-order') } setOpen(false) }} className="a-btn">Create ticket</button>
        </div>
      </Modal>
    </div>
  )
}
