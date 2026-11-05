# The Momos Spot · Shop Manager

A phone app for running **The Momos Spot**: billing, stock and vegetable purchases, gas cylinders, rent, EMIs, salaries, other expenses, udhaar (credit), customer loyalty offers, and live profit on a calendar.

- **Works without internet.** Everything is saved on the phone first. When the network is back, it syncs to the cloud on its own.
- **Nothing gets lost.** There is a cloud copy (Supabase), a backup file you can keep, and every update installs over the old app without touching the data.
- **One person, no login screens.** It is made for the shop phone.

The full product plan is in [`PLAN.md`](./PLAN.md).

---

## What's inside

| Tab | What you do there |
|---|---|
| **Today** | Today's sales, profit, cash, what to buy, gas status, rent/EMI due, rewards waiting, and quick buttons |
| **Stock** | Log purchases in 2–3 taps (the "bought just now" toggle adds the date & time), market-trip mode for many items at once, last price shown for every item, price-jump warnings, a "Finished" list with last-price popups, and a WhatsApp shopping list |
| **Sell** | Tap menu items like a cart, choose sizes (Half/Full…), a home-delivery toggle (flat charge from Settings), name or guest, cash / online / both with change calculated, UPI QR for the exact amount, udhaar for short payments, share the bill on WhatsApp, edit or void bills |
| **Calendar** | Each day's sales and profit, with icons for stock 🥬, gas bought 🛢️, gas connected 🔥, expenses 💸 and rewards 🎁. Tap a day for everything that happened. Pick any dates for totals and a chart |
| **Money** | Monthly profit (fixed costs spread daily or as paid), fixed cost per day, "up to today this much should have gone out", rent/EMI/salary schedules (daily, weekly, monthly, yearly or every N days, with an end date or a number of payments), one-time expenses with remarks, a spending breakdown down to each item, and month-vs-month |
| **More** | Menu, Customers, Offers & loyalty, Udhaar, Gas, Cash drawer, Reports & backup, Settings |

**Loyalty:** create offers on the Offers page, for example *every 5 orders*, *5 orders within 30 days*, *7 days in a row* or *spend ₹2,000*. When a named customer completes one, a popup appears. On their **next visit**, checkout shows "Reward waiting → Give now".

---

## Install on the shop phone (Android)

1. Open this repository's **Releases** page on the phone and find **"The Momos Spot app (latest)"**.
2. Download **MomosSpot.apk** and open it. If Android asks, allow "Install unknown apps" for your browser.
3. Open **Momos Spot** from the home screen.

Each time the code changes, a new APK is built automatically by the GitHub Action *Momos Spot · Android APK*. Install it the same way and it **updates** the app. All data stays.

> **About updates and the signing key.** Android only installs an update if it is signed with the same key as the installed app. The workflow keeps reusing one cached key, so normal updates just work. For a permanent key that can never be lost, add two repository secrets once (Settings → Secrets and variables → Actions):
> - `MOMOS_KEYSTORE_BASE64`: your keystore file in base64 (`keytool -genkeypair -keystore momos.keystore -alias momosspot -keyalg RSA -validity 36500`, then `base64 -w0 momos.keystore`)
> - `MOMOS_KEYSTORE_PASSWORD`: its password
>
> If Android ever says "App not installed" during an update, the key changed. Your data is safe in the cloud and the backup file: uninstall, install the new APK, and connect the cloud again (or restore the backup file).

**No Android phone, or want a quick try?** The same app runs in Chrome as an installable web app (PWA). Deploy this folder on Vercel (Root Directory: `momos-spot`), open the link in Chrome and tap **Add to Home screen**. It also works offline after the first open.

---

## Turn on cloud backup (10 minutes, free)

The app works fully without this, but with it your data survives a lost or broken phone.

1. Go to [supabase.com](https://supabase.com), sign up, and click **New project** (free plan, region *Mumbai*). Save the database password somewhere.
2. In the project, open **SQL Editor → New query**, paste everything from [`supabase/schema.sql`](./supabase/schema.sql) and click **Run**.
3. Open **Authentication → Sign In / Providers → Email** and turn **off** "Confirm email". (Optional: turn off "Allow new users to sign up" *after* step 5, so nobody else can create an account.)
4. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.
5. In the app, open **More → Settings → Cloud backup & sync**. Paste the URL and key, type an email and a password (this creates your one account), and tap **Connect**.

The dot at the top right of every screen shows the sync state. Green means all saved to the cloud, amber means uploading, and grey means offline (changes are waiting on the phone). Tap it for details.

**New phone?** Install the app, connect with the same URL, key, email and password, and everything downloads back.

> Supabase pauses free projects after a week with no activity. Daily use keeps it awake. If it ever pauses, the app keeps working offline. Click "Restore" in Supabase and it syncs again.

### Backup file (extra safety)
**More → Reports & backup → Save backup** saves one file with everything (to `Documents/MomosSpot` in the app). Send it to yourself on WhatsApp or Drive. **Restore** merges it back on any phone. If cloud sync is off, the app reminds you to save a backup every 7 days (you can change this in Settings).

---

## How data safety works (technical)

- **Local-first.** Every screen reads and writes IndexedDB (Dexie) on the phone. Each write also adds an entry to an *outbox* in the same transaction.
- **Sync.** The app pushes the outbox to a single Supabase table (`records`) with idempotent upserts, then pulls rows changed since the last sync. It runs when the app opens, when the network returns, every minute, and a few seconds after each change.
- **Conflicts.** The newest version of a record wins. A database trigger refuses to replace a newer row with an older one, and change tracking uses server time, so a wrong phone clock cannot hide changes.
- **Totals are never stored as counters.** Visits, today's sales, last prices and loyalty progress are always calculated from the records.
- **Soft deletes** (`deletedAt`), so deletions sync too and history is never lost. Sold menu items are archived, not deleted. Voided bills stay visible.
- **Money is whole paise** (integers), so there are no rounding errors.
- **Storage.** The web version asks the browser for persistent storage. The Android app keeps its storage as long as it is installed.

---

## Development

```bash
cd momos-spot
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (money, dates, recurring schedules, loyalty, gas, cart, profit, sync)
npm run build      # type-check + production build into dist/
```

Build the APK on your own computer (needs JDK 21 and the Android SDK):

```bash
npm run android:sync
cd android && ./gradlew assembleRelease   # → app/build/outputs/apk/release/app-release.apk
```

Stack: React 19, TypeScript, Vite, Tailwind CSS 4, Dexie (IndexedDB), Supabase, vite-plugin-pwa (offline), Capacitor 8 (Android), Recharts, Vitest.

```
src/
  actions/     all writes (business rules + validation)
  db/          Dexie schema, types, save/outbox helpers
  sync/        Supabase config + sync engine
  lib/calc/    pure calculations: recurring schedules, loyalty, gas, cart, profit summaries
  features/    screens: today, stock, gas, sell, calendar, money, customers, offers, credit, cash, menu, reports, settings
  ui/          phone UI kit (sheets, inputs, toasts, dialogs)
supabase/schema.sql   cloud table, trigger and security rules
```
