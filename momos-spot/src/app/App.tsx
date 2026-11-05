import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import clsx from 'clsx'
import { CalendarDays, Home, Package, ShoppingCart, Wallet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import CalendarPage from '../features/calendar/CalendarPage'
import CashPage from '../features/cash/CashPage'
import CreditPage from '../features/credit/CreditPage'
import CustomerPage from '../features/customers/CustomerPage'
import CustomersPage from '../features/customers/CustomersPage'
import GasPage from '../features/gas/GasPage'
import MenuPage from '../features/menu/MenuPage'
import MoneyPage from '../features/money/MoneyPage'
import MorePage from '../features/more/MorePage'
import OffersPage from '../features/offers/OffersPage'
import ReportsPage from '../features/reports/ReportsPage'
import SalesPage from '../features/sell/SalesPage'
import SellPage from '../features/sell/SellPage'
import SettingsPage from '../features/settings/SettingsPage'
import ItemPage from '../features/stock/ItemPage'
import StockPage from '../features/stock/StockPage'
import TodayPage from '../features/today/TodayPage'
import { autoMarkRecurring } from '../actions/money'
import { useSettings, useToday } from '../hooks'
import { FeedbackHost } from '../ui/feedback'
import { closeTopLayer } from '../ui/Sheet'
import { PinLock } from './PinLock'
import { useTheme } from './theme'

const TABS = [
  { to: '/', label: 'Today', icon: Home, end: true },
  { to: '/stock', label: 'Stock', icon: Package },
  { to: '/sell', label: 'Sell', icon: ShoppingCart, big: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/money', label: 'Money', icon: Wallet },
]

function BottomNav() {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-end justify-around px-1">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              clsx('flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold', isActive ? 'text-brand' : 'text-muted')
            }
          >
            {({ isActive }) =>
              t.big ? (
                <>
                  <span className={clsx('-mt-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ring-4 ring-bg', isActive ? 'bg-brand text-brand-ink' : 'bg-ink text-bg')}>
                    <t.icon size={26} />
                  </span>
                  <span>{t.label}</span>
                </>
              ) : (
                <>
                  <t.icon size={24} strokeWidth={isActive ? 2.4 : 1.9} />
                  <span>{t.label}</span>
                </>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function useAndroidBack() {
  const nav = useNavigate()
  const loc = useLocation()
  const path = useRef(loc.pathname)
  path.current = loc.pathname
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const h = CapApp.addListener('backButton', () => {
      if (closeTopLayer()) return
      if (path.current !== '/') nav(-1)
      else void CapApp.minimizeApp()
    })
    return () => {
      void h.then((x) => x.remove())
    }
  }, [nav])
}

export default function App() {
  const settings = useSettings()
  const today = useToday()
  useTheme(settings.theme)
  useAndroidBack()
  useEffect(() => {
    // record bank auto-debits (rent/EMI set to "mark as paid automatically") when the day changes
    autoMarkRecurring(today).catch((e) => console.error(e))
  }, [today])
  const loc = useLocation()
  const [unlocked, setUnlocked] = useState(false)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [loc.pathname])

  if (settings.pin && !unlocked) return <PinLock pin={settings.pin} onUnlock={() => setUnlocked(true)} />

  return (
    <div className="min-h-full">
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/stock/item/:id" element={<ItemPage />} />
        <Route path="/gas" element={<GasPage />} />
        <Route path="/sell" element={<SellPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/money" element={<MoneyPage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerPage />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/credit" element={<CreditPage />} />
        <Route path="/cash" element={<CashPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<TodayPage />} />
      </Routes>
      <BottomNav />
      <FeedbackHost />
    </div>
  )
}
