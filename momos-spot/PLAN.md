# The Momos Spot — Shop Manager App: Product & Technical Plan

> **Status: built.** See [`README.md`](./README.md) for installing on the phone, turning on cloud backup, and development.
> Small changes from this plan: rewards are given on the next visit only (there is no "same bill" option); a fixed cost can be paused for a period; the monthly report is a printable page (Save as PDF) rather than a generated PDF file.

> A phone-first app for running **The Momos Spot**. It logs every rupee coming in (sales) and going out (vegetables, packaged stock, gas, rent, EMIs, salaries, one-off spends), puts it all on a calendar, and shows profit live.
> It is used by **one person**, so there are no logins or user accounts. It **works fully without internet** and syncs to the cloud when the network comes back, so data is not lost if the phone is lost, reset or broken.

> **Owner's answers (5 Nov 2026), now part of the plan:**
> - **Delivery:** one flat home-delivery charge per order, the same for every item, set in Settings (it can be changed for a single order if needed). There are no per-item delivery prices.
> - **Loyalty:** all three trigger types, plus total spend, are configured on the Offers page. Any number of offers can be created.
> - **Phone:** Android only, using one phone. The app is delivered as an APK, and the PWA remains available as a fallback.
> - **Language:** English only.
> - **Sizes:** menu items can have optional sizes/variants (Half/Full, 6 pcs/10 pcs). They live in an **Advanced** section of the menu item editor. While selling, a new size can be added from the size chooser, and a line's price can be changed in the cart's Advanced options.

---

## 0. Summary of decisions

| Question | Decision | Why |
|---|---|---|
| Web app or phone app? | **One codebase delivered two ways:** an installable app (PWA) that opens from the home-screen icon, and an **Android APK** built from the same code with Capacitor | The concern that "a web app does not work offline" applies to normal websites. An installed PWA keeps its code and data on the phone and opens with no internet. The APK adds safety, because Android does not clear an app's storage the way it can clear a browser's |
| Framework | **React + TypeScript + Vite** (not Next.js) | Next.js is mainly for pages built on a server. This app has to run entirely on the phone, so a plain React app is simpler and more reliable offline. The UI code would be the same React either way |
| Database on the phone | **IndexedDB through Dexie.js** | A real database inside the app. Every screen reads from and writes to it, so the app is instant and works offline |
| Cloud database | **Supabase (Postgres)** | Free tier, proper SQL database, daily backups, easy to export |
| Sync | **Outbox + pull of changes** (details in §3) | Every change is saved on the phone first, then pushed to Supabase whenever there is internet. Retries run automatically |
| Money | Stored as **whole paise (integers)**, never decimals | Avoids errors like ₹0.1 + ₹0.2 = ₹0.30000004 |
| Styling | Tailwind CSS, large tap targets, bottom tab bar, light/dark mode | Built for one-hand use behind a busy counter |
| Charts | Recharts | Earnings, spend breakdown, price history |
| Hosting | Vercel (free) for the PWA, APK installed directly on the phone | No running cost apart from Supabase's free tier |

---

## 1. Navigation (phone-first)

A bottom tab bar with five tabs. The middle **Sell** button is large because it is used most.

```
┌─────────────────────────────────┐
│  Today   Stock   [ SELL ]   Calendar   Money │
└─────────────────────────────────┘
```

- **Today**: the home dashboard
- **Stock**: purchases, shopping list and gas
- **Sell**: the billing screen (cart)
- **Calendar**: month view with per-day earnings and events
- **Money**: expenses, recurring costs, EMIs, profit and breakdowns
- **More** (menu at the top right of Today): Menu items, Customers, Offers & Loyalty, Credit (udhaar), Reports & Export, Settings, Backup & Sync status

Global UI rules
- Every "add" form opens as a **bottom sheet**, a panel that slides up from the bottom so the thumb can reach it, and can be submitted in 2–3 taps.
- Number fields open the **numeric keypad** directly.
- Each save shows a small toast with **Undo** for 5 seconds.
- A **sync dot** sits in the header: green when synced, amber when changes are waiting to be uploaded, grey when offline. Tapping it shows the details.
- Nothing is deleted permanently from normal screens. Items are **archived** or **voided with a reason**, so history and reports stay correct.

---

## 2. Features

### 2.1 Today (home dashboard)

Live cards for today:
- **Sales today**: total, number of orders, cash vs online split, delivery vs counter
- **Spent today**: stock purchases + expenses
- **Today's profit**: sales − today's purchases − today's expenses − today's share of recurring costs (see §2.5)
- **Cash in drawer (expected)**: opening cash + cash sales − change given − cash spends
- **Shopping list**: count of items marked "finished", with a "Going to market" button
- **Gas**: "Cylinder in use for 9 days (average lasts 14)"
- **Due soon**: rent, EMIs and salaries due in the next 3 days, plus any overdue
- **Rewards waiting**: customers who have an unlocked offer
- **Credit outstanding**: total udhaar owed by customers

Quick actions: **+ Sale**, **+ Purchase**, **+ Expense**, **Item finished**.

### 2.2 Stock (inventory and purchases)

#### Item catalogue
Every thing bought is an **item**, with:
- name (unique, case-insensitive: "Onion" and "onion " are the same item)
- category: **Vegetables**, **Packaged / Grocery** (mayo, sauces, flour, oil, packaging), **Gas**, **Other**. Categories can be added and renamed.
- default unit: kg, g, litre, ml, piece, packet, dozen, box, bundle
- optional local name (for example "Pyaz") so search finds either name

New items can be created **inline while logging a purchase**. Type a name that does not exist and tap "Add 'Cabbage' as new vegetable". There is no separate setup step.

#### Logging a purchase (the fast path)
A bottom sheet with:
1. **Item**: search box with autocomplete. Recently and frequently bought items appear as one-tap chips above it.
2. **Quantity + unit**: unit defaults to the item's usual one. Decimals are allowed (1.5 kg).
3. **Total price paid**. The price per unit is calculated and shown ("₹40/kg").
4. **"Bought just now" toggle (on by default)**: stamps the current date and time. When it is off, a date and time picker appears for back-dated entries.
5. Optional: paid by cash or online, vendor/shop name (remembered with autocomplete), note.

Small conveniences:
- When an item is chosen, its **last purchase** shows under it: "Last time: 2 kg for ₹80 (₹40/kg) on 2 Nov at Ramesh Sabzi". The fields can be pre-filled with it in one tap.
- **Price-jump warning**: "Tomato is 45% more expensive per kg than your average." This is information only and never blocks saving.
- **Market trip mode**: add several items in a row without closing the sheet. A running total is shown, with an optional "Total I paid" field to catch mistakes ("Items add up to ₹1,240, you said ₹1,200: difference ₹40"). The whole trip is saved as a group and can be viewed as one entry.
- Saving a purchase **automatically ticks the item off the shopping list** if it was on it.

#### Purchase history
- A list filtered by date range, category and item, with totals.
- **Item detail page**: price-per-unit history chart, average, lowest and highest price, how often it is bought, and total spent this month.

#### Shopping list ("Finished / Restock")
- An **"Item finished"** button (on the Stock tab, in Today's quick actions, and on each item) adds the item to the list with the time it ran out and an optional note ("need 5 kg").
- Each entry shows a **last-price chip**: tapping it opens a small popup "Last bought: 5 kg for ₹150 on 28 Oct (₹30/kg)". It also shows how many days the last stock lasted.
- **Going to market** view: the list grouped by category, with expected cost (based on last prices) and a **Share on WhatsApp** button that sends the list as text to whoever is going.
- Items leave the list when a purchase is logged for them or when they are ticked off manually.

#### Gas cylinders
Buying and using a cylinder are separate events, because a cylinder is often bought on one day and connected on another.

Each cylinder has a life cycle:
```
Bought (in stock) ──► Connected (in use) ──► Empty ──► Returned/exchanged (optional)
```
- **Buy gas**: price, date (now or manual), optional supplier, and the number of cylinders. Buying 2 creates 2 cylinders.
- **Connect cylinder**: pick a spare cylinder. The date defaults to now and can be changed. Connecting a new one automatically marks the previous one in use as **Empty** on the same date and time. This can be changed.
- The Gas screen shows: cylinders in use, spares in stock, **days the current one has been running**, the **average life** of past cylinders, a **predicted empty date**, and the **gas cost per day**.
- A warning appears when there is no spare and the current cylinder is close to its average life: "No spare cylinder, the current one may finish in about 2 days."
- On the calendar, **Gas bought** and **Gas connected** appear as separate markers.

### 2.3 Sell (billing)

#### Menu management (More → Menu)
- Categories: Steamed, Fried, Tandoori, Soups, Drinks, and so on, with a custom order.
- Item: name, **price**, optional **variants** in the Advanced section (Half/Full, 5 pcs/10 pcs, Veg/Chicken/Paneer), an "available" switch for when an item is sold out today, and a sort order.
- Edit and archive. Changing a price affects **future** sales only. Every sale stores the name and price at the time it was made, so old bills and reports never change.
- Deleting an item that was ever sold **archives** it, which hides it from the menu but keeps its history. Items that were never sold can be fully deleted.

#### Making a sale
1. **Menu grid** of large tiles, with category tabs and search. Tapping a tile adds 1; tapping again adds another. Long-press or a "−" button removes one. Variants open a small chooser. The **most-sold items show first**.
2. **Cart bar** at the bottom showing items, quantity and total. It expands into the cart.
3. **Home delivery** toggle. When it is on, the flat delivery charge from Settings is added to the bill (it can be changed for that order), and an optional address/landmark and phone field appears.
4. **Customer**:
   - Type a name: matching existing customers are suggested ("Rahul (…4321), 7 visits"), or a new one is created.
   - Or switch on **Guest**: a short unique code such as `G-7K3P` is created. A guest can later be **converted** into a named customer, so their earlier visits are kept.
   - A phone number is optional. It helps tell two people with the same name apart.
   - If the chosen customer has a **reward waiting**, a banner appears straight away (see §2.7).
5. **Discount** (optional): flat ₹ or %, with a reason.
6. **Payment**: three large buttons: **Cash**, **Online (UPI)**, **Split**.
   - **Cash**: enter the amount the customer gave. **Change to return** is calculated. Quick chips for ₹ exact / 100 / 200 / 500.
   - **Online**: amount defaults to the full total. A **UPI QR code with the exact amount** can be shown on screen (from the UPI ID in Settings) for the customer to scan.
   - **Split**: enter the online amount and the cash part fills in automatically, or the other way round. Both fields can be edited. The total is shown live.
   - **Short payment** (customer pays less): choose **"Add rest to credit (udhaar)"**, which needs a named customer, or **"Give as discount"**.
7. **Save sale**. The bill is saved locally right away with a bill number for the day (e.g. `#05-11-023`). An optional **Share bill** button sends a text receipt on WhatsApp.

Safety:
- The save button locks after the first tap and every sale has a unique ID, so a double tap can never create two sales.
- **Recent sales** list: open, edit (re-opens the cart) or **void** with a reason. Voided sales stay visible with a strike-through, are left out of all totals, and undo any loyalty progress they earned.

#### Live sales stats (top of the Sell tab and in the Sales report)
- Today: total, orders, average bill, cash vs online, delivery vs counter, items sold.
- Range filter: Today, Yesterday, Last 7 days, This month, Last month, Custom range.
- Top items by quantity and revenue, **busiest hours** chart, best and worst days.
- Comparison with the same weekday last week ("+12% vs last Tuesday").

### 2.4 Calendar

- **Month grid**: each day shows **sales total** and a small coloured bar (green for profit, red for loss). Small icons mark: 🥬 purchases, 🔥 gas bought, 🔌 gas connected, 💸 expense/EMI paid, 🎁 offer redeemed.
- Tap a day to open the **Day sheet**: sales (with order list), purchases, gas events, expenses and the day's profit calculation. New entries can be added for that day from here, already back-dated.
- **Range view**: pick start and end dates (or presets: 7/15/30 days, this or last month) to get totals, a daily earnings bar chart, and best and worst days.
- **Business day cut-off** (Settings, default midnight): if the shop stays open late, sales up to, say, 2 AM can count towards the previous day.

### 2.5 Money

#### Recurring costs (rent, EMIs, salaries, electricity, subscriptions)
Each recurring cost has:
- name, category (Rent, EMI, Salary, Utility, Loan, Other), amount
- **frequency**: daily, weekly, monthly, yearly, or every N days
- start date, and an end by date, by number of payments (e.g. EMI 24 of 24), or never
- due day (e.g. the 5th). If a month is too short (31st in February), the last day of that month is used.
- payment style: **mark manually** (default) or **auto-mark as paid** (for automatic bank debits)
- amount changes keep history: "rent ₹8,000 → ₹9,000 from Jan 2027" does not rewrite past months
- pause/resume, and notes

Screens and figures:
- **This month**: each cost with its status (paid / due on date / overdue), and **Mark paid** with date, mode and amount (partial payments allowed).
- **Running deduction meter**: "Up to today, ₹14,500 should have gone out for recurring costs this month. Paid ₹12,000, pending ₹2,500." It is calculated from the schedule, so it is always current.
- **EMI tracker**: payments done, payments left, amount left, end date and a progress bar.
- **Daily cost burden**: total recurring costs as a cost per day ("Your fixed costs are ₹780/day. You need to sell that much before you make a profit").

#### One-time expenses
Name, amount, category (Repairs, Equipment, Packaging, Transport, Staff food, Other, plus custom ones), date (now or manual), cash or online, remarks. The same fast bottom sheet as purchases.

#### Profit and breakdowns
- **Daily profit** = sales − stock purchases that day − one-time expenses that day − **daily share of recurring costs** (for example, monthly rent ÷ days in that month).
- **Monthly profit** = month's sales − month's purchases − month's expenses − month's recurring costs.
- Two views of the same data, with a switch: **"Cash out"** (what actually left the account on the day it was paid) and **"Spread"** (fixed costs spread evenly over days). The default is Spread, so a rent payment does not make one day look like a big loss.
- **Spending breakdown** for any range: donut and list by category (Vegetables, Packaged, Gas, Rent, EMI, Salary…), with drill-down to items ("Vegetables ₹6,200: Onion ₹1,450, Cabbage ₹1,100…").
- **Month vs last month** for sales, spend, profit and margin.
- **Money flow** (cash vs online): money in by cash and online, money out by cash and online. This helps match the cash in hand with the bank balance.

### 2.6 Customers

- List with search, sorted by last visit, number of visits or total spent.
- Profile: visits, total spent, favourite items, last visit, average bill, reward progress, credit balance and order history.
- **Duplicate handling**: names are compared ignoring case and spaces. When a typed name is similar to an existing customer ("rahul" / "Rahul "), the app suggests the existing customer before creating a new one. Two customers can be **merged**, which combines their history.
- **Inactive regulars**: "These 6 regulars haven't come in 3+ weeks", with a one-tap WhatsApp message if a phone number is saved.

### 2.7 Offers & loyalty

#### Loyalty rules (set up in More → Offers)
Each rule has:
- **Name**: e.g. "6th plate free"
- **Trigger**, one of:
  - **Every N orders**: e.g. every 5 orders (counted per sale, not per plate)
  - **N orders within D days**: e.g. 5 orders within 30 days, for frequent buying in a short period
  - **N orders on consecutive days**: an every-day streak
  - **Total spend reaches ₹X**
- **Minimum bill** for an order to count (optional, e.g. only bills over ₹100)
- **Reward**: free item (pick from menu), % discount, flat ₹ off, or custom text ("Free cold drink")
- **Repeat**: once per customer, or every time the condition is met again
- **Expiry**: the reward is valid for N days after it is unlocked (optional)
- Active date range and on/off switch

#### How it works at the counter
1. A sale is saved for a named customer → the app checks all active rules.
2. If a reward is unlocked, a celebration popup shows: "🎉 Rahul unlocked *6th plate free*. You can give it on his next visit." The reward is now stored as **waiting**.
3. **Next time** that customer is picked in a sale, a banner shows at the top of the cart: "Rahul has a reward: *6th plate free* [Apply] [Later]". **Apply** adds the free item at ₹0 or applies the discount and marks the reward **redeemed** on that bill.
4. Progress shows on the customer profile and while billing: "4 of 5 orders, 1 more for a free plate."
5. Voiding a sale removes the progress it earned. If that sale unlocked a reward that has not been used, the reward is cancelled. A reward that was already redeemed stays recorded.
6. Guests (random codes) do not earn loyalty until they are converted into a named customer, because they cannot be recognised on their next visit.

The rule "a reward is given on the next visit after it is unlocked" is the default, as described. Each rule also has an option to **apply the reward immediately on the same bill**.

#### Offer reminders board
A simple board of shop-wide offers and notes, such as "Diwali combo ₹199, 1–5 Nov" or "Free soup on orders above ₹300 this week", with start and end dates. Active offers show as a slim banner on the Sell screen so they are not forgotten.

### 2.8 Credit / udhaar (extra feature)
Common in local shops, and a frequent source of lost money.
- A short payment can be added to the customer's credit. The customer's balance and history are shown.
- **Receive payment**: cash, online or split, full or partial.
- Total outstanding appears on Today. A **WhatsApp reminder** can be sent with the amount.
- Received credit payments count as **money in** on the day they arrive. The sale itself counts as revenue on the day of the sale, so reports show both "earned" and "collected".

### 2.9 Day open / close (extra feature)
- **Open day**: enter the opening cash in the drawer (pre-filled from the previous closing amount).
- **Close day**: count the cash. The app shows expected vs counted and any **difference**, with a note. It also shows a day summary that can be shared on WhatsApp.
- This is optional. The app works fully without it, but it helps catch cash mistakes.

### 2.10 Reports, export & backup
- Monthly report (sales, spend by category, profit, top items, customers) as a shareable **PDF**.
- **CSV/Excel export** of every table for any date range.
- **Backup file**: a full JSON backup saved to the phone's Downloads, made by hand or automatically once a week. A **Restore** option can load it on a new phone even without Supabase.

### 2.11 Settings
- Shop name, UPI ID (for QR codes), currency format
- **Delivery charge**: one flat fee per order (₹), optional free delivery above ₹X
- Business day cut-off time
- Default payment mode, cash quick-amount chips
- Units and categories (add/rename)
- Language: English or Hinglish labels (optional, see open questions)
- App lock: optional 4-digit PIN when the app opens
- Sync: status, last sync time, "Sync now", Supabase connection
- Theme: light, dark or system

---

## 3. Offline-first and sync design (so nothing gets lost)

### 3.1 Principle
**The phone's database is the main working copy. The cloud is the backup and sync copy.** Each screen reads and writes the local database, so it is equally fast with or without internet. Syncing runs quietly in the background.

```
 Screen ──write──► Local DB (IndexedDB/Dexie) ──► Outbox queue ──(when online)──► Supabase
   ▲                    ▲                                                   │
   └──── read ──────────┴────────────── pull changes since last sync ◄──────┘
```

### 3.2 How it works
1. **Every record gets an ID made on the phone** (UUID), so it never needs the server to be created. This also stops duplicates when an upload is retried.
2. Each save writes the record **and** an outbox entry **in one local transaction**, so they always succeed or fail together.
3. The **sync engine** runs when the app opens, when the network comes back, every 30 seconds while online, and when "Sync now" is tapped. It:
   - **pushes** outbox entries in batches using `upsert`, which is safe to repeat, and removes each entry only after the server confirms it
   - **pulls** rows changed on the server since the last sync, using a server-set `server_updated_at` column, so a wrong clock on the phone cannot cause records to be missed
   - retries with increasing waits on failure and never drops data
4. **Deletes are "soft"**: `deleted_at` is set, which syncs like any other change.
5. **Conflicts** (only possible if two devices edit the same record offline): the newest change wins for that record. With one person using the app this almost never happens. Sales and purchases are mostly only created, not edited, which lowers the risk further.
6. **Totals are never stored as counters.** Customer visit counts, today's totals, the last price of an item and loyalty progress are always **calculated from the actual records**. Two devices can therefore never end up with different numbers.

### 3.3 Protection against data loss
| Risk | Protection |
|---|---|
| No internet for days | App works normally. The outbox keeps every change until it uploads |
| Browser clears website storage | The PWA asks Android for **persistent storage** (`navigator.storage.persist()`). The **APK** keeps storage as long as the app is installed |
| Phone lost, broken or reset | Everything already synced is in Supabase. Install the app on the new phone and it downloads everything |
| Data recorded offline and the phone breaks before syncing | Only the unsynced part is at risk. The sync dot shows what is pending, and the app reminds you if there has been no sync for over 24 hours |
| Supabase problem | Supabase daily backups, plus the weekly JSON backup file on the phone |
| App update while offline | The app's code is cached on the phone. Updates install in the background and apply on the next open. The database structure is versioned and upgraded automatically without losing data |
| Supabase free project pauses after a week of no activity | Daily use keeps it active. If it pauses, the app keeps working offline and the sync dot reports the problem. One click in Supabase resumes it, with no data lost |

### 3.4 Security without logins
There is no login screen, but the cloud database cannot be left open to anyone on the internet.
- On first setup, the app signs in once to a single Supabase account and **stays signed in on that device**. The person never sees a login screen again.
- Supabase **row-level security** allows only that account to read or write data.
- An optional **PIN lock** inside the app protects against someone else picking up the phone.

---

## 4. Data model

All money in **paise (integer)**. Every table has `id uuid`, `created_at`, `updated_at`, `server_updated_at`, `deleted_at`.

```
settings              key, value (json)

item_categories       name, kind (vegetable|packaged|gas|other), sort
items                 name, name_normalized (unique), alias, category_id, default_unit, archived
purchase_trips        started_at, vendor, declared_total, note
purchases             item_id, trip_id?, qty (decimal), unit, total_paise, purchased_at,
                      payment_mode (cash|online), vendor, note
restock_list          item_id, added_at, note, resolved_at, resolved_purchase_id?

gas_cylinders         purchase_id, status (in_stock|in_use|empty|returned),
                      bought_at, connected_at?, emptied_at?, returned_at?, price_paise

menu_categories       name, sort
menu_items            category_id, name, price_paise, variants[] (id, name, price_paise), available, archived, sort

customers             name, name_normalized, phone?, is_guest, guest_code?, merged_into_id?, note
sales                 bill_no, business_date, sold_at, customer_id?, is_delivery, address?,
                      subtotal_paise, delivery_fee_paise, discount_paise, discount_reason,
                      total_paise, cash_paise, online_paise, change_paise, credit_paise,
                      status (completed|voided), void_reason?, reward_redeemed_id?
sale_lines            sale_id, menu_item_id, variant_id?, name_snapshot, unit_price_paise,
                      qty, line_total_paise, is_reward
credit_payments       customer_id, amount_paise, cash_paise, online_paise, received_at, note

loyalty_rules         name, trigger_type (every_n|n_in_days|streak|spend), n, days?, spend_paise?,
                      min_bill_paise?, reward_type (free_item|percent|flat|text), reward_value,
                      reward_menu_item_id?, repeat, expiry_days?, apply_same_bill, active,
                      starts_on?, ends_on?
customer_rewards      customer_id, rule_id, unlocked_by_sale_id, unlocked_at,
                      status (waiting|redeemed|expired|cancelled), redeemed_sale_id?, expires_at?
offer_notes           title, details, starts_on, ends_on, show_on_sell

expense_categories    name, kind (fixed|variable)
recurring_costs       name, category_id, frequency (daily|weekly|monthly|yearly|every_n_days),
                      interval_n?, due_day?, starts_on, ends_on?, total_installments?,
                      auto_mark_paid, paused_from?, note
recurring_amounts     recurring_id, amount_paise, effective_from          -- price history
expenses              name, category_id, amount_paise, spent_at, payment_mode, remarks,
                      recurring_id?, period_key? ('2026-11' / '2026-11-05')   -- payment of a recurring cost

cash_sessions         business_date, opening_paise, counted_paise?, closed_at?, note
outbox (local only)   table, row_id, op, payload, attempts, last_error
```

Key calculations (all in one tested module, `lib/calc`):
- `expectedRecurringOutflow(range)` builds the schedule from `recurring_costs` and `recurring_amounts`, and returns what was due and what was paid
- `dailyProfit(date, mode)` and `rangeProfit(from, to, mode)` for both "Cash out" and "Spread" views
- `loyaltyProgress(customer)` and `evaluateRules(sale)`
- `gasStats()` for average life, predicted empty date and cost per day

---

## 5. Edge cases covered

**Dates and time**
- Everything uses India time (IST). Sales are grouped by business day, which follows the late-night cut-off.
- Back-dated entries always land on the correct calendar day.
- Monthly due days that do not exist in a month (29–31) move to the last day. Leap years are handled.
- A wrong phone clock does not break sync, which uses server time.

**Money**
- Integer paise everywhere. Zero, negative and empty amounts are rejected with a clear message.
- Customer pays more than the total → change is calculated. Pays less → credit or discount must be chosen.
- In a split payment, cash + online must equal the total (or be covered by credit).
- Free reward items are recorded at ₹0 but still counted as items sold.

**Menu and prices**
- Bills store names and prices at the time of sale. Changing prices never changes history.
- Archived items stay in reports. Sold-out items are hidden from the grid for that day only.
- Delivery adds one flat charge per order. Free delivery above ₹X is optional.

**Inventory**
- Duplicate item names are blocked (case and spacing ignored). Existing duplicates can be merged.
- Units can differ between purchases (kg vs g). Price per unit is converted to the item's main unit for comparisons.
- Gas: connecting a cylinder when none is in stock asks "Log a gas purchase first?". Wrong events can be corrected without breaking the averages.

**Customers and loyalty**
- Similar names → the app suggests the existing customer. Phone numbers tell people with the same name apart. Merge is available.
- Guest codes are random and checked for uniqueness.
- A voided sale reverses the loyalty progress it earned. Rewards can expire. A rule's changes apply from now on and do not cancel rewards already unlocked.
- Two rules unlocking on the same sale → both are stored. The banner lists them and the counter person chooses.

**Recurring costs**
- An EMI ends automatically after its last payment. Pause and resume. Amount changes from a date. Partial payments. Paying in advance for the next period.
- Overdue items stay highlighted until paid.

**App reliability**
- Double taps can never create duplicate sales or purchases.
- Every form keeps a draft if the app is closed halfway (e.g. a half-built cart).
- Large history (years of sales) stays fast thanks to indexes on dates and short-lived cached summaries.

---

## 6. Project structure

```
momos-spot/
  src/
    app/            routes, layout, bottom tab bar, sheets
    features/
      today/  stock/  gas/  sell/  menu/  calendar/  money/
      customers/  loyalty/  credit/  cash/  reports/  settings/
    db/             Dexie schema, versions/migrations, repositories
    sync/           outbox, push, pull, network status, retry
    lib/calc/       profit, recurring schedule, loyalty, gas stats (pure functions)
    lib/            money (paise), dates (IST, business day), ids, upi-qr, whatsapp share
    ui/             buttons, numeric keypad, sheets, chips, toasts, charts
  supabase/
    migrations/     SQL tables, triggers (server_updated_at), row-level security
  android/          Capacitor Android project (APK)
  tests/            unit tests (Vitest) for lib/calc + sync; end-to-end (Playwright) for main flows
```

Libraries: React 19, TypeScript, Vite, `vite-plugin-pwa` (offline caching and install), Dexie + `dexie-react-hooks` (live local queries), `@supabase/supabase-js`, Tailwind CSS, Recharts, date-fns + date-fns-tz, `qrcode.react` (UPI QR), Capacitor (Android APK), Vitest + Playwright.

---

## 7. Build phases

| Phase | Scope | Result |
|---|---|---|
| **1. Foundation** | Project setup, PWA install and offline caching, Dexie database, money/date helpers, tab bar and UI kit, Settings | App installs and opens offline |
| **2. Stock** | Item catalogue, fast purchase sheet, market trip mode, last-price popups, price history, shopping list, WhatsApp share | Daily market buying fully logged |
| **3. Gas** | Cylinder life cycle, stats, predictions, calendar markers | Gas buying and use tracked |
| **4. Sell** | Menu management with variants, cart, delivery pricing, customers and guests, cash/online/split, UPI QR, void/edit, live stats | Billing at the counter |
| **5. Calendar** | Month grid, day sheet, range filters and charts, business-day cut-off | Every day's activity at a glance |
| **6. Money** | Recurring costs and EMIs with schedule, deduction meter, one-time expenses, profit views, breakdowns | Real profit, daily and monthly |
| **7. Customers, loyalty and offers** | Profiles, merging, rules engine, reward banners, offer board | Loyalty programme running |
| **8. Credit and cash drawer** | Udhaar ledger, day open/close | Fewer cash leaks |
| **9. Sync and backup** | Supabase tables + security, outbox sync, status UI, JSON backup/restore, CSV/PDF export | Data safe in the cloud |
| **10. APK and polish** | Capacitor Android build, PIN lock, empty states, onboarding with sample menu, performance on a low-end phone, full test pass | Ready for daily use |

Sync (phase 9) is designed from phase 1: the data shapes, IDs and outbox exist from the start, so connecting Supabase later needs no rewrites.

**Testing**: unit tests for every calculation (profit, recurring schedules across month ends, loyalty triggers, gas averages, split payments). End-to-end tests for: logging a purchase offline → going online → data appears in Supabase; a full sale with split payment; loyalty unlock → redeem on the next sale; voiding a sale.

---

## 8. Open questions

All answered. See the owner's answers at the top of this plan.
