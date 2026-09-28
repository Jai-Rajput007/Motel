import { useMemo, useState } from 'react'
import { AlertTriangle, Minus, PackageCheck, Plus, ShoppingCart, Star } from 'lucide-react'
import clsx from 'clsx'
import { hotelById } from '../../data/hotels'
import { useStore } from '../../store/useStore'
import { useScoped } from '../../lib/hooks'
import { fmtDate, inr, inrC } from '../../lib/utils'
import { Badge, Card, PageHeader, Progress, Stat, Tabs } from '../../components/admin/ui'

export default function Inventory() {
  const { inventory, property } = useScoped()
  const { vendors, purchaseOrders, stockMoves, adjustStock, createPO, receivePO } = useStore()
  const [tab, setTab] = useState<'Stock' | 'Purchase orders' | 'Vendors' | 'Movements'>('Stock')
  const [cat, setCat] = useState('All')
  const [lowOnly, setLowOnly] = useState(false)
  const [msg, setMsg] = useState('')
  const items = useMemo(() => inventory.filter((i) => (cat === 'All' || i.category === cat) && (!lowOnly || i.stock <= i.reorder)), [inventory, cat, lowOnly])
  const low = inventory.filter((i) => i.stock <= i.reorder)
  const value = inventory.reduce((a, i) => a + i.stock * i.cost, 0)
  const pos = purchaseOrders.filter((p) => property === 'all' || p.hotelId === property)
  const itemName = (id: string) => useStore.getState().inventory.find((i) => i.id === id)?.name ?? id

  const autoReorder = () => {
    const byVendor = new Map<string, typeof low>()
    low.forEach((i) => byVendor.set(`${i.hotelId}|${i.vendorId}`, [...(byVendor.get(`${i.hotelId}|${i.vendorId}`) ?? []), i]))
    const ids: string[] = []
    byVendor.forEach((list, key) => { const [h, v] = key.split('|'); ids.push(createPO(h, v, list.map((i) => ({ itemId: i.id, qty: i.par - i.stock, cost: i.cost })))) })
    setMsg(`${ids.length} purchase orders raised for ${low.length} low-stock items`)
    setTab('Purchase orders')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" sub="Linen, amenities, minibar, F&B and engineering stores" actions={low.length > 0 && <button onClick={autoReorder} className="a-btn"><ShoppingCart size={14} /> Auto-reorder {low.length} low items</button>} />
      {msg && <p className="rounded-lg bg-leaf/10 px-4 py-2.5 text-sm text-leaf">{msg}</p>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="SKUs tracked" value={inventory.length} />
        <Stat label="Stock value" value={inrC(value)} tone="gold" />
        <Stat label="Below reorder level" value={low.length} tone="sindoor" icon={<AlertTriangle size={16} />} />
        <Stat label="Open purchase orders" value={pos.filter((p) => p.status !== 'Received').length} tone="leaf" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs tabs={['Stock', 'Purchase orders', 'Vendors', 'Movements'] as const} value={tab} onChange={setTab} />
        {tab === 'Stock' && (
          <>
            <select className="a-input w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>{['All', 'Linen', 'Amenities', 'Minibar', 'F&B', 'Housekeeping', 'Engineering'].map((c) => <option key={c}>{c}</option>)}</select>
            <label className="flex items-center gap-2 text-sm dark:text-sand"><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low stock only</label>
          </>
        )}
      </div>

      {tab === 'Stock' && (
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead><tr><th className="a-th">Item</th><th className="a-th">Category</th>{property === 'all' && <th className="a-th">Property</th>}<th className="a-th w-56">Stock level</th><th className="a-th text-right">Unit cost</th><th className="a-th text-center">Adjust</th></tr></thead>
              <tbody className="dark:text-sand">
                {items.slice(0, 80).map((i) => {
                  const pct = (i.stock / i.par) * 100
                  const isLow = i.stock <= i.reorder
                  return (
                    <tr key={i.id}>
                      <td className="a-td font-medium dark:text-ivory">{i.name}{isLow && <Badge className="ml-2 bg-sindoor/10 text-sindoor">low</Badge>}</td>
                      <td className="a-td">{i.category}</td>
                      {property === 'all' && <td className="a-td">{hotelById(i.hotelId).city}</td>}
                      <td className="a-td"><div className="flex items-center gap-3"><Progress value={pct} className="flex-1" tone={isLow ? 'bg-sindoor' : pct < 60 ? 'bg-gold' : 'bg-leaf'} /><span className="w-24 text-right text-xs">{i.stock} / {i.par} {i.unit}</span></div></td>
                      <td className="a-td text-right">{inr(i.cost)}</td>
                      <td className="a-td">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => adjustStock(i.id, -10, 'Issued to department')} className="rounded-md border border-kohl/10 p-1 dark:border-white/10" aria-label="Issue 10"><Minus size={13} /></button>
                          <button onClick={() => adjustStock(i.id, 10, 'Manual receipt')} className="rounded-md border border-kohl/10 p-1 dark:border-white/10" aria-label="Receive 10"><Plus size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'Purchase orders' && (
        <Card pad={false}>
          <table className="w-full">
            <thead><tr><th className="a-th">PO</th><th className="a-th">Vendor</th><th className="a-th">Property</th><th className="a-th">Items</th><th className="a-th">Date</th><th className="a-th text-right">Total</th><th className="a-th">Status</th><th className="a-th" /></tr></thead>
            <tbody className="dark:text-sand">
              {pos.map((p) => (
                <tr key={p.id}>
                  <td className="a-td font-mono text-xs">{p.id}</td>
                  <td className="a-td">{vendors.find((v) => v.id === p.vendorId)?.name}</td>
                  <td className="a-td">{hotelById(p.hotelId).city}</td>
                  <td className="a-td max-w-xs truncate text-xs text-stone">{p.items.map((l) => `${l.qty} × ${itemName(l.itemId)}`).join(', ')}</td>
                  <td className="a-td">{fmtDate(p.createdAt, 'd MMM')}</td>
                  <td className="a-td text-right">{inr(p.total)}</td>
                  <td className="a-td"><Badge className={p.status === 'Received' ? 'bg-leaf/15 text-leaf' : 'bg-gold/15 text-[#8a6a36]'}>{p.status}</Badge></td>
                  <td className="a-td text-right">{p.status !== 'Received' && <button onClick={() => receivePO(p.id)} className="a-btn-ghost py-1 text-xs"><PackageCheck size={13} /> Receive</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'Vendors' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vendors.map((v) => (
            <Card key={v.id}>
              <p className="font-semibold dark:text-ivory">{v.name}</p>
              <p className="text-sm text-stone">{v.category}</p>
              <p className="mt-3 text-sm dark:text-sand">{v.contact} · {v.phone}</p>
              <p className="mt-2 flex items-center gap-1 text-sm dark:text-sand"><Star size={13} className="fill-gold text-gold" /> {v.rating} vendor score</p>
              <p className="mt-1 text-xs text-stone">{purchaseOrders.filter((p) => p.vendorId === v.id).length} purchase orders</p>
            </Card>
          ))}
        </div>
      )}

      {tab === 'Movements' && (
        <Card pad={false}>
          <ul className="divide-y divide-kohl/5 text-sm dark:divide-white/5 dark:text-sand">
            {stockMoves.slice(0, 60).map((m) => (
              <li key={m.id} className="flex items-center justify-between px-5 py-2.5">
                <span><b className="font-medium">{itemName(m.itemId)}</b> <span className="text-stone">· {m.reason}</span></span>
                <span className={clsx('font-medium', m.qty > 0 ? 'text-leaf' : 'text-sindoor')}>{m.qty > 0 ? '+' : ''}{m.qty}</span>
              </li>
            ))}
            {!stockMoves.length && <li className="p-8 text-center text-stone">No movements yet — make a booking on the website to see amenities allocated automatically.</li>}
          </ul>
        </Card>
      )}
    </div>
  )
}
