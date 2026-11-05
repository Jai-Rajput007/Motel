import { ChevronRight, FileDown, Flame, Gift, HandCoins, Settings, UtensilsCrossed, Users, Vault } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../ui/kit'
import { SyncDot } from '../../ui/SyncDot'

export default function MorePage() {
  const nav = useNavigate()
  const items: { to: string; icon: ReactNode; title: string; sub: string }[] = [
    { to: '/menu', icon: <UtensilsCrossed />, title: 'Menu', sub: 'Items, prices and sizes' },
    { to: '/customers', icon: <Users />, title: 'Customers', sub: 'Regulars, visits, who stopped coming' },
    { to: '/offers', icon: <Gift />, title: 'Offers & loyalty', sub: 'Rewards for regular customers, offer reminders' },
    { to: '/credit', icon: <HandCoins />, title: 'Udhaar (credit)', sub: 'Who owes you money' },
    { to: '/gas', icon: <Flame />, title: 'Gas', sub: 'Cylinders, average life, next refill' },
    { to: '/cash', icon: <Vault />, title: 'Cash drawer', sub: 'Open / close the day, count cash' },
    { to: '/reports', icon: <FileDown />, title: 'Reports & backup', sub: 'Excel export, monthly report, backup file' },
    { to: '/settings', icon: <Settings />, title: 'Settings', sub: 'Delivery charge, UPI, cloud sync, PIN' },
  ]
  return (
    <Page title="More" back actions={<SyncDot />}>
      <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
        {items.map((i) => (
          <button key={i.to} onClick={() => nav(i.to)} className="flex w-full items-center gap-4 px-4 py-3.5 text-left active:bg-surface-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-ink">{i.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{i.title}</span>
              <span className="block truncate text-sm text-muted">{i.sub}</span>
            </span>
            <ChevronRight className="text-muted" size={20} />
          </button>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted">The Momos Spot · v1.0 · works offline</p>
    </Page>
  )
}
