import { useState } from 'react'
import { CheckCircle2, Smartphone, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { HOTELS, hotelById, roomTypeById } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { hkColor } from '../../lib/selectors'
import { todayISO } from '../../lib/utils'
import { Badge, Card, Modal, PageHeader, Stat, Tabs } from '../../components/admin/ui'
import type { HKStatus, Room } from '../../types'

const STATUSES: HKStatus[] = ['dirty', 'clean', 'inspected', 'out-of-order']

export default function Housekeeping() {
  const { property, rooms, bookings, staff, setRoomHK, addTicket } = useStore()
  const [local, setLocal] = useState(property === 'all' ? HOTELS[0].id : property)
  const hotelId = property === 'all' ? local : property
  const [filter, setFilter] = useState<'All' | 'Dirty' | 'Clean' | 'Inspected'>('All')
  const [sel, setSel] = useState<Room | null>(null)
  const [mobile, setMobile] = useState(false)
  const T = todayISO()
  const hRooms = rooms.filter((r) => r.hotelId === hotelId)
  const attendants = staff.filter((s) => s.hotelId === hotelId && s.department === 'Housekeeping')
  const occ = (r: Room) => bookings.find((b) => b.hotelId === r.hotelId && b.roomNo === r.number && b.status === 'checked-in')
  const arriving = (r: Room) => bookings.find((b) => b.hotelId === r.hotelId && b.roomNo === r.number && b.checkIn === T && b.status === 'confirmed')
  const floors = Array.from(new Set(hRooms.map((r) => r.floor))).sort((a, b) => a - b)
  const shown = (r: Room) => filter === 'All' || r.hk === filter.toLowerCase()
  const myTasks = hRooms.filter((r) => r.hk === 'dirty' || (r.hk === 'clean' && arriving(r)))

  return (
    <div className="space-y-6">
      <PageHeader title="Housekeeping" sub={hotelById(hotelId).name} actions={
        <>
          {property === 'all' && <select className="a-input w-auto" value={local} onChange={(e) => setLocal(e.target.value)}>{HOTELS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>}
          <button onClick={() => setMobile(!mobile)} className={clsx(mobile ? 'a-btn' : 'a-btn-ghost')}><Smartphone size={14} /> Attendant app</button>
        </>
      } />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Dirty" value={hRooms.filter((r) => r.hk === 'dirty').length} hint={`${hRooms.filter((r) => r.hk === 'dirty' && arriving(r)).length} with arrivals today`} tone="sindoor" />
        <Stat label="Clean" value={hRooms.filter((r) => r.hk === 'clean').length} hint="awaiting inspection" />
        <Stat label="Inspected" value={hRooms.filter((r) => r.hk === 'inspected').length} hint="ready to sell" tone="leaf" />
        <Stat label="Out of order" value={hRooms.filter((r) => r.hk === 'out-of-order').length} hint="maintenance" tone="gold" />
      </div>

      {mobile ? (
        <div className="mx-auto w-[360px] rounded-[36px] border-[10px] border-kohl bg-ivory p-4 shadow-2xl dark:bg-[#1a1816]">
          <div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold dark:text-ivory">My rooms today</p><Badge>{myTasks.length} tasks</Badge></div>
          <ul className="max-h-[520px] space-y-2 overflow-y-auto">
            {myTasks.map((r) => (
              <li key={r.id} className="rounded-xl bg-white p-3 shadow-sm dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <div><p className="text-lg font-semibold dark:text-ivory">{r.number}</p><p className="text-xs text-stone">{roomTypeById(r.roomTypeId).name}{arriving(r) && ' · arrival today'}{occ(r) && ' · occupied'}</p></div>
                  <Badge className={hkColor[r.hk]}>{r.hk}</Badge>
                </div>
                <div className="mt-2 flex gap-2">
                  {r.hk === 'dirty' && <button onClick={() => setRoomHK(r.id, 'clean')} className="a-btn flex-1 py-1.5 text-xs"><Sparkles size={13} /> Mark clean</button>}
                  {r.hk === 'clean' && <button onClick={() => setRoomHK(r.id, 'inspected')} className="a-btn flex-1 bg-leaf py-1.5 text-xs hover:bg-leaf/90"><CheckCircle2 size={13} /> Inspected</button>}
                </div>
              </li>
            ))}
            {!myTasks.length && <li className="p-6 text-center text-sm text-stone">All rooms are ready. Shabash!</li>}
          </ul>
        </div>
      ) : (
        <Card title={<Tabs tabs={['All', 'Dirty', 'Clean', 'Inspected'] as const} value={filter} onChange={setFilter} />} actions={<span className="text-xs text-stone">Click a room to update</span>}>
          <div className="space-y-5">
            {floors.map((f) => (
              <div key={f}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone">Floor {f}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7 xl:grid-cols-10">
                  {hRooms.filter((r) => r.floor === f && shown(r)).map((r) => (
                    <button key={r.id} onClick={() => setSel(r)} className={clsx('rounded-lg border p-2.5 text-left transition hover:shadow-md', hkColor[r.hk])}>
                      <p className="text-base font-semibold">{r.number}</p>
                      <p className="truncate text-[10px] opacity-80">{roomTypeById(r.roomTypeId).name}</p>
                      <p className="mt-1 flex gap-1 text-[10px]">{occ(r) && <span className="rounded bg-kohl/10 px-1">OCC</span>}{arriving(r) && <span className="rounded bg-sindoor px-1 text-white">ARR</span>}{r.attendant && <span className="truncate opacity-70">{r.attendant.split(' ')[0]}</span>}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `Room ${sel.number} · ${roomTypeById(sel.roomTypeId).name}` : ''}>
        {sel && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-medium text-stone">Status</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map((s) => <button key={s} onClick={() => { setRoomHK(sel.id, s); setSel({ ...sel, hk: s }) }} className={clsx('rounded-lg border px-3 py-2 text-sm capitalize', sel.hk === s ? hkColor[s] + ' font-semibold' : 'border-kohl/10 dark:border-white/10')}>{s}</button>)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-stone">Assign attendant</p>
              <select className="a-input" value={sel.attendant ?? ''} onChange={(e) => { setRoomHK(sel.id, sel.hk, e.target.value); setSel({ ...sel, attendant: e.target.value }) }}>
                <option value="">Unassigned</option>
                {attendants.map((a) => <option key={a.id} value={a.name}>{a.name} · {a.role}</option>)}
              </select>
            </div>
            <button onClick={() => { addTicket({ hotelId: sel.hotelId, roomNo: sel.number, title: 'Reported by housekeeping', category: 'Other', priority: 'Medium', assignee: 'Mohan (Engg.)' }); setSel(null) }} className="a-btn-ghost w-full">Report maintenance issue</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
