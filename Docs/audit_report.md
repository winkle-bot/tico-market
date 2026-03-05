# Tico Market — Code Alignment Audit Report

---

## Core Purpose (my interpretation)

Tico Market is a **P2P marketplace for Costa Rica** that unifies three fragmented ecosystems into one mobile-first platform: **(1)** secondhand goods trading, **(2)** feria (farmer's market) commerce with digital storefronts and pre-orders, and **(3)** last-mile delivery by independent motorcycle couriers. It solves the discovery, transaction, and delivery coordination problems currently scattered across WhatsApp groups, Facebook, and word-of-mouth.

**Primary user outcomes:**
- Buyers discover listings (map-first + feed), message sellers, and buy via pickup or delivery
- Sellers list goods quickly with photos, location pins, and fulfillment options
- Feria vendors get digital storefronts, advance orders, and delivery
- Express drivers get a structured delivery marketplace with bidding
- Admin/moderators manage listings, users, reports, disputes, and driver verification

**Explicit constraints / non-goals (from the PRD):**
- The platform does NOT build its own payment system — it layers on SINPE Móvil
- Phase 1 is Uvita/Costa Ballena only, not nationwide
- The platform is NOT a tax collector
- Future features (group buying, subscription boxes, services, rentals, community boards, financial services) are explicitly deferred

---

## Alignment Score

| Module / Area | Alignment | Notes |
|---|---|---|
| **Listings CRUD + Discovery** | ✅ Aligned | Core feature. Well-implemented with categories, search, map, feed, pagination |
| **Listing Detail Page** | ✅ Aligned | Rich detail with fulfillment options, pickup config, market events, reporting |
| **Sell Flow (Create Listing)** | ✅ Aligned | Fast listing creation with images, fulfillment settings, location, condition |
| **Authentication** | ✅ Aligned | Supabase auth with email/password, profile auto-creation |
| **Messaging / Chat** | ✅ Aligned | In-app chat per listing, buyer/seller context, real-time via Supabase |
| **Orders + Checkout** | ✅ Aligned | Multi-step checkout with pickup/delivery selection, SINPE + Stripe + cash |
| **SINPE Móvil Integration** | ✅ Aligned | Config table, admin SINPE management, payment option in checkout |
| **Stripe Payments** | ⚠️ Partially Aligned | PRD says "Stripe if available in CR." Implementation exists but may be premature |
| **Driver Profiles + Verification** | ✅ Aligned | Onboarding, verification flow, document upload, admin approval |
| **Delivery Requests + Bids** | ✅ Aligned | Core delivery marketplace with broadcast/manual/auto modes, bidding |
| **Delivery Negotiations** | ⚠️ Partially Aligned | Table + types exist but thin on UI/API usage. May be premature abstraction |
| **Event Driver Signups** | ⚠️ Partially Aligned | Supports drivers signing up for events/ferias — useful but very niche for Phase 1 |
| **Ferias Module** | ✅ Aligned | PRD's differentiating feature. Page, API, DB table present |
| **Reviews** | ✅ Aligned | Post-transaction ratings, matches PRD's trust system |
| **Reports + Community Moderation** | ✅ Aligned | Flag listings/users, admin review queue |
| **Disputes** | ⚠️ Partially Aligned | Full dispute system with threads and evidence. Over-featured for Phase 1 |
| **Admin Panel** | ✅ Aligned | Listings moderation, user management, reports, disputes, driver verification |
| **Push Notifications** | ✅ Aligned | VAPID-based web push with subscription management |
| **WhatsApp Notifications (Twilio)** | ⚠️ Partially Aligned | Code exists but depends on Twilio setup; PRD says "optional bridge" |
| **i18n (ES/EN)** | ✅ Aligned | Full bilingual support, ~20K+ strings per language |
| **Security (CSRF, Rate Limiting)** | ✅ Aligned | Middleware with per-endpoint rate limits, CSRF protection, input sanitization |
| **Drizzle ORM Schema** | ❌ Drifted | Only defines `driver_profiles`. Unused for all other tables. Redundant with raw SQL |
| **[db.json](file:///Users/codi/Developer/Web/tico-market/src/lib/db.json) (1,209 lines)** | ❌ Drifted | Vestigial local-first mock data file. No longer used by main app (Supabase is the DB) |
| **Notification Settings Component** | ⚠️ Partially Aligned | UI for push/WhatsApp prefs exists but unclear backend storage for prefs |
| **Booking Modal** | ⚠️ Unclear | [BookingModal.tsx](file:///Users/codi/Developer/Web/tico-market/src/components/BookingModal.tsx) — purpose overlaps with CheckoutModal |
| **Map View** | ✅ Aligned | Leaflet-based map-first browse, core PRD feature |
| **SEO (robots.ts, sitemap.ts)** | ✅ Aligned | Standard SEO practices |
| **PWA / Service Worker** | ✅ Aligned | Manifest + SW registration in layout, matches PRD's "PWA as secondary channel" |
| **Cloudflare Deployment** | ✅ Aligned | OpenNext + Wrangler config for Cloudflare Pages/Workers |

---

## Cut List (Moderate Pass)

### 1. [src/lib/db.json](file:///Users/codi/Developer/Web/tico-market/src/lib/db.json) — 1,209 lines of mock/seed data ❌ **Remove**
- **What**: A JSON file containing hardcoded listings, users, and messages from an earlier local-first prototype phase
- **Why**: The app now uses Supabase as its primary database. This file is referenced nowhere in the main application flow. Some data references `/uploads/` paths for images that may not exist
- **Action**: **Remove.** If seed data is needed, [supabase/seed.sql](file:///Users/codi/Developer/Web/tico-market/supabase/seed.sql) already exists for that purpose

### 2. [drizzle.config.ts](file:///Users/codi/Developer/Web/tico-market/drizzle.config.ts) + [src/lib/schema.ts](file:///Users/codi/Developer/Web/tico-market/src/lib/schema.ts) — Drizzle ORM ❌ **Remove or Defer**
- **What**: A Drizzle ORM setup that only defines `driver_profiles`. All other DB access uses raw Supabase client queries
- **Why**: Drizzle is an ORM dependency (`drizzle-orm` + `drizzle-kit`) that adds bundle weight and cognitive overhead for a single table definition. The rest of the app doesn't use it. The [supabase/schema.sql](file:///Users/codi/Developer/Web/tico-market/supabase/schema.sql) is the source of truth
- **Action**: **Remove** Drizzle entirely. Use Supabase client consistently. If you plan to migrate to Drizzle later, defer it — don't have two competing data access patterns

### 3. [src/components/BookingModal.tsx](file:///Users/codi/Developer/Web/tico-market/src/components/BookingModal.tsx) — 7.4KB ⚠️ **Merge or Remove**
- **What**: A booking modal component
- **Why**: [CheckoutModal.tsx](file:///Users/codi/Developer/Web/tico-market/src/components/CheckoutModal.tsx) (18.3KB) already handles the full checkout flow with step-by-step method selection, pickup, delivery, and confirmation. BookingModal appears to be a simpler/older version. Having two checkout flows confuses the codebase
- **Action**: **Merge** any unique functionality into CheckoutModal, then **remove** BookingModal

### 4. Delivery Negotiations table + types — premature scope ⚠️ **Defer**
- **What**: `delivery_negotiations` table, [DeliveryNegotiation](file:///Users/codi/Developer/Web/tico-market/src/types/index.ts#166-174) type, negotiation status types
- **Why**: The delivery bidding system (`delivery_bids`) already handles driver pricing. Negotiations add a counter-offer layer on top of bids that isn't part of the Phase 1 feature set in the PRD. The PRD describes flat-rate or driver-bidding only
- **Action**: **Defer.** Keep the types for reference if needed, but drop the DB table from the active schema. Don't build API routes around it yet

### 5. `src/components/disputes/` — 3 components, ~13KB total ⚠️ **Simplify**
- **What**: Full dispute resolution UI with threaded messages, evidence uploads, and status tracking
- **Why**: The PRD mentions disputes for escrowed transactions, but this is a Phase 2+ feature. The current platform hasn't even launched yet. Building a full dispute resolution thread UI before having real transactions is premature
- **Action**: **Simplify.** Keep the `Dispute` and `DisputeMessage` types and the single POST API for opening disputes. Remove or defer the threaded conversation UI (`DisputeThread.tsx`) and dispute card display until post-launch

### 6. `src/lib/push-client.ts` + `src/lib/push.ts` + `src/app/api/push/` — push notification system ⚠️ **Defer partially**
- **What**: Full VAPID-based web push notification system with client-side subscription management, server-side sending, and subscription cleanup
- **Why**: This is well-built and aligned with the PRD's notification requirements. However, the `push_subscriptions` table is not in the main `schema.sql`, suggesting it was added separately and may not be fully integrated. The WhatsApp sending via Twilio is explicitly "optional" in the PRD
- **Action**: **Keep push notifications** (core). **Defer WhatsApp/Twilio integration** (`sendWhatsAppToUser`) until you actually have a Twilio account and business verification. The function is fire-and-forget anyway

### 7. Event Driver Signups — niche Phase 2 feature ⚠️ **Defer**
- **What**: `event_drivers` table, `EventDriverSignup` type, `EventDriverSignup.tsx` component, `/api/event-drivers/` route
- **Why**: The ability for drivers to sign up for specific feria events is a nice-to-have, but it's a second-order feature that depends on the feria module being mature and having actual feria organizer adoption. It adds 4 files and a DB table for a feature that won't see usage in Phase 1
- **Action**: **Defer.** Keep the types definition for reference. Remove the component, API route, and DB table until driver event scheduling is actively needed

### 8. `src/app/driver-profile/`, `src/app/driver-application/`, `src/app/driver-verification/`, `src/app/drivers/` — 4 separate route groups ⚠️ **Merge**
- **What**: Four separate page routes all related to the driver experience: profile, application, verification, and driver listing
- **Why**: These could be consolidated under a single `/drivers/` route group with sub-routes (`/drivers/apply`, `/drivers/profile`, `/drivers/verify`). The current structure splits a single user journey across 4 top-level routes
- **Action**: **Merge** into a single `/drivers/` route group with sub-pages

### 9. `src/app/feria/` vs `src/app/ferias/` — duplicate route naming ⚠️ **Clarify**
- **What**: Two feria-related route groups: `/ferias` (list page) and `/feria/[slug]` (detail page)
- **Why**: The inconsistent singular/plural naming (`feria` vs `ferias`) could confuse developers. Standard Next.js convention is to use one base path
- **Action**: **Merge** under `/ferias/` with `/ferias/` as the index and `/ferias/[slug]` as the detail page

### 10. `src/components/NotificationSettings.tsx` — 6.2KB ⚠️ **Defer or simplify**
- **What**: UI for managing push and WhatsApp notification preferences
- **Why**: The UI component references `notification_prefs` on the user profile, but the `profiles` table in `schema.sql` doesn't have a `notification_prefs` column. The WhatsApp opt-in flow depends on Twilio integration which is deferred. This component is ahead of its backend
- **Action**: **Simplify** to push notification toggle only. Remove WhatsApp preference toggles until that integration is live

---

## Refactor Recommendations

### 1. Consolidate data access pattern
The codebase uses **three** competing data access patterns:
1. Raw Supabase client queries (most API routes)
2. Drizzle ORM (`schema.ts` for `driver_profiles` only)
3. Direct JSON file (`db.json`)

**Recommendation:** Standardize on Supabase client only. Remove Drizzle and `db.json`.

### 2. Rename `type` field on listings
The `listings` table has a `type` column with values `'seller' | 'driver'`. This is confusing because `type` is a very generic name and it doesn't map clearly to the PRD's item types (`physical`, `food`, `service`, `rental`, `free` — which are already covered by `item_type`). The `type` field's purpose is to distinguish marketplace listings from driver service offerings.

**Recommendation:** Rename to `listing_kind` or `listing_role` to make the distinction clearer.

### 3. Category list doesn't match PRD
- **Code categories:** Electronics, Home, Vehicles, Food, Services, Fashion, Sports, Delivery, Other
- **PRD categories:** Produce and food, household goods, electronics, vehicles, clothing, services, rentals, handmade/artisan, free stuff

Missing from code: **Rentals**, **Handmade/Artisan**, **Free Stuff** (the PRD explicitly calls out free/giveaway). **Delivery** as a category is odd — deliveries aren't listings you browse by category. The `item_type: 'free'` exists in the type system but there's no matching category.

**Recommendation:** Align categories to PRD. Add Rentals, Artisan, and Free. Remove or rename Delivery (drivers have their own section).

### 4. Price storage is inconsistent
The `listings` table stores price as both `text` (`price` — e.g., "₡15,000") and `integer` (`price_cents`). The `price` field is displayed directly in the UI. Having a formatted string as the canonical price makes filtering, sorting, and currency conversion impossible.

**Recommendation:** Make `price_cents` the canonical price value. Derive the display string from it in the UI layer using `formatPrice()` in `lib/format.ts`.

### 5. Admin routes need guardrails
The admin API routes at `/api/admin/` (5 sub-groups: disputes, listings, reports, users, verifications) check for admin/moderator role in the API handlers, but this check pattern is duplicated across every handler. 

**Recommendation:** Extract an `assertAdmin()` or `requireRole()` middleware helper that's called once at the top of each admin route handler to reduce duplication and prevent accidental permission gaps.

### 6. `src/components/index.ts` barrel export
The file re-exports 12 components. This is fine for convenience but creates a single import path that can cause unnecessary module loading. For a Next.js app with code splitting, direct imports are preferred.

**Recommendation:** No urgent action, but consider removing the barrel export and using direct imports for better tree-shaking.

---

## What's Missing (briefly)

| PRD Feature | Status |
|---|---|
| **Saved searches + alerts** | Not implemented. PRD §4.1.3 explicitly calls for this |
| **Language toggle on listings** | i18n for UI exists, but no per-listing auto-translation (Spanish ↔ English) |
| **QR code for feria pre-order pickup** | Not implemented. PRD §4.2.3 calls for QR-based handoff |
| **Feria vendor storefronts** | Ferias page exists, but vendor storefronts within ferias aren't built |
| **Feria pre-orders / reservations** | Not implemented |
| **Three-way delivery chat** (buyer/seller/driver) | Messages are per-listing buyer↔seller only |
| **Real-time delivery tracking** | Types exist (`DeliveryTrackingPhase`, `DeliveryMeta`) but no live tracking UI |
| **Quick-reply templates** ("Still available", etc.) | Not implemented |
| **Payment escrow flow** | Order status tracking exists, but actual escrow hold/release isn't built |
| **Offline capability** | PWA/SW registered, but no offline queue for listings/messages |
| **Named saved locations** ("My house") | `pickup_locations` exist on profiles but no user-facing "save this location" flow |

> [!NOTE]
> These missing features are **not criticisms**. The codebase is pre-launch and these are reasonable Phase 2+ items. I list them only because the PRD describes them as core Phase 1 features.

---

## Clarifying Questions

1. **Is `db.json` still used anywhere?** My analysis suggests the app fully migrated to Supabase, but I want to confirm there isn't a fallback path or a development mode that reads from it.

2. **What is the intended purpose of `BookingModal` vs `CheckoutModal`?** Are these for different flows (e.g., services vs goods), or is BookingModal legacy?

3. **Is Drizzle ORM a planned migration target?** If you intend to move all data access to Drizzle, I'd keep the config and expand it. If not, it's pure dead weight.

4. **Are the `delivery_negotiations` actively being used?** I see the table and types but minimal API/UI support. Is this in active development or was it speculative?

5. **Is the Twilio/WhatsApp integration actively planned for Phase 1?** The code is present but requires account credentials and business verification.

---

## Summary

The codebase is **substantially aligned** with the PRD's vision. The core marketplace loop — list, discover, message, buy, deliver — is well-built. The tech choices (Next.js 16, Supabase, Cloudflare, Leaflet) are appropriate for the target market. Security fundamentals (CSRF, rate limiting, RLS, input sanitization) are solid.

The main areas of drift are:
- **Vestigial code** from an earlier prototype phase (`db.json`, Drizzle partial setup)
- **Premature features** that won't see Phase 1 usage (dispute threads, delivery negotiations, event driver signups, WhatsApp integration)
- **Route organization** that could be tighter (4 driver route groups, feria/ferias split)
- **Data modeling inconsistencies** (dual price fields, generic `type` column, mismatched categories)

None of these are blockers. The recommended actions are trimming, not adding.
