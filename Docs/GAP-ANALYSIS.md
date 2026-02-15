# Tico Market: PRD vs. Codebase Gap Analysis

**Date:** February 15, 2026
**PRD Version:** 1.0
**Scope:** Web app only (mobile-first PWA)

---

## Table of Contents

1. [What Exists and Aligns Well](#1-what-exists-and-aligns-well)
2. [Partial Implementations (Need Enhancement)](#2-partial-implementations)
3. [Missing Features (PRD-Specified)](#3-missing-features)
4. [Overlooked / Structural Concerns](#4-overlooked--structural-concerns)
5. [Priority Recommendations](#5-priority-recommendations)

---

## 1. What Exists and Aligns Well

These features are implemented and reasonably aligned with the PRD:

| Feature | PRD Section | Status | Notes |
|---------|-------------|--------|-------|
| **Listing CRUD** | 4.1.1 | Good | Create, read, update, delete with image upload |
| **Category filters** | 4.1.3 | Good | 9 categories with emoji chips |
| **Map-first browse** | 4.1.3 | Good | Leaflet map view with listing markers, toggle between grid/map |
| **Feed view** | 4.1.3 | Good | Card grid sorted by proximity, recency, or price |
| **Geo-radius search** | 4.1.3 | Good | Haversine distance filtering on API |
| **Pin-drop locations** | 5.1 | Good | GPS lat/lng on listings, no typed addresses required |
| **In-app chat** | 4.4 | Good | Buyer-seller messaging per listing with SSE real-time updates |
| **SINPE Movil support** | 4.5.1 | Good | Admin-configured phone/holder, buyer enters reference |
| **Card payments (Stripe)** | 4.5.1 | Good | Full Stripe Checkout with webhook lifecycle |
| **IVA 13% tax** | 5.5 | Good | Calculated and added as Stripe line item |
| **Driver onboarding** | 4.3.1 | Good | Application with face capture, license upload, admin verification |
| **Driver live tracking** | 4.3.4 | Good | SSE-based live position streaming on map |
| **Driver coverage/vehicle** | 4.3.1 | Good | Vehicle type, service radius, specialties |
| **Delivery requests + bidding** | 4.3.2/4.3.3 | Good | Broadcast/manual/auto requests, bids, negotiations |
| **Star ratings** | 4.6 | Good | 1-5 star reviews on orders |
| **Community reporting** | 4.6 | Good | Flag listings/users, admin moderation queue |
| **Admin moderation** | 4.6 | Good | Listing hide/restore, user roles, report review, driver verification |
| **Bilingual UI** | 5.3 | Good | EN/ES toggle with ~50 translated keys |
| **CSRF protection** | 7.4 | Good | Token-based CSRF on all mutations |
| **Rate limiting** | 7.4 | Good | Per-IP rate limits on auth, messages, general endpoints |
| **Input sanitization** | 7.4 | Good | HTML/control char stripping on user inputs |
| **SEO** | — | Good | Sitemap, robots.txt, OG/Twitter cards per listing |
| **Favorites** | — | Good | Heart toggle with optimistic updates |
| **Seller profiles** | — | Good | `/seller/[id]` with listings, rating, pickup locations |

---

## 2. Partial Implementations (Need Enhancement)

### 2.1 Feria Module (PRD 4.2) — CRITICAL GAP

**What exists:** A `MarketEvent` type that can be attached to a listing's `pickupConfig`. Drivers can sign up for events via `event_drivers`. The data model supports attaching a feria name, date, time window, and Waze link to individual listings.

**What's missing (the entire Feria Module):**
- [ ] **Feria profile pages** — dedicated `/feria/[id]` route with location, schedule, description, vendor list, photos
- [ ] **Feria database table** — `ferias` table with schedule, location, organizer, description
- [ ] **Feria organizer role** — ability for organizers to claim and manage feria profiles
- [ ] **Vendor storefronts within ferias** — vendors link to ferias, post weekly availability
- [ ] **Follow a feria** — users follow ferias for reminders/notifications
- [ ] **Pre-orders with QR code** — buyer pre-orders for feria pickup, gets confirmation QR
- [ ] **Feria delivery batching** — group orders by feria location for efficient multi-stop driver pickup
- [ ] **Feria filter on browse** — "show items at upcoming ferias" filter
- [ ] **Feria browse page** — `/ferias` listing all ferias with map

### 2.2 Fulfillment Options (PRD 4.1.2) — HIGH

**What exists:** Two checkboxes: "Express Available" and "Pickup Available."

**What's missing:**
- [ ] **Seller Delivers** — seller has own delivery, sets own fee
- [ ] **Open to Delivery** — seller allows delivery but buyer arranges their own driver
- [ ] **Platform Delivery** — platform matches a driver from the pool
- [ ] **Shipping** — bus encomienda or courier for nationwide non-perishable goods
- [ ] Per-listing fulfillment configuration (multiple options per listing)

### 2.3 Listing Creation (PRD 4.1.1) — HIGH

**What exists:** Title, price, category, description, single image, location, delivery/pickup toggles.

**What's missing:**
- [ ] **Multiple photos** (up to 8) — DB has single `image_url`, not an array
- [ ] **Condition field** — new, like new, good, fair, for parts
- [ ] **Item type** — physical good, food/produce, service, rental, free/giveaway
- [ ] **Price type** — negotiable, free, contact for price (currently free-text string)
- [ ] **Availability** — always available, specific dates/times, or linked to feria schedule
- [ ] **Approximate location** until transaction agreed (privacy)
- [ ] **On-device image compression** before upload

### 2.4 Delivery System (PRD 4.3.2) — MEDIUM

**What exists:** Listing delivery, on-demand errand, scheduled delivery (one-time).

**What's missing:**
- [ ] **Feria batch delivery** — multi-stop pickup from a single feria
- [ ] **Recurring/scheduled delivery** — weekly vegetable box, subscription-type deliveries
- [ ] **Return/exchange delivery** — return item from buyer to seller
- [ ] **Flat rate by distance pricing** — platform-calculated suggested fee based on distance/conditions
- [ ] Dynamic delivery fee (currently hardcoded at ₡2,500 constant `DELIVERY_FEE_DISPLAY`)

### 2.5 Internationalization (PRD 5.3) — MEDIUM

**What exists:** ~50 translated keys for UI labels in EN/ES. Language toggle works.

**What's missing:**
- [ ] Comprehensive translation coverage — many components have hardcoded English strings (admin, delivery, driver pages, error messages, form labels, placeholders)
- [ ] Costa Rican Spanish idioms — "usted" form, "pura vida," "mae," "feria" terminology throughout
- [ ] Currency display convention — period as thousands separator for colones (₡5.000)
- [ ] Complete translation of all system messages, notifications, button labels

### 2.6 Verification Badges (PRD 4.6) — MEDIUM

**What exists:** Single boolean `verified` on profiles + driver `verification_status` with license upload flow.

**What's missing:**
- [ ] **Phone verification** badge
- [ ] **Cedula verification** badge
- [ ] **Business verification** badge (registered businesses)
- [ ] **Feria vendor verification** badge (confirmed by organizer)
- [ ] Multiple badge types displayed on profiles (not just one boolean)

### 2.7 Driver Reviews (PRD 4.6) — MEDIUM

**What exists:** `driver_profiles.rating` field exists, displayed on driver cards. Reviews table links to orders/sellers.

**What's missing:**
- [ ] `driver_id` on `reviews` table — buyers cannot rate drivers separately from sellers
- [ ] Driver review submission flow after delivery completion
- [ ] Aggregate driver rating calculation from actual reviews

---

## 3. Missing Features (PRD-Specified)

### 3.1 Payments & Trust — CRITICAL

| Feature | PRD Section | Details |
|---------|-------------|---------|
| **Escrow system** | 4.5.2 | Funds held until buyer confirms receipt. Auto-release after 24h. Currently Stripe captures immediately. |
| **Cash on Delivery** | 4.5.1 | Essential for users without bank accounts and tourists. Not implemented at all. |
| **USD pricing** | 4.5.3 | Listings can only be priced in CRC. No USD option, no live conversion rate display. |
| **Dispute resolution** | 4.6 | No dispute table, no escalation flow, no evidence review process for escrowed transactions. |

### 3.2 Communication — HIGH

| Feature | PRD Section | Details |
|---------|-------------|---------|
| **AI auto-translation** | 4.4 | No translation API integration. Messages/listings not auto-translated between ES/EN. |
| **Three-way delivery chat** | 4.4 | No buyer-seller-driver group chat when delivery is arranged. |
| **Voice notes** | 4.4 | Chat is text-only. No audio recording/playback. Critical for Costa Rican navigation fallback. |
| **Quick reply templates** | 4.4 | No "Still available," "Sold," "Price is firm" quick buttons for sellers. |
| **WhatsApp bridge** | 4.4 | No WhatsApp Business API integration for notification bridging. |
| **Location sharing in chat** | 4.4 | Cannot share pin drops in chat messages. |

### 3.3 Discovery — MEDIUM

| Feature | PRD Section | Details |
|---------|-------------|---------|
| **Saved searches & alerts** | 4.1.3 | No saved search functionality. No push notifications for matching listings. |
| **Language toggle per listing** | 4.1.3 | No one-tap translation to see listing in other language. |
| **Delivery filter** | 4.1.3 | No "show only deliverable items" or "only pickup near me" filter. |
| **Full-text search** | 7.2 | PRD specifies Elasticsearch with bilingual fuzzy matching. Currently uses SQL `ILIKE` which is limited. |

### 3.4 Trust & Safety — MEDIUM

| Feature | PRD Section | Details |
|---------|-------------|---------|
| **Response time indicator** | 4.6 | No tracking of seller response speed on profiles. |
| **Transaction count display** | 4.6 | No public "X completed transactions" on profiles. |
| **Progressive trust system** | 10 | No lower limits for new accounts. |
| **Prohibited items enforcement** | 5.5 | No listing content moderation rules or flagging during creation. |
| **Driver emergency button** | 5.5 | No SOS/emergency feature in driver interface. |

### 3.5 Technical — MEDIUM

| Feature | PRD Section | Details |
|---------|-------------|---------|
| **Offline capability** | 5.2 | No service worker, no local queue, no cached tiles, no optimistic offline-first architecture. |
| **PWA manifest** | 7.1 | No `manifest.json`, not installable as PWA. |
| **Push notifications** | 7.2 | No Firebase Cloud Messaging or web push setup. |
| **Image compression** | 5.2/4.1.1 | No on-device compression before upload. |
| **Low-bandwidth optimization** | 5.2 | No aggressive image optimization, lazy loading, or 2G/3G-friendly mode. |
| **Named/saved locations** | 5.1 | Users can't save locations like "My house" or "Mom's farm." |

---

## 4. Overlooked / Structural Concerns

These are issues not explicitly missing from a feature checklist but that could undermine the platform's success:

### 4.1 Data Model Gaps

1. **Listings `price` is a free-text string** — not a numeric field. This makes price range filtering unreliable (the API parses it with regex), prevents proper sorting, and blocks currency conversion. Should be a numeric `price_cents` + `currency` enum.

2. **No `listing_images` table** — single `image_url` column. Adding multiple photos requires a schema migration to either a JSONB array or a separate `listing_images` table.

3. **No `ferias` table** — the entire feria module has no data model. Needs: `ferias`, `feria_vendors`, `feria_pre_orders` tables at minimum.

4. **No `disputes` table** — escrow and dispute resolution need their own lifecycle tracking.

5. **Orders `id` is generated from epoch** (`'order-' || epoch`) — risk of collision under concurrent inserts. Should use UUID.

6. **Denormalized names everywhere** — `buyer_name`, `seller_name`, `driver_name` are stored as copies. When a user updates their name, all historical records show stale data. This is a design choice but should be intentional.

### 4.2 Security Concerns

1. **Rate limiting is in-memory** — resets on server restart and doesn't work across multiple Cloudflare Workers instances. Needs Cloudflare KV or Durable Objects for distributed rate limiting.

2. **No input validation on listing prices** — free-text string means users could enter anything. No server-side enforcement of valid price formats.

3. **Driver face images stored in public bucket** — `supabase.storage.from('listings')` with a public URL. Driver face images and license documents should be in a private bucket.

4. **No email verification enforcement** — Supabase sends confirmation emails but the app doesn't check `email_confirmed_at` before allowing full access.

5. **SINPE Movil payments are trust-based** — buyer enters a reference number, but there's no verification that the transfer actually occurred. This is a fraud vector.

### 4.3 Performance & UX Concerns

1. **No image optimization pipeline** — raw uploaded images served directly. No resizing, no WebP conversion, no thumbnails. On slow connections this will be painful.

2. **No pagination on chat/messages** — all conversations loaded at once. Will not scale.

3. **Homepage loads ALL listings then filters client-side** via `ListingsContext` — the API supports pagination but the context stores everything in memory. With 500+ listings this will degrade.

4. **No search debounce on API calls** — the 300ms debounce is on the input, but every keystroke still hits state. The API call pattern should be optimized.

5. **Leaflet CSS loaded from CDN** — if CDN is down or slow in Costa Rica, maps break. Should be bundled.

6. **No loading states on many pages** — driver profile, seller profile, delivery pages may flash empty before data loads.

7. **No empty state designs** — what does a new user see with zero listings? Zero messages? Zero orders?

### 4.4 Business Logic Gaps

1. **No seller onboarding flow** — PRD emphasizes that listing creation should be < 60 seconds. Current flow works but there's no guided first-listing experience.

2. **No order confirmation by seller** — buyer creates an order and it's immediately `pending`. The PRD implies sellers should confirm availability before an order proceeds.

3. **No delivery fee calculation** — hardcoded ₡2,500 regardless of distance. PRD specifies distance-based flat rate with road condition and time-of-day adjustments.

4. **No notification system** — no push, no email notifications for new messages, order updates, delivery status changes. Users must be in the app to see updates.

5. **No onboarding for different user personas** — expats, tourists, Ticos, feria vendors each have different needs. No tailored first-run experience.

6. **No "negotiable" price handling** — a core part of Costa Rican commerce culture. No offer/counter-offer flow on listings.

7. **No listing expiry** — listings stay forever. No auto-archiving, no "is this still available?" prompts.

### 4.5 Mobile-First Concerns

1. **No PWA manifest** — can't be installed to home screen, no app-like experience.
2. **No mobile-specific navigation patterns** — bottom tab bar, swipe gestures, pull-to-refresh.
3. **Touch targets may be too small** — need audit against 44px minimum.
4. **Camera integration only for driver face capture** — should also be available for listing photo capture (direct camera, not just file picker).
5. **No haptic feedback or native-feeling interactions**.

### 4.6 Missing Costa Rica-Specific UX

1. **Waze deep links** — PRD mentions Waze as dominant navigation. Only exists in MarketEvent links, not for general delivery navigation.
2. **Landmark-based directions** — no structured "directions" field for locations ("200m south of the church").
3. **Costa Rican phone number validation** — no format validation for SINPE Movil numbers (8-digit format).
4. **Colones formatting** — inconsistent. Should always use ₡ with period thousands separator (₡5.000).

---

## 5. Priority Recommendations

### Tier 1: Foundation Fixes (Do First)
These are structural issues that block or complicate everything else:

1. **Fix the price data model** — migrate `price` from TEXT to numeric `price_cents` INT + `currency` TEXT enum
2. **Add `listing_images` support** — migrate to JSONB array or separate table for multiple photos
3. **Add PWA manifest + service worker** — make installable, enable offline basics
4. **Add push notification infrastructure** — web push via service worker for messages, orders, delivery updates
5. **Fix image pipeline** — add server-side resizing/compression, serve WebP with fallback, generate thumbnails
6. **Complete i18n coverage** — audit every component, translate all hardcoded strings

### Tier 2: Core Feature Gaps (High Impact)
These are the features that differentiate Tico Market:

7. **Build the Feria Module** — `ferias` table, feria profiles, vendor storefronts, pre-orders, feria browse page
8. **Add Cash on Delivery** as payment method
9. **Add USD pricing + live conversion** display
10. **Implement dynamic delivery fee** based on distance calculation
11. **Add listing condition, item type, and fulfillment options** to listing creation
12. **Add quick reply templates** to chat
13. **Build three-way delivery chat** (buyer + seller + driver)
14. **Add seller order confirmation step** before order proceeds

### Tier 3: Trust & Growth (Medium Impact)
15. **Multi-type verification badges** — phone, cedula, business, feria vendor
16. **Escrow payment flow** — hold funds, release on confirmation
17. **Dispute resolution system** — disputes table, evidence, admin arbitration
18. **Driver ratings by buyers** — separate driver review flow
19. **Saved searches with alerts**
20. **Response time indicator** on seller profiles
21. **Listing expiry / "still available?" system**

### Tier 4: Polish & Optimization
22. **AI auto-translation** for listings and messages
23. **Voice notes in chat**
24. **Location sharing in chat**
25. **Offline queue for actions** (post listing, send message when offline)
26. **WhatsApp notification bridge**
27. **Waze deep links** for all delivery navigation
28. **Landmark-based directions field**
29. **Low-bandwidth mode** / aggressive image lazy loading
30. **Bottom tab navigation** for mobile

---

*This analysis covers the web application only. Native iOS/Android apps are out of scope.*
