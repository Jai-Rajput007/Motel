import { Ban, Gift, Pencil, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { voidSale } from '../../actions/sales'
import type { Customer, Sale } from '../../db/types'
import { useSettings } from '../../hooks'
import { formatDateTime } from '../../lib/dates'
import { inr } from '../../lib/money'
import { shareText } from '../../lib/share'
import { attempt, confirmDialog, promptDialog, toast } from '../../ui/feedback'
import { Badge, Button } from '../../ui/kit'
import { Sheet } from '../../ui/Sheet'
import { billText, cartCount, emptyCart, fromSale, type CartDraft } from './cart'

export function SaleSheet({ sale: s, customer, onClose }: { sale: Sale; customer?: Customer; onClose: () => void }) {
  const settings = useSettings()
  const nav = useNavigate()
  const startEdit = async () => {
    let current: CartDraft = emptyCart()
    try {
      current = JSON.parse(localStorage.getItem('draft.cart') ?? 'null') ?? emptyCart()
    } catch {
      /* ignore */
    }
    if (cartCount(current) > 0 && !(await confirmDialog({ title: 'Replace the current cart?', body: 'There are items in the cart that are not saved yet.', ok: 'Replace' }))) return
    localStorage.setItem('draft.cart', JSON.stringify(fromSale(s)))
    onClose()
    nav('/sell')
    // the Sell page reads the draft when it opens
    window.dispatchEvent(new Event('storage'))
  }
  return (
    <Sheet
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          Bill #{s.billNo} {s.status === 'void' && <Badge tone="bad">Void</Badge>}
        </span>
      }
      subtitle={`${formatDateTime(s.at)}${customer ? ` · ${customer.name}` : ''}`}
      footer={
        s.status === 'done' ? (
          <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" icon={<Send size={16} />} onClick={() => void shareText(billText(s, settings, customer && !customer.isGuest ? customer.name : undefined), s.phone ?? customer?.phone)}>
              Share
            </Button>
            <Button variant="secondary" icon={<Pencil size={16} />} onClick={startEdit}>
              Edit
            </Button>
            <Button
              variant="secondary"
              className="text-bad"
              icon={<Ban size={16} />}
              onClick={async () => {
                const reason = await promptDialog({ title: `Void bill #${s.billNo}?`, body: 'It stays in history but is removed from all totals. Loyalty progress from it is undone.', placeholder: 'Reason, e.g. wrong entry', ok: 'Void bill' })
                if (!reason) return
                if (await attempt(() => voidSale(s.id, reason))) {
                  toast('Bill voided')
                  onClose()
                }
              }}
            >
              Void
            </Button>
          </div>
        ) : undefined
      }
    >
      {s.status === 'void' && <div className="mb-3 rounded-2xl bg-bad-soft p-3 text-sm text-bad">Voided{s.voidedAt ? ` on ${formatDateTime(s.voidedAt)}` : ''}: {s.voidReason}</div>}
      <div className="tabular space-y-2">
        {s.lines.map((l) => (
          <div key={l.key} className="flex justify-between gap-3">
            <span>
              {l.qty} × {l.name} {l.isReward && <Gift size={14} className="inline text-brand" />}
              {l.listPrice !== undefined && l.listPrice !== l.price && !l.isReward && <span className="text-xs text-muted"> (menu {inr(l.listPrice)})</span>}
            </span>
            <span>{inr(l.price * l.qty)}</span>
          </div>
        ))}
        <div className="border-t border-line pt-2" />
        {s.deliveryFee > 0 && <div className="flex justify-between text-sm"><span>Delivery</span><span>{inr(s.deliveryFee)}</span></div>}
        {s.discount > 0 && <div className="flex justify-between text-sm text-good"><span>Discount{s.discountReason ? ` (${s.discountReason})` : ''}</span><span>−{inr(s.discount)}</span></div>}
        <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{inr(s.total)}</span></div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-2xl bg-surface-2 p-2"><div className="text-muted">Cash</div><b>{inr(s.cash)}</b>{s.change > 0 && <div className="text-xs text-muted">gave {inr(s.cashTendered)}, change {inr(s.change)}</div>}</div>
        <div className="rounded-2xl bg-surface-2 p-2"><div className="text-muted">Online</div><b>{inr(s.online)}</b></div>
        <div className="rounded-2xl bg-surface-2 p-2"><div className="text-muted">Udhaar</div><b>{inr(s.credit)}</b></div>
      </div>
      {(s.isDelivery || s.note) && (
        <div className="mt-3 space-y-1 text-sm">
          {s.isDelivery && <div>🛵 Home delivery{s.address ? ` · ${s.address}` : ''}{s.phone ? ` · ${s.phone}` : ''}</div>}
          {s.note && <div>📝 {s.note}</div>}
        </div>
      )}
    </Sheet>
  )
}
