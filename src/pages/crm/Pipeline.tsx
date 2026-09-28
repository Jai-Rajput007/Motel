import { useMemo, useState } from 'react'
import { CalendarDays, FileText, Plus, Users } from 'lucide-react'
import clsx from 'clsx'
import { HOTELS, hotelById } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { useScoped } from '../../lib/hooks'
import { addDaysISO, fmtDate, inr, inrC, todayISO } from '../../lib/utils'
import { Avatar, Badge, Drawer, Field, Modal, PageHeader, Stat } from '../../components/admin/ui'
import type { Lead, LeadStage } from '../../types'

const STAGES: LeadStage[] = ['New', 'Contacted', 'Site Visit', 'Proposal', 'Negotiation', 'Won', 'Lost']
const PROB: Record<LeadStage, number> = { New: 0.1, Contacted: 0.2, 'Site Visit': 0.4, Proposal: 0.55, Negotiation: 0.75, Won: 1, Lost: 0 }
const typeColor: Record<string, string> = { Wedding: 'bg-sindoor/10 text-sindoor', MICE: 'bg-peacock/10 text-peacock', Corporate: 'bg-kohl/5 text-stone', Group: 'bg-gold/15 text-[#8a6a36]', Social: 'bg-leaf/15 text-leaf' }

export default function Pipeline() {
  const { leads } = useScoped()
  const { moveLead, updateLead, addLead } = useStore()
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<LeadStage | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [proposal, setProposal] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [type, setType] = useState('All')
  const [nl, setNl] = useState({ name: '', email: '', phone: '', type: 'Wedding' as Lead['type'], hotelId: HOTELS[1].id, guests: 200, value: 5000000, eventDate: addDaysISO(todayISO(), 120) })
  const list = useMemo(() => leads.filter((l) => type === 'All' || l.type === type), [leads, type])
  const lead = leads.find((l) => l.id === open)
  const openPipe = list.filter((l) => l.stage !== 'Won' && l.stage !== 'Lost')
  const weighted = openPipe.reduce((a, l) => a + l.value * PROB[l.stage], 0)
  const won = list.filter((l) => l.stage === 'Won')
  const closed = list.filter((l) => l.stage === 'Won' || l.stage === 'Lost').length

  return (
    <div className="space-y-6">
      <PageHeader title="Sales Pipeline" sub="Weddings, MICE and group business — drag cards between stages" actions={
        <>
          <select className="a-input w-auto" value={type} onChange={(e) => setType(e.target.value)}>{['All', 'Wedding', 'MICE', 'Corporate', 'Group', 'Social'].map((t) => <option key={t}>{t}</option>)}</select>
          <button onClick={() => setNewOpen(true)} className="a-btn"><Plus size={14} /> New lead</button>
        </>
      } />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open pipeline" value={inrC(openPipe.reduce((a, l) => a + l.value, 0))} hint={`${openPipe.length} opportunities`} />
        <Stat label="Weighted forecast" value={inrC(weighted)} tone="gold" />
        <Stat label="Won (all time)" value={inrC(won.reduce((a, l) => a + l.value, 0))} hint={`${won.length} events`} tone="leaf" />
        <Stat label="Win rate" value={`${Math.round((won.length / Math.max(1, closed)) * 100)}%`} tone="sindoor" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((s) => {
          const col = list.filter((l) => l.stage === s)
          return (
            <div key={s} onDragOver={(e) => { e.preventDefault(); setOver(s) }} onDragLeave={() => setOver(null)} onDrop={() => { if (drag) moveLead(drag, s); setDrag(null); setOver(null) }} className={clsx('flex w-72 shrink-0 flex-col rounded-xl bg-kohl/[0.04] transition dark:bg-white/[0.04]', over === s && 'ring-2 ring-peacock')}>
              <div className="flex items-center justify-between px-3 py-3">
                <p className="text-sm font-semibold dark:text-ivory">{s} <span className="ml-1 text-stone">{col.length}</span></p>
                <span className="text-xs text-stone">{inrC(col.reduce((a, l) => a + l.value, 0))}</span>
              </div>
              <div className="flex-1 space-y-2 px-2 pb-3">
                {col.map((l) => (
                  <div key={l.id} draggable onDragStart={() => setDrag(l.id)} onDragEnd={() => setDrag(null)} onClick={() => setOpen(l.id)} className={clsx('cursor-grab rounded-lg border border-kohl/5 bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing dark:border-white/5 dark:bg-[#1f1d1a]', drag === l.id && 'opacity-40', l.createdAt === todayISO() && 'ring-2 ring-sindoor/60')}>
                    <div className="flex items-start justify-between gap-2"><p className="text-sm font-medium leading-snug dark:text-ivory">{l.name}</p><Badge className={typeColor[l.type]}>{l.type}</Badge></div>
                    {l.company && <p className="text-xs text-stone">{l.company}</p>}
                    <p className="mt-2 text-base font-semibold dark:text-ivory">{inrC(l.value)}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-stone">
                      <span className="flex items-center gap-1"><CalendarDays size={11} /> {fmtDate(l.eventDate, 'd MMM yy')}</span>
                      <span className="flex items-center gap-1"><Users size={11} /> {l.guests}</span>
                      <span>{hotelById(l.hotelId).city}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 border-t border-kohl/5 pt-2 text-[11px] text-stone dark:border-white/5"><Avatar name={l.owner} size={18} /> {l.owner.split(' ')[0]} · {l.source}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Drawer open={!!lead} onClose={() => { setOpen(null); setProposal(false) }} title={lead?.name ?? ''}>
        {lead && !proposal && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap gap-2"><Badge className={typeColor[lead.type]}>{lead.type}</Badge><Badge>{lead.source}</Badge></div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-stone">Estimated value</p><p className="text-xl font-semibold dark:text-ivory">{inr(lead.value)}</p></div>
              <div><p className="text-xs text-stone">Probability</p><p className="text-xl font-semibold dark:text-ivory">{Math.round(PROB[lead.stage] * 100)}%</p></div>
              <div><p className="text-xs text-stone">Event date</p><p className="font-medium dark:text-ivory">{fmtDate(lead.eventDate)}</p></div>
              <div><p className="text-xs text-stone">Guests</p><p className="font-medium dark:text-ivory">{lead.guests}</p></div>
              <div><p className="text-xs text-stone">Venue</p><p className="font-medium dark:text-ivory">{hotelById(lead.hotelId).name}</p></div>
              <div><p className="text-xs text-stone">Contact</p><p className="font-medium dark:text-ivory">{lead.email}<br />{lead.phone}</p></div>
            </div>
            <Field label="Stage"><select className="a-input" value={lead.stage} onChange={(e) => moveLead(lead.id, e.target.value as LeadStage)}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Owner"><select className="a-input" value={lead.owner} onChange={(e) => updateLead(lead.id, { owner: e.target.value })}>{['Radhika Iyer', 'Sameer Khan', 'Anjali Menon'].map((o) => <option key={o}>{o}</option>)}</select></Field>
            <Field label="Notes"><textarea rows={4} className="a-input" value={lead.notes} onChange={(e) => updateLead(lead.id, { notes: e.target.value })} /></Field>
            <button onClick={() => setProposal(true)} className="a-btn w-full"><FileText size={14} /> Generate proposal</button>
          </div>
        )}
        {lead && proposal && (
          <div>
            <button onClick={() => setProposal(false)} className="a-btn-ghost mb-4">← Back</button>
            <div className="bg-white p-8 text-kohl shadow ring-1 ring-kohl/10">
              <p className="text-[10px] uppercase tracking-[0.3em] text-gold">Proposal · {hotelById(lead.hotelId).name}</p>
              <h3 className="mt-2 font-display text-3xl">{lead.type === 'Wedding' ? `The wedding of ${lead.name}` : `${lead.company ?? lead.name} — ${lead.type}`}</h3>
              <p className="mt-2 text-sm text-stone">{fmtDate(lead.eventDate, 'EEEE, d MMMM yyyy')} · {lead.guests} guests</p>
              <table className="mt-6 w-full text-sm"><tbody>
                {[['Venue hire & décor', 0.22], [`Rooms — ${Math.ceil(lead.guests / 2.2)} rooms × 2 nights`, 0.38], ['Food & beverage', 0.3], ['Entertainment & logistics', 0.1]].map(([k, p]) => <tr key={k as string} className="border-b border-kohl/10"><td className="py-2">{k}</td><td className="py-2 text-right">{inr(Math.round((lead.value * (p as number)) / 1000) * 1000)}</td></tr>)}
                <tr><td className="pt-3 font-semibold">Total (excl. GST)</td><td className="pt-3 text-right text-lg font-semibold">{inr(lead.value)}</td></tr>
              </tbody></table>
              <p className="mt-6 text-xs text-stone">Valid for 14 days. 25% deposit confirms dates.</p>
            </div>
            <button onClick={() => { moveLead(lead.id, 'Proposal'); setProposal(false) }} className="a-btn mt-4 w-full">Send proposal & move to “Proposal”</button>
          </div>
        )}
      </Drawer>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New lead">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Field label="Name / couple"><input className="a-input" value={nl.name} onChange={(e) => setNl({ ...nl, name: e.target.value })} /></Field></div>
          <Field label="Email"><input className="a-input" value={nl.email} onChange={(e) => setNl({ ...nl, email: e.target.value })} /></Field>
          <Field label="Phone"><input className="a-input" value={nl.phone} onChange={(e) => setNl({ ...nl, phone: e.target.value })} /></Field>
          <Field label="Type"><select className="a-input" value={nl.type} onChange={(e) => setNl({ ...nl, type: e.target.value as Lead['type'] })}>{['Wedding', 'MICE', 'Corporate', 'Group', 'Social'].map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Property"><select className="a-input" value={nl.hotelId} onChange={(e) => setNl({ ...nl, hotelId: e.target.value })}>{HOTELS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
          <Field label="Guests"><input type="number" className="a-input" value={nl.guests} onChange={(e) => setNl({ ...nl, guests: Number(e.target.value) })} /></Field>
          <Field label="Value ₹"><input type="number" className="a-input" value={nl.value} onChange={(e) => setNl({ ...nl, value: Number(e.target.value) })} /></Field>
          <div className="col-span-2"><Field label="Event date"><input type="date" className="a-input" value={nl.eventDate} onChange={(e) => setNl({ ...nl, eventDate: e.target.value })} /></Field></div>
        </div>
        <div className="mt-5 flex justify-end gap-2"><button onClick={() => setNewOpen(false)} className="a-btn-ghost">Cancel</button><button disabled={!nl.name} onClick={() => { addLead({ ...nl, source: 'Phone enquiry', notes: '' }); setNewOpen(false) }} className="a-btn">Add lead</button></div>
      </Modal>
    </div>
  )
}
