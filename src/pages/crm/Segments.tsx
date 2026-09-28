import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone, Plus, Trash2, Users } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { guestStats, inSegment } from '../../lib/selectors'
import { inrC, uid } from '../../lib/utils'
import { Avatar, Badge, Card, Field, Modal, PageHeader } from '../../components/admin/ui'
import type { Segment, SegmentRule } from '../../types'

const FIELDS: { v: SegmentRule['field']; label: string; ops: SegmentRule['op'][]; input: 'tier' | 'number' | 'text' | 'bool' }[] = [
  { v: 'tier', label: 'Loyalty tier', ops: ['is'], input: 'tier' },
  { v: 'stays', label: 'Number of stays', ops: ['gte'], input: 'number' },
  { v: 'spend', label: 'Lifetime spend (₹)', ops: ['gte'], input: 'number' },
  { v: 'tag', label: 'Has tag', ops: ['has'], input: 'text' },
  { v: 'country', label: 'Country', ops: ['is'], input: 'text' },
  { v: 'lastStayDays', label: 'Days since last stay ≥', ops: ['gte'], input: 'number' },
  { v: 'optIn', label: 'Marketing opt-in', ops: ['is'], input: 'bool' },
]

export default function Segments() {
  const { segments, guests, bookings, saveSegment } = useStore()
  const nav = useNavigate()
  const stats = useMemo(() => guestStats(bookings), [bookings])
  const [sel, setSel] = useState(segments[0]?.id)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Segment>({ id: '', name: '', description: '', rules: [{ field: 'stays', op: 'gte', value: 2 }], color: '#1F4E5A' })
  const members = (s: Segment) => guests.filter((g) => inSegment(s, g, stats.get(g.id)))
  const current = segments.find((s) => s.id === sel)
  const curMembers = current ? members(current) : []
  const draftCount = members(draft).length

  return (
    <div className="space-y-6">
      <PageHeader title="Segments" sub="Dynamic audiences that update as guests book, stay and engage" actions={<button onClick={() => { setDraft({ id: '', name: '', description: '', rules: [{ field: 'stays', op: 'gte', value: 2 }], color: '#1F4E5A' }); setOpen(true) }} className="a-btn"><Plus size={14} /> New segment</button>} />
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-3">
          {segments.map((s) => {
            const m = members(s)
            return (
              <button key={s.id} onClick={() => setSel(s.id)} className={`panel block w-full p-4 text-left transition ${sel === s.id ? 'ring-2 ring-peacock' : 'hover:shadow-md'}`}>
                <div className="flex items-center justify-between"><p className="flex items-center gap-2 font-semibold dark:text-ivory"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.name}</p><Badge><Users size={11} /> {m.length}</Badge></div>
                <p className="mt-1 text-xs text-stone">{s.description}</p>
              </button>
            )
          })}
        </div>
        {current && (
          <Card title={current.name} actions={<button onClick={() => nav(`/admin/crm/campaigns?segment=${current.id}`)} className="a-btn py-1.5 text-xs"><Megaphone size={13} /> Create campaign</button>} pad={false}>
            <div className="flex flex-wrap gap-2 border-b border-kohl/5 p-4 dark:border-white/5">
              {current.rules.map((r, i) => <Badge key={i} className="bg-peacock/10 text-peacock dark:text-[#9fd0dc]">{FIELDS.find((f) => f.v === r.field)?.label} {r.op === 'gte' ? '≥' : r.op} {String(r.value)}</Badge>)}
              <span className="ml-auto text-sm text-stone">{curMembers.length} guests · {inrC(curMembers.reduce((a, g) => a + (stats.get(g.id)?.spend ?? 0), 0))} lifetime value</span>
            </div>
            <ul className="max-h-[560px] divide-y divide-kohl/5 overflow-y-auto dark:divide-white/5">
              {curMembers.slice(0, 60).map((g) => (
                <li key={g.id} className="flex items-center gap-3 px-5 py-2.5 text-sm dark:text-sand">
                  <Avatar name={`${g.firstName} ${g.lastName}`} size={28} />
                  <span className="flex-1"><b className="font-medium dark:text-ivory">{g.firstName} {g.lastName}</b><span className="block text-xs text-stone">{g.email}</span></span>
                  <span className="text-xs text-stone">{g.tier} · {stats.get(g.id)?.stays ?? 0} stays</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Build a segment">
        <div className="space-y-3">
          <Field label="Name"><input className="a-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Lapsed Gold members" /></Field>
          <Field label="Description"><input className="a-input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          <p className="pt-2 text-xs font-medium text-stone">Guests matching ALL of these rules</p>
          {draft.rules.map((r, i) => {
            const f = FIELDS.find((x) => x.v === r.field)!
            const set = (p: Partial<SegmentRule>) => setDraft({ ...draft, rules: draft.rules.map((x, j) => (j === i ? { ...x, ...p } : x)) })
            return (
              <div key={i} className="flex gap-2">
                <select className="a-input" value={r.field} onChange={(e) => { const nf = FIELDS.find((x) => x.v === e.target.value)!; set({ field: nf.v, op: nf.ops[0], value: nf.input === 'number' ? 1 : nf.input === 'bool' ? true : nf.input === 'tier' ? 'Gold' : '' }) }}>{FIELDS.map((x) => <option key={x.v} value={x.v}>{x.label}</option>)}</select>
                {f.input === 'tier' ? <select className="a-input" value={String(r.value)} onChange={(e) => set({ value: e.target.value })}>{['Member', 'Silver', 'Gold', 'Platinum', 'Maharaja'].map((t) => <option key={t}>{t}</option>)}</select>
                  : f.input === 'bool' ? <select className="a-input" value={String(r.value)} onChange={(e) => set({ value: e.target.value === 'true' })}><option value="true">Yes</option><option value="false">No</option></select>
                  : <input className="a-input" type={f.input === 'number' ? 'number' : 'text'} value={String(r.value)} onChange={(e) => set({ value: f.input === 'number' ? Number(e.target.value) : e.target.value })} />}
                <button onClick={() => setDraft({ ...draft, rules: draft.rules.filter((_, j) => j !== i) })} className="a-btn-ghost px-2" aria-label="Remove rule"><Trash2 size={14} /></button>
              </div>
            )
          })}
          <button onClick={() => setDraft({ ...draft, rules: [...draft.rules, { field: 'tier', op: 'is', value: 'Gold' }] })} className="text-sm text-peacock">+ Add rule</button>
          <p className="rounded-lg bg-peacock/10 p-3 text-sm text-peacock dark:text-[#9fd0dc]">{draftCount} guests match right now</p>
        </div>
        <div className="mt-5 flex justify-end gap-2"><button onClick={() => setOpen(false)} className="a-btn-ghost">Cancel</button><button disabled={!draft.name} onClick={() => { const id = uid('seg-'); saveSegment({ ...draft, id }); setSel(id); setOpen(false) }} className="a-btn">Save segment</button></div>
      </Modal>
    </div>
  )
}
