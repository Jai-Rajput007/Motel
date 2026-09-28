import { useMemo, useState } from 'react'
import { Check, Plus, Star, X } from 'lucide-react'
import clsx from 'clsx'
import { HOTELS, hotelById } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { useScoped } from '../../lib/hooks'
import { todayISO } from '../../lib/utils'
import { Avatar, Badge, Card, Field, Modal, PageHeader, Stat, Tabs } from '../../components/admin/ui'
import type { Staff } from '../../types'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SHIFT: Record<string, { label: string; cls: string }> = {
  M: { label: 'Morning 7–15', cls: 'bg-gold/20 text-[#8a6a36] dark:text-gold-2' },
  E: { label: 'Evening 15–23', cls: 'bg-peacock/15 text-peacock dark:text-[#9fd0dc]' },
  N: { label: 'Night 23–7', cls: 'bg-kohl/80 text-ivory' },
  O: { label: 'Off', cls: 'bg-kohl/5 text-stone dark:bg-white/5' },
}
const DEPTS: Staff['department'][] = ['Management', 'Front Office', 'Housekeeping', 'F&B', 'Kitchen', 'Spa', 'Engineering', 'Security', 'Sales']

export default function StaffPage() {
  const { staff, property } = useScoped()
  const { setShift, updateStaff, addStaff } = useStore()
  const [tab, setTab] = useState<'Directory' | 'Shift roster' | 'Attendance & leave'>('Directory')
  const [dept, setDept] = useState('All')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [nf, setNf] = useState({ name: '', role: '', department: 'Front Office' as Staff['department'], hotelId: property === 'all' ? HOTELS[0].id : property, phone: '', email: '' })
  const [leaves, setLeaves] = useState(() => staff.slice(3, 8).map((s, i) => ({ id: s.id, name: s.name, role: s.role, from: `${i + 3} Oct`, to: `${i + 5} Oct`, reason: ['Family wedding', 'Medical', 'Festival travel', 'Personal', 'Exam'][i], status: 'Pending' as 'Pending' | 'Approved' | 'Rejected' })))
  const list = useMemo(() => staff.filter((s) => (dept === 'All' || s.department === dept) && s.name.toLowerCase().includes(q.toLowerCase())), [staff, dept, q])
  const todayKey = DAYS[(new Date().getDay() + 6) % 7]
  const onDuty = staff.filter((s) => s.shift[todayKey] !== 'O' && s.status !== 'On leave')
  const cycle = (v: string) => ({ M: 'E', E: 'N', N: 'O', O: 'M' } as const)[v as 'M']

  return (
    <div className="space-y-6">
      <PageHeader title="Staff & Roster" sub={`${staff.length} team members${property === 'all' ? ' across 6 properties' : ` at ${hotelById(property).name}`}`} actions={<button onClick={() => setOpen(true)} className="a-btn"><Plus size={14} /> Add staff</button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Headcount" value={staff.length} hint={`${new Set(staff.map((s) => s.department)).size} departments`} />
        <Stat label="Rostered today" value={onDuty.length} hint={todayKey} tone="leaf" />
        <Stat label="On leave" value={staff.filter((s) => s.status === 'On leave').length} tone="gold" />
        <Stat label="Avg. guest rating" value={(staff.reduce((a, s) => a + s.rating, 0) / Math.max(1, staff.length)).toFixed(2)} hint="from reviews" tone="sindoor" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs tabs={['Directory', 'Shift roster', 'Attendance & leave'] as const} value={tab} onChange={setTab} />
        {tab !== 'Attendance & leave' && (
          <>
            <select className="a-input w-auto" value={dept} onChange={(e) => setDept(e.target.value)}><option>All</option>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select>
            <input className="a-input w-48" placeholder="Search name…" value={q} onChange={(e) => setQ(e.target.value)} />
          </>
        )}
      </div>

      {tab === 'Directory' && (
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead><tr><th className="a-th">Name</th><th className="a-th">Department</th><th className="a-th">Property</th><th className="a-th">Contact</th><th className="a-th">Rating</th><th className="a-th">Status</th></tr></thead>
              <tbody className="dark:text-sand">
                {list.map((s) => (
                  <tr key={s.id}>
                    <td className="a-td"><div className="flex items-center gap-3"><Avatar name={s.name} size={32} /><div><p className="font-medium dark:text-ivory">{s.name}</p><p className="text-xs text-stone">{s.role}</p></div></div></td>
                    <td className="a-td">{s.department}</td>
                    <td className="a-td">{hotelById(s.hotelId).city}</td>
                    <td className="a-td text-xs text-stone">{s.phone}<br />{s.email}</td>
                    <td className="a-td"><span className="flex items-center gap-1"><Star size={12} className="fill-gold text-gold" /> {s.rating}</span></td>
                    <td className="a-td">
                      <select value={s.status} onChange={(e) => updateStaff(s.id, { status: e.target.value as Staff['status'] })} className={clsx('rounded-full border-0 px-2 py-1 text-xs', s.status === 'On duty' ? 'bg-leaf/15 text-leaf' : s.status === 'On leave' ? 'bg-gold/15 text-[#8a6a36]' : 'bg-kohl/5 text-stone')}>
                        {['On duty', 'Off', 'On leave'].map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'Shift roster' && (
        <Card title="Weekly roster" actions={<div className="hidden gap-2 md:flex">{Object.entries(SHIFT).map(([k, v]) => <span key={k} className={clsx('rounded px-2 py-0.5 text-[11px]', v.cls)}>{k} · {v.label}</span>)}</div>} pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead><tr><th className="a-th">Team member</th>{DAYS.map((d) => <th key={d} className={clsx('a-th text-center', d === todayKey && 'text-sindoor')}>{d}</th>)}<th className="a-th text-center">Hours</th></tr></thead>
              <tbody className="dark:text-sand">
                {list.map((s) => (
                  <tr key={s.id}>
                    <td className="a-td"><p className="font-medium dark:text-ivory">{s.name}</p><p className="text-xs text-stone">{s.role} · {hotelById(s.hotelId).city}</p></td>
                    {DAYS.map((d) => (
                      <td key={d} className="a-td p-1.5 text-center">
                        <button onClick={() => setShift(s.id, d, cycle(s.shift[d]))} className={clsx('w-full rounded-md py-1.5 text-xs font-semibold', SHIFT[s.shift[d]].cls)} title="Click to change shift">{s.shift[d]}</button>
                      </td>
                    ))}
                    <td className="a-td text-center text-sm">{DAYS.filter((d) => s.shift[d] !== 'O').length * 8}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'Attendance & leave' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title={`On duty today (${onDuty.length})`} pad={false}>
            <ul className="max-h-[480px] divide-y divide-kohl/5 overflow-y-auto dark:divide-white/5">
              {onDuty.slice(0, 40).map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-2.5 text-sm dark:text-sand">
                  <Avatar name={s.name} size={28} />
                  <span className="flex-1"><b className="font-medium dark:text-ivory">{s.name}</b><span className="block text-xs text-stone">{s.role} · {hotelById(s.hotelId).city}</span></span>
                  <Badge className={SHIFT[s.shift[todayKey]].cls}>{SHIFT[s.shift[todayKey]].label}</Badge>
                  <span className="w-20 text-right text-xs text-stone">{i % 7 === 3 ? <span className="text-sindoor">Late 12m</span> : `In ${s.shift[todayKey] === 'M' ? '06:5' + (i % 9) : s.shift[todayKey] === 'E' ? '14:5' + (i % 9) : '22:4' + (i % 9)}`}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Leave requests" pad={false}>
            <ul className="divide-y divide-kohl/5 dark:divide-white/5">
              {leaves.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-5 py-3 text-sm dark:text-sand">
                  <Avatar name={l.name} size={30} />
                  <span className="flex-1"><b className="font-medium dark:text-ivory">{l.name}</b><span className="block text-xs text-stone">{l.from} – {l.to} · {l.reason}</span></span>
                  {l.status === 'Pending' ? (
                    <span className="flex gap-1.5">
                      <button onClick={() => setLeaves(leaves.map((x) => x.id === l.id ? { ...x, status: 'Approved' } : x))} className="rounded-lg bg-leaf/15 p-1.5 text-leaf" aria-label="Approve"><Check size={14} /></button>
                      <button onClick={() => setLeaves(leaves.map((x) => x.id === l.id ? { ...x, status: 'Rejected' } : x))} className="rounded-lg bg-sindoor/10 p-1.5 text-sindoor" aria-label="Reject"><X size={14} /></button>
                    </span>
                  ) : <Badge className={l.status === 'Approved' ? 'bg-leaf/15 text-leaf' : 'bg-sindoor/10 text-sindoor'}>{l.status}</Badge>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add team member">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Field label="Full name"><input className="a-input" value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} /></Field></div>
          <Field label="Role"><input className="a-input" value={nf.role} onChange={(e) => setNf({ ...nf, role: e.target.value })} placeholder="Guest Relations" /></Field>
          <Field label="Department"><select className="a-input" value={nf.department} onChange={(e) => setNf({ ...nf, department: e.target.value as Staff['department'] })}>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Property"><select className="a-input" value={nf.hotelId} onChange={(e) => setNf({ ...nf, hotelId: e.target.value })}>{HOTELS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
          <Field label="Phone"><input className="a-input" value={nf.phone} onChange={(e) => setNf({ ...nf, phone: e.target.value })} /></Field>
          <div className="col-span-2"><Field label="Email"><input className="a-input" value={nf.email} onChange={(e) => setNf({ ...nf, email: e.target.value })} /></Field></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className="a-btn-ghost">Cancel</button>
          <button disabled={!nf.name || !nf.role} onClick={() => { addStaff({ ...nf, joined: todayISO(), status: 'On duty', shift: Object.fromEntries(DAYS.map((d, i) => [d, i > 4 ? 'O' : 'M'])) as Staff['shift'], rating: 5, avatar: nf.name }); setOpen(false) }} className="a-btn">Add</button>
        </div>
      </Modal>
    </div>
  )
}
