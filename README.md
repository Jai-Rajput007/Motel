# Virasat Palaces & Resorts — Hotel Website, Booking Engine, PMS & CRM

A complete, working showcase for pitching web development to hotels.
It shows a fictional Indian heritage hotel group with six properties, built as four connected products:

| Product | What it shows | Try it |
|---|---|---|
| **Luxury guest website** | Editorial, photography-led design with Indian heritage motifs (jaali, mehrab arch, lotus), English/Hindi and ₹/$ switchers | `/` |
| **Direct booking engine** | Live availability, seasonal & weekend pricing, rate plans, add-ons, promo codes, GST, QR voucher, confirmation email, manage-booking | `/book` |
| **Hotel management system (PMS)** | Dashboard KPIs, front desk, drag-and-drop tape chart, housekeeping board and attendant app, rates & stop-sell, folios and GST invoices, maintenance, staff roster, inventory and purchase orders, channel manager, reports, role-based access, audit log | `/admin` |
| **CRM** | Guest 360° profiles, segment builder, wedding/MICE sales pipeline (Kanban) with proposals, email/WhatsApp campaigns, automations, loyalty tiers, reviews & NPS | `/admin/crm/guests` |

The three parts share one data layer. A booking made on the website immediately shows up in Reservations and on the tape chart, gets a room (the room optimiser shuffles future bookings when needed), creates or updates the guest's CRM profile, awards loyalty points and allocates amenity stock. A wedding enquiry arrives as a new lead on the pipeline.

## Pitch in five minutes

1. Open the homepage and let the hero and the scroll do the talking.
2. Click **Take the demo tour** (bottom right). It walks through every step below.
3. Book a suite at Jal Mahal Niwas with the promo code `VIRASAT10`, add a candlelit dinner and pay (test mode).
4. On the confirmation page, click **See it in the Hotel Admin** to see the booking with its assigned room.
5. Open the **Tape Chart** and drag a booking to another room. Conflicts are blocked.
6. Open **CRM → Guests** to see the guest's profile, which was created automatically.
7. Submit a wedding enquiry at `/weddings`. It appears on **CRM → Sales Pipeline**.
8. Show **Housekeeping**, **Inventory** (auto-reorder) and **Staff roster**, and switch roles from the avatar menu to show role-based access.
9. Finish on **`/for-hoteliers`**, the page that sells your services.

Demo controls in the tour panel: **Simulate busy day** creates 10 new bookings, and **Reset** restores the original data.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

Requires Node 18+.

## Deploy (free)

- **Vercel:** import the repository. The framework is detected as Vite. `vercel.json` already rewrites all routes to the SPA.
- **Netlify:** build command `npm run build`, publish directory `dist`. `public/_redirects` handles SPA routes.

## Make it yours

- **Your contact details:** edit `src/config/developer.ts`. It fills the *For Hoteliers* page and the footer credit.
- **Hotels, rooms, dining and experiences:** `src/data/hotels.ts`
- **Offers, rate plans, add-ons, promo codes, loyalty tiers and journal:** `src/data/content.ts`
- **Photography:** `src/data/images.ts` maps names to Unsplash photo IDs.
- **Brand colours and fonts:** the `@theme` tokens in `src/index.css`
- **Demo data volume and realism:** `src/data/seed.ts`. It is deterministic and re-generated relative to today's date.

## Project structure

```
src/
  App.tsx                 routes (guest site + lazy-loaded admin)
  config/developer.ts     your name, email, phone, WhatsApp, links
  data/                   hotels, content, images, seed generator
  lib/                    pricing engine, selectors, utils, hooks
  store/useStore.ts       single Zustand store (website ⇄ PMS ⇄ CRM) with persistence
  components/guest/       header, footer, booking bar, page hero
  components/admin/       admin UI kit, booking drawer, GST invoice
  components/ui/          primitives, range calendar, lightbox, map
  components/DemoGuide.tsx  guided pitch tour
  pages/guest/            public website pages and booking flow
  pages/admin/            PMS modules
  pages/crm/              CRM modules
  pages/pitch/            For Hoteliers + Behind the Build
```

## What is real and what is simulated

**Working:** availability and pricing, promo codes, GST, room assignment and optimisation, check-in/out, folios and invoices, tape-chart moves, housekeeping, roster, inventory and POs, segments, pipeline, campaigns (simulated metrics), loyalty, reviews, role-based navigation, CSV export.

**Simulated for the demo:**
- Data lives in the visitor's browser (localStorage) and can be reset.
- Payments run in test mode.
- Emails and WhatsApp messages are previewed, not sent.
- OTA channel sync is illustrative.

For a real hotel, the store's actions become calls to a real backend (e.g. Supabase or a Node/Postgres API), with authentication and a payment gateway such as Razorpay.

## Credits

- Photography: [Unsplash](https://unsplash.com) (Unsplash License). Maps: © OpenStreetMap contributors, © CARTO.
- Fonts: Cormorant Garamond, Jost, Tiro Devanagari Hindi (Google Fonts).
- "Virasat Palaces & Resorts" is a fictional brand. Any resemblance to real hotels is coincidental.
