import { useState } from 'react'
import { Check, Minus } from 'lucide-react'
import { HOTELS } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { Card, Field, PageHeader, Tabs } from '../../components/admin/ui'

const MODULES = ['Dashboard', 'Front Desk', 'Reservations', 'Billing', 'Housekeeping', 'Inventory', 'Staff', 'Rates', 'Reports', 'CRM']
const MATRIX: Record<string, string[]> = {
  Owner: MODULES,
  'General Manager': MODULES,
  'Front Desk': ['Dashboard', 'Front Desk', 'Reservations', 'Billing', 'Housekeeping', 'CRM'],
  Housekeeping: ['Dashboard', 'Housekeeping', 'Inventory'],
  'Sales & CRM': ['Dashboard', 'Reservations', 'Reports', 'CRM'],
}

export default function SettingsPage() {
  const { audit, resetDemo } = useStore()
  const [tab, setTab] = useState<'Property' | 'Taxes & policies' | 'Users & roles' | 'Audit log'>('Property')
  const [saved, setSaved] = useState(false)
  const h = HOTELS[0]
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" sub="Property configuration, policies, access control and audit trail" />
      <Tabs tabs={['Property', 'Taxes & policies', 'Users & roles', 'Audit log'] as const} value={tab} onChange={setTab} />
      {tab === 'Property' && (
        <Card title="Property profile">
          <div className="grid max-w-3xl gap-4 md:grid-cols-2">
            <Field label="Property name"><input className="a-input" defaultValue={h.name} /></Field>
            <Field label="Brand"><input className="a-input" defaultValue="Virasat Palaces & Resorts" /></Field>
            <div className="md:col-span-2"><Field label="Address"><input className="a-input" defaultValue={h.address} /></Field></div>
            <Field label="Phone"><input className="a-input" defaultValue={h.phone} /></Field>
            <Field label="Check-in / check-out"><input className="a-input" defaultValue="14:00 / 12:00" /></Field>
            <Field label="Currency"><select className="a-input"><option>INR — Indian Rupee</option><option>USD</option></select></Field>
            <Field label="Time zone"><select className="a-input"><option>Asia/Kolkata (IST)</option></select></Field>
          </div>
          <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }} className="a-btn mt-6">{saved ? <><Check size={14} /> Saved</> : 'Save changes'}</button>
        </Card>
      )}
      {tab === 'Taxes & policies' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="GST configuration">
            <table className="w-full text-sm dark:text-sand"><tbody>
              {[['Room tariff ≤ ₹7,500 / night', '5%'], ['Room tariff > ₹7,500 / night', '18%'], ['Restaurant (in hotel with tariff > ₹7,500)', '18%'], ['Spa & wellness', '18%'], ['SAC — accommodation', '996311']].map(([k, v]) => <tr key={k} className="border-b border-kohl/5 dark:border-white/5"><td className="py-2.5">{k}</td><td className="py-2.5 text-right font-medium">{v}</td></tr>)}
            </tbody></table>
          </Card>
          <Card title="Booking policies">
            <div className="space-y-3 text-sm dark:text-sand">
              <Field label="Flexible cancellation window"><select className="a-input"><option>48 hours before arrival</option><option>72 hours</option><option>7 days</option></select></Field>
              <Field label="Late cancellation penalty"><select className="a-input"><option>First night</option><option>50% of stay</option></select></Field>
              <Field label="Overbooking tolerance"><select className="a-input"><option>0% — never overbook</option><option>2%</option></select></Field>
              <Field label="Children policy"><input className="a-input" defaultValue="Under 6 stay free; 6–12 at ₹3,500 per night" /></Field>
            </div>
          </Card>
        </div>
      )}
      {tab === 'Users & roles' && (
        <Card title="Role-based access control" pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-center text-sm">
              <thead><tr><th className="a-th">Role</th>{MODULES.map((m) => <th key={m} className="a-th text-center">{m}</th>)}</tr></thead>
              <tbody className="dark:text-sand">
                {Object.entries(MATRIX).map(([r, mods]) => (
                  <tr key={r}><td className="a-td text-left font-medium dark:text-ivory">{r}</td>{MODULES.map((m) => <td key={m} className="a-td">{mods.includes(m) ? <Check size={15} className="mx-auto text-leaf" /> : <Minus size={15} className="mx-auto text-stone/40" />}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-kohl/5 px-5 py-3 text-xs text-stone dark:border-white/5">Switch roles from the avatar menu to see the navigation adapt in real time.</p>
        </Card>
      )}
      {tab === 'Audit log' && (
        <Card title="Audit trail" pad={false} actions={<button onClick={() => { if (confirm('Reset all demo data?')) resetDemo() }} className="a-btn-ghost py-1 text-xs text-sindoor">Reset demo data</button>}>
          <table className="w-full">
            <thead><tr><th className="a-th">Time</th><th className="a-th">User</th><th className="a-th">Action</th><th className="a-th">Detail</th></tr></thead>
            <tbody className="dark:text-sand">
              {audit.slice(0, 100).map((a) => <tr key={a.id}><td className="a-td whitespace-nowrap text-xs text-stone">{new Date(a.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td className="a-td">{a.user}</td><td className="a-td font-medium dark:text-ivory">{a.action}</td><td className="a-td text-stone">{a.detail}</td></tr>)}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
