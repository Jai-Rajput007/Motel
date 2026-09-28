# Virasat Palaces & Resorts — Portfolio Showcase Plan

> **Status: implemented.** See `README.md` for how to run, deploy and pitch it.
> Differences from the original plan:
> - The 360° virtual tour became a full-screen gallery lightbox, because there are no free-licence panoramas for these properties.
> - The guided tour is a custom built-in panel instead of driver.js.
> - The Hindi toggle translates navigation and key booking UI, not every page of copy.

> A fictional Indian heritage hotel group, built as a live, clickable pitch:
> **a luxury guest website + a working Reservation Engine + a Hotel Management System (PMS) + a CRM**, all connected.
> Anything a guest does on the public site shows up instantly in the back office. That link between the two sides is the main selling point.

---

## 1. Goals

| Goal | How the site gets there |
|---|---|
| Hoteliers are impressed within about 10 seconds | Editorial, photography-led design modelled on Taj, Oberoi, ITC and Leela sites. It should look nothing like a template |
| Show that I can build the guest-facing side | A full multi-property luxury website with a real booking flow |
| Show that I can build operations software | A PMS covering rooms, housekeeping, staff, inventory, billing and reports |
| Show that I can help them win more guests | A CRM with guest profiles, leads pipeline, campaigns, loyalty and reviews |
| Make the pitch easy to deliver | A guided demo mode, a "For Hoteliers" page, a role switcher and a one-click demo reset |

**Brand (fictional, so there is no copyright or trademark risk):** *Virasat Palaces & Resorts*. "Virasat" means heritage. The tagline would be something like *"Where India's Legacy Lives On — Since 1911"*. The name can be changed.

It is a group of 6 properties, which also lets the PMS show multi-property support:
1. **Amer Bagh Palace, Jaipur**: royal Rajput palace
2. **Jal Mahal Niwas, Udaipur**: lake palace
3. **Ghat House, Varanasi**: riverside haveli
4. **Kettuvallam Retreat, Kumarakom (Kerala)**: backwater villas and Ayurveda
5. **Casa Fontainhas, Goa**: Indo-Portuguese villa
6. **Ridge Lodge, Shimla**: colonial hill lodge

---

## 2. Design Direction: "Quiet Luxury, Indian Soul"

**Principles for avoiding the "AI slop" look**
- Photography does the work. Full-bleed images, generous whitespace, and a 12-column grid used in an editorial way with asymmetric blocks.
- No purple gradients, glassmorphism, emoji, generic 3-card grids everywhere, or bouncy animations.
- Motion is restrained: slow Ken Burns on the hero, fade-and-rise on scroll, subtle parallax, and hover image zoom capped at 1.03×.
- Copy reads like hospitality writing ("An evening on the ramparts, lit by a thousand diyas…") and never like placeholder filler.

**Palette**
| Token | Hex | Use |
|---|---|---|
| Ivory | `#F6F1E7` | Page background |
| Sandstone | `#E9DFCC` | Section alternation |
| Kohl | `#1C1A17` | Text, dark sections |
| Antique Gold | `#B08D57` | Hairlines, accents, icons |
| Sindoor | `#9E3B2A` | Primary CTA, highlights |
| Peacock | `#1F4E5A` | Secondary accent, links, dashboard primary |

**Typography**
- Display: *Cormorant Garamond*, a high-contrast serif set with wide tracking in small caps for eyebrows
- Body/UI: *Jost* or *Manrope*, a clean geometric sans
- Devanagari: *Tiro Devanagari Hindi* for the Hindi toggle and decorative accents

**Indian heritage motifs, used sparingly**
- SVG **jaali** (lattice) patterns as section backgrounds at about 4% opacity
- **Mehrab (arch)**-shaped image masks on feature photos
- Thin gold **border rules** with a small lotus or paisley ornament as section dividers
- A **block-print** texture in the footer, and an animated **diya/lotus** preloader

**Back office look:** the same fonts and palette in a calmer, denser "product" style. It has a light theme and a dark theme so it feels like real SaaS.

---

## 3. Site Map

### A. Guest Website (public)
| Page | Key components |
|---|---|
| **Home** | Video/Ken-Burns hero · sticky **booking bar** (destination, dates, guests, promo) · "Our Legacy" timeline since 1911 · destinations carousel · signature experiences · dining · Ayurveda spa · offers · press quotes and testimonials · gallery mosaic · newsletter · rich footer |
| **Destinations** | Filterable property grid plus an **interactive map of India** (Leaflet/OSM) with pins |
| **Hotel detail** | Hero gallery with lightbox · overview and history · rooms and suites · dining · experiences · amenities icons · **360° virtual tour** (Pannellum) · location map · reviews · "Book this hotel" |
| **Room detail** | Gallery · size, bed, view · amenities · **rate calendar** with nightly prices · rate plans · book |
| **Experiences** | Royal dinner on the ramparts, heritage walks, cooking classes and similar, each with its own **add-on booking** |
| **Dining** | Restaurant pages with menus and a **table reservation** form |
| **Weddings & Events** | Venue capacity table · wedding gallery · **multi-step enquiry form** that becomes a lead in the CRM |
| **Spa & Wellness** | Ayurveda therapies and treatment booking |
| **Offers** | Package cards with promo codes that actually work in the booking engine |
| **Virasat Circle (loyalty)** | Tier comparison (Silver/Gold/Platinum/Maharaja), benefits, points calculator |
| **Journal** | Blog on heritage, cuisine and festivals, with article pages |
| **Gift Cards** | Choose an amount and design, then preview the card |
| **Contact** | Property contacts, map, and an enquiry form that also flows into the CRM |
| **Manage Booking** | Look up a booking by reference and email, then modify or cancel it |
| **Guest Portal** | My stays, points balance, preferences, and invoices to download |

Across the whole site there are EN/हिंदी language toggle, ₹ INR/$ USD currency toggle, WhatsApp chat button, cookie banner, responsive mobile nav, SEO meta tags and schema.org `Hotel` markup.

### B. Reservation Engine (guest-facing flow)
1. **Search**: destination, dates (range picker with **price-per-night calendar**), rooms and guests (adults, children with ages)
2. **Select room and rate**: live availability, rate plans (Room Only / Breakfast / Half Board / Non-Refundable −15%), "Only 2 left" scarcity, and comparison
3. **Enhance stay**: add-ons (airport transfer, dinner, spa, decorations for occasions)
4. **Guest details**: form with validation, special requests, arrival time, GST details for corporates
5. **Payment**: mock payment gateway UI (card/UPI/net banking) with a clearly marked "test mode"
6. **Confirmation**: booking reference, **QR code**, printable/PDF voucher, "add to calendar", and a preview of the **HTML confirmation email**

Behind the scenes it runs dynamic pricing (weekend and festive-season uplifts), promo code validation, minimum-stay rules, inventory decrement, overbooking protection, and a cancellation policy engine.

### C. Hotel Management System (`/admin`, demo login)
A **role switcher** changes what each role sees: Owner · General Manager · Front Desk · Housekeeping · Sales/CRM. There is also a **property switcher** (all 6 hotels or one hotel).

| Module | Features |
|---|---|
| **Dashboard** | KPIs (Occupancy %, ADR, RevPAR, revenue, arrivals/departures/in-house today), revenue trend, booking source mix, occupancy forecast, alerts feed |
| **Front Desk** | Arrivals and departures lists · **check-in** (ID capture, room assignment, key issued) · **check-out** (folio settlement) · walk-in booking |
| **Tape Chart** | Room × date grid. Drag bookings to move or extend them, colour-coded by status |
| **Reservations** | Searchable and filterable table · booking details · modify, cancel, no-show |
| **Rooms & Rates** | Room types, room inventory, **rate manager** (seasonal pricing and rate plans), availability and stop-sell calendar |
| **Housekeeping** | Room status board (Clean / Dirty / Inspected / Out-of-Order) · assign attendants · mobile-style task view |
| **Staff** | Directory by department · **shift roster** (weekly grid) · attendance · leave requests · task assignment |
| **Inventory** | Stock items (linen, amenities, minibar, F&B, maintenance) · par levels · **low-stock alerts** · purchase orders · vendors · stock movement log |
| **Billing / Folio** | Guest folio with room charges, F&B and extras · **GST-compliant invoice** (12%/18% slabs) · split payments · printable invoice |
| **Maintenance** | Tickets with priority, assignee and status, linked to a room that goes Out-of-Order |
| **Channel Manager (mock)** | OTA connections with sync status, rate parity view |
| **Reports** | Occupancy, revenue, source, and housekeeping productivity reports, exportable to **CSV/PDF** |
| **Settings** | Property profile, taxes, policies, users and roles, **audit log** |

### D. CRM (`/admin/crm`)
| Module | Features |
|---|---|
| **Guest 360° Profiles** | Stay history, lifetime value, preferences (pillow type, diet, room location), occasions (birthday, anniversary), notes, tags, communication timeline |
| **Segments** | Rule builder, for example "Stayed 2+ times AND spend > ₹1L", "Lapsed 12 months", "Corporate", "Wedding leads" |
| **Leads Pipeline** | **Kanban** for Weddings, MICE and Corporate: New → Contacted → Site Visit → Proposal → Negotiation → Won/Lost. Includes deal value and a follow-up reminder |
| **Campaigns** | Email and WhatsApp composer with heritage-styled templates, audience picker, schedule, and mock metrics (open rate, CTR, bookings attributed) |
| **Automations** | Visual rules: pre-arrival email at −3 days, birthday offer, post-stay review request, win-back for lapsed guests |
| **Loyalty** | Members by tier, points ledger, manual adjustment, tier upgrade suggestions |
| **Reviews & Feedback** | Aggregated reviews with ratings, NPS score, sentiment tags, reply-to-review |
| **Tasks** | Sales follow-ups and a calendar |

### E. Pitch Layer (for me as a developer)
- **"For Hoteliers" page** (`/for-hoteliers`): the business pitch, covering problems solved, the 4 products, a feature matrix, before/after results, the tech stack, my process (Discover → Design → Build → Launch → Support), optional packages, FAQ, and a **Hire me / Book a call** form
- **Guided Demo Tour**: a floating "▶ Take the tour" button starts a step-by-step walkthrough. For example: *book a room on the site → watch it appear on the tape chart → see the new guest profile in the CRM → watch inventory update*
- **Demo control panel**: "Reset demo data", "Simulate busy day" (generates bookings), and a role switch
- **Subtle "Crafted by [Your Name]" credit** in the footer, linking to the pitch page
- **Case-study page** (`/behind-the-build`): design decisions, Lighthouse scores, accessibility notes, architecture diagram

---

## 4. The Connected Ecosystem (key demo moment)

```
Guest books on website ──► Reservation Engine ──► PMS: reservation + tape chart + inventory − 1
          │                                             │
          ├──► CRM: guest profile created/updated        ├──► Housekeeping: room assigned on check-in
          ├──► Email: confirmation preview               └──► Billing: folio opened
Wedding enquiry form ──► CRM Leads Kanban (New)
Newsletter signup   ──► CRM Segment "Subscribers"
Review after stay   ──► CRM Reviews + NPS
```

All of this uses one shared data store, so every part of the pitch is live and nothing is a static screenshot.

---

## 5. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **React 18 + TypeScript + Vite** | Fast, modern, and what clients recognise |
| Routing | React Router | Handles both the guest site and the admin app |
| Styling | **Tailwind CSS** with custom design tokens, plus a few hand-written components | A consistent, bespoke look |
| Animation | Framer Motion | Tasteful scroll and page transitions |
| State / "backend" | **Zustand + localStorage persistence** behind a **service/API layer** | Works with no server and deploys for free. The layer can later be swapped for a real API (Supabase/Node/Postgres) without touching the UI |
| Seed data | Hand-written, realistic data: 6 hotels, about 180 rooms, 300 bookings, 60 staff, 120 inventory items, 250 guests | The dashboards look alive |
| Charts | Recharts | KPIs and reports |
| Drag & drop | dnd-kit | Tape chart and Kanban |
| Dates | date-fns + react-day-picker | Booking calendars |
| Maps / 360° | Leaflet (OpenStreetMap), Pannellum | Neither needs an API key |
| i18n | react-i18next | EN / Hindi |
| Other | lucide-react icons, qrcode, react-to-print / jsPDF, driver.js (guided tour) | |
| Images | **Unsplash / Pexels** (free commercial licence), optimised to WebP, lazy-loaded | No copyright issues. No Taj/Oberoi assets are used |
| Hosting | **Vercel or Netlify** (free), or GitHub Pages | A shareable link for pitches |

Quality targets: Lighthouse at least 90 on all four categories, fully responsive (360px to 4K), keyboard-accessible, and WCAG AA contrast.

---

## 6. Folder Structure (planned)

```
src/
  app/            routes, layouts (GuestLayout, AdminLayout)
  design/         tokens, typography, motifs (jaali SVGs, dividers, arch masks)
  components/     ui/ (Button, Input, Modal, DatePicker…), guest/, admin/
  features/
    booking/      search, rate engine, checkout steps
    pms/          dashboard, frontdesk, tapechart, housekeeping, staff, inventory, billing, reports
    crm/          guests, segments, pipeline, campaigns, automations, loyalty, reviews
    pitch/        for-hoteliers, tour, demo controls
  services/       api layer (mock now, real backend later)
  store/          zustand slices + persistence
  data/           seed generators
  i18n/           en.json, hi.json
public/images/    optimised photography
```

---

## 7. Build Phases

| Phase | Scope | Result |
|---|---|---|
| **1. Foundation** | Vite + TS + Tailwind setup, design tokens, fonts, motifs, core UI kit, layouts, seed data and store | The design system and data are ready |
| **2. Guest Website** | Home, Destinations and map, Hotel and Room detail, Experiences, Dining, Weddings, Spa, Offers, Loyalty, Journal, Contact | A beautiful public site |
| **3. Reservation Engine** | 6-step booking flow, pricing rules, promo codes, confirmation/QR/voucher/email preview, Manage Booking, Guest Portal | Real bookings work |
| **4. PMS** | Dashboard, Front Desk, Tape Chart, Reservations, Rates, Housekeeping, Staff, Inventory, Billing, Maintenance, Reports, Settings | Operations side is complete |
| **5. CRM** | Guest 360, Segments, Leads Kanban, Campaigns, Automations, Loyalty, Reviews | Growth side is complete |
| **6. Pitch Layer** | For Hoteliers page, guided tour, demo controls, Behind the Build | Ready to present |
| **7. Polish & Launch** | i18n, responsiveness, accessibility, performance, SEO, deployment | Live shareable URL |

Each phase is committed and pushed separately so progress can be reviewed along the way.

---

## 8. How to Pitch With It (suggested 5-minute script)

1. **Open the homepage** and let the hero and scroll carry the first impression. Then say: *"This is the kind of brand experience I build."*
2. **Book a suite** in Udaipur with a promo code, walk through the add-ons, and show the confirmation, QR code and email.
3. **Switch to Admin** and show the booking on the tape chart. Drag it to a different room, then check the guest in.
4. **Open the CRM**: the guest's profile was created automatically. Show the wedding lead Kanban and a campaign.
5. **Show inventory and staff**: a low-stock alert and the housekeeping board. Then say: *"One system instead of five spreadsheets."*
6. **Finish on the For Hoteliers page**, which covers packages, process and contact.

---

## 9. Out of Scope (for now) / Future Upgrades
- A real backend and database (Supabase/Postgres), with authentication and real payments (Razorpay/Stripe)
- Real OTA channel-manager integrations
- Real email and WhatsApp sending
- A native mobile app for housekeeping

All of these can be sold as the "production" step once a client signs.
