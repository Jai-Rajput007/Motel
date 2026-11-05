import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { UserError } from '../../actions/common'
import { db, getMeta, SETTINGS_ID } from '../../db'
import type { Settings } from '../../db/types'
import { save } from '../../db/write'
import { useOnline, usePending, useSettings, useSyncStatus } from '../../hooks'
import { formatDateTime } from '../../lib/dates'
import { inr, toPaise } from '../../lib/money'
import { connectCloud, disconnectCloud, requeueAll, syncNow } from '../../sync/engine'
import { readConfig } from '../../sync/config'
import { attempt, confirmDialog, promptDialog, toast } from '../../ui/feedback'
import { AmountInput, Button, Card, Field, Page, SectionTitle, Segmented, Select, TextInput, Toggle } from '../../ui/kit'

export default function SettingsPage() {
  const s = useSettings()
  const [draft, setDraft] = useState<Settings>(s)
  useEffect(() => {
    setDraft(s)
  }, [s])
  const set = (p: Partial<Settings>) => setDraft((d) => ({ ...d, ...p }))
  const dirty = JSON.stringify(draft) !== JSON.stringify(s)

  useEffect(() => {
    if (location.hash === '#cloud') setTimeout(() => document.getElementById('cloud')?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [])

  const saveAll = () =>
    attempt(async () => {
      if (!draft.shopName.trim()) throw new UserError('Enter the shop name.')
      if (draft.upiId && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(draft.upiId.trim())) throw new UserError('UPI ID looks wrong. It should look like name@bank.')
      await save<Settings>('settings', { ...draft, id: SETTINGS_ID, shopName: draft.shopName.trim(), upiId: draft.upiId?.trim() || undefined })
      toast('Settings saved')
    })

  return (
    <Page title="Settings" back>
      <SectionTitle>Shop</SectionTitle>
      <Card>
        <Field label="Shop name" hint="Shown on shared bills">
          <TextInput value={draft.shopName} onChange={(e) => set({ shopName: e.target.value })} />
        </Field>
        <Field label="UPI ID (for QR code at checkout)" hint="e.g. momosspot@okaxis">
          <TextInput value={draft.upiId ?? ''} onChange={(e) => set({ upiId: e.target.value })} autoCapitalize="none" />
        </Field>
        <Field label="Name shown in UPI apps">
          <TextInput value={draft.upiName ?? ''} onChange={(e) => set({ upiName: e.target.value })} placeholder={draft.shopName} />
        </Field>
      </Card>

      <SectionTitle>Home delivery</SectionTitle>
      <Card>
        <Field label="Delivery charge per order" hint="Added once to every home-delivery bill. Can be changed on a single bill.">
          <AmountInput value={draft.deliveryFee} onChange={(p) => set({ deliveryFee: p ?? 0 })} big />
        </Field>
        <Field label="Free delivery on bills above (optional)">
          <AmountInput value={draft.freeDeliveryAbove ?? null} onChange={(p) => set({ freeDeliveryAbove: p ?? undefined })} placeholder="Never free" />
        </Field>
      </Card>

      <SectionTitle>Billing</SectionTitle>
      <Card>
        <Field label="Quick cash buttons" hint="Comma separated amounts in ₹, e.g. 50, 100, 200, 500">
          <TextInput
            defaultValue={draft.cashChips.map((c) => c / 100).join(', ')}
            onBlur={(e) => {
              const chips = e.target.value
                .split(',')
                .map((x) => toPaise(x.trim()))
                .filter((x): x is number => !!x && x > 0)
              set({ cashChips: [...new Set(chips)].sort((a, b) => a - b) })
            }}
          />
        </Field>
        <Field label="Day ends at" hint="If you stay open after midnight, sales until this time count for the previous day">
          <Select
            value={String(draft.dayCutoffHour)}
            onChange={(v) => set({ dayCutoffHour: Number(v) })}
            options={[0, 1, 2, 3, 4, 5].map((h) => ({ value: String(h), label: h === 0 ? 'Midnight (12 AM)' : `${h} AM` }))}
          />
        </Field>
      </Card>

      <SectionTitle>App</SectionTitle>
      <Card>
        <Field label="Theme">
          <Segmented value={draft.theme} onChange={(v) => set({ theme: v })} options={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
        </Field>
        <Toggle
          checked={!!draft.pin}
          onChange={async (on) => {
            if (!on) return set({ pin: undefined })
            const pin = await promptDialog({ title: 'Choose a 4-digit PIN', placeholder: '4 digits' })
            if (pin && /^\d{4}$/.test(pin)) set({ pin })
            else if (pin) toast('PIN must be exactly 4 digits', { kind: 'error' })
          }}
          label="PIN lock"
          sub="Ask for a PIN when the app opens"
        />
        <Field label="Remind me to save a backup file every">
          <Select value={String(draft.backupReminderDays)} onChange={(v) => set({ backupReminderDays: Number(v) })} options={[3, 7, 14, 30, 0].map((d) => ({ value: String(d), label: d ? `${d} days` : 'Never remind' }))} />
        </Field>
      </Card>

      {dirty && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-3">
          <div className="mx-auto max-w-lg">
            <Button block size="lg" onClick={saveAll}>
              Save settings
            </Button>
          </div>
        </div>
      )}

      <CloudSection />
      <p className="mt-4 text-center text-xs text-muted">Delivery charge now: {inr(s.deliveryFee)}</p>
    </Page>
  )
}

function CloudSection() {
  const st = useSyncStatus()
  const pending = usePending()
  const online = useOnline()
  const cfg = readConfig()
  const [url, setUrl] = useState(cfg?.url ?? '')
  const [key, setKey] = useState(cfg?.anonKey ?? '')
  const [email, setEmail] = useState(cfg?.email ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [lastPull, setLastPull] = useState<string | null>(null)
  useEffect(() => {
    void getMeta<string | null>('lastSyncAt', null).then(setLastPull)
  }, [st.lastSyncAt])

  return (
    <div id="cloud">
      <SectionTitle>Cloud backup & sync</SectionTitle>
      <Card>
        <div className="mb-3 flex items-center gap-3">
          {st.state === 'off' ? <CloudOff className="text-muted" /> : <Cloud className={st.state === 'error' ? 'text-bad' : 'text-good'} />}
          <div className="min-w-0 flex-1">
            <div className="font-semibold">
              {st.state === 'off' ? 'Not connected' : !online ? 'Offline. Will sync when internet is back' : st.state === 'error' ? 'Sync problem' : st.state === 'syncing' ? 'Syncing…' : 'Connected'}
            </div>
            <div className="text-sm text-muted">
              {pending} change{pending === 1 ? '' : 's'} waiting to upload
              {lastPull ? ` · last sync ${formatDateTime(lastPull)}` : ''}
            </div>
          </div>
        </div>
        {st.error && <div className="mb-3 rounded-2xl bg-bad-soft p-3 text-sm text-bad">{st.error}</div>}

        {st.state === 'off' ? (
          <>
            <p className="mb-3 text-sm text-muted">
              Everything is saved on this phone already. Connect a free Supabase project to keep a copy in the cloud, so nothing is lost if the phone is lost or reset.
              Steps are in the README (supabase/schema.sql).
            </p>
            <Field label="Project URL">
              <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" autoCapitalize="none" />
            </Field>
            <Field label="Anon public key">
              <TextInput value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJ…" autoCapitalize="none" />
            </Field>
            <Field label="Email (your one account)">
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" />
            </Field>
            <Field label="Password" hint="Used once to sign in. The phone stays signed in.">
              <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button
              block
              disabled={busy || !url || !key || !email || password.length < 6}
              onClick={async () => {
                setBusy(true)
                const ok = await attempt(() => connectCloud({ url, anonKey: key, email }, password))
                setBusy(false)
                if (ok) {
                  setPassword('')
                  toast('Connected. Your data is syncing.')
                }
              }}
            >
              {busy ? 'Connecting…' : 'Connect'}
            </Button>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="soft" icon={<RefreshCw size={16} />} onClick={() => void syncNow()} disabled={!online}>
              Sync now
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                if (!(await confirmDialog({ title: 'Disconnect cloud?', body: 'Data stays on this phone. New changes will not be backed up until you connect again.', ok: 'Disconnect', danger: true }))) return
                await disconnectCloud()
              }}
            >
              Disconnect
            </Button>
            <Button
              variant="ghost"
              className="col-span-2 text-sm"
              onClick={async () => {
                if (!(await confirmDialog({ title: 'Upload everything again?', body: 'Use this if the cloud copy looks incomplete. It is safe: newer data is never overwritten.', ok: 'Upload' }))) return
                await requeueAll()
                void syncNow()
              }}
            >
              Upload everything again
            </Button>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">Local records: {useCount()}</p>
      </Card>
    </div>
  )
}

function useCount() {
  const [n, setN] = useState<number | null>(null)
  useEffect(() => {
    void Promise.all([db.sales.count(), db.purchases.count(), db.expenses.count()]).then(([a, b, c]) => setN(a + b + c))
  }, [])
  return n === null ? '…' : `${n} sales, purchases & expenses`
}
