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
| **Ferias Module** | ✅ Aligned | PRD's differentiating feature. Page, API, DB table present |
| **Reviews** | ✅ Aligned | Post-transaction ratings, matches PRD's trust system |
| **Reports + Community Moderation** | ✅ Aligned | Flag listings/users, admin review queue |
| **Admin Panel** | ✅ Aligned | Listings moderation, user management, reports, disputes, driver verification |
| **Push Notifications** | ✅ Aligned | VAPID-based web push with subscription management |
| **i18n (ES/EN)** | ✅ Aligned | Full bilingual support, ~20K+ strings per language |
| **Security (CSRF, Rate Limiting)** | ✅ Aligned | Middleware with per-endpoint rate limits, CSRF protection, input sanitization |
| **Map View** | ✅ Aligned | Leaflet-based map-first browse, core PRD feature |
| **SEO (robots.ts, sitemap.ts)** | ✅ Aligned | Standard SEO practices |
| **PWA / Service Worker** | ✅ Aligned | Manifest + SW registration in layout, matches PRD's "PWA as secondary channel" |
| **Cloudflare Deployment** | ✅ Aligned | OpenNext + Wrangler config for Cloudflare Pages/Workers |

---

## Cut List — Status

### ✅ 1. `src/lib/db.json` — DONE
Removed. App uses Supabase exclusively.

### ✅ 2. `drizzle.config.ts` + `src/lib/schema.ts` — DONE
Removed Drizzle ORM and its package dependencies (`drizzle-orm`, `drizzle-kit`). All DB access via Supabase client.

### ✅ 3. `src/components/BookingModal.tsx` — DONE
Removed. `CheckoutModal.tsx` is the single checkout flow.

### ✅ 4. Delivery Negotiations API routes — DONE
Removed `/api/delivery-requests/[id]/counter/route.ts` and `/api/delivery-requests/[id]/negotiations/route.ts`. Types kept for future reference.

### ✅ 5. `src/components/disputes/DisputeThread.tsx` + `DisputeCard.tsx` — DONE
Removed threaded dispute UI. Core `Dispute`/`DisputeMessage` types and the POST API to open a dispute are retained.

### ✅ 6. Push notifications — No action needed
Push is well-built and aligned. WhatsApp/Twilio was already fire-and-forget; no active Twilio credentials means it silently no-ops. No code removal needed until Twilio is wired up.

### ✅ 7. Event Driver Signups — DONE
Removed `EventDriverSignup.tsx` component and `/api/event-drivers/` route. `EventDriverSignup` type retained for reference.

### ✅ 8. Driver routes consolidated — DONE
`/driver-application`, `/driver-profile`, `/driver-verification` merged into `/drivers/apply`, `/drivers/[id]`, `/drivers/verify`. Old routes removed.

### ✅ 9. `src/app/feria/` vs `src/app/ferias/` — DONE
Merged under `/ferias/[slug]`. Old `feria/[id]` route removed.

### ✅ 10. `src/components/NotificationSettings.tsx` — DONE
Simplified to push-only toggle. WhatsApp preference UI removed.

---

## Refactor Recommendations — Status

### ✅ 1. Consolidate data access pattern — DONE
Removed Drizzle and `db.json`. All data access via Supabase client.

### ⏳ 2. Rename `type` field on listings — DEFERRED (requires DB migration)
The `listings.type` column (`'seller' | 'driver'`) should be renamed to `listing_kind` for clarity. Requires a DB migration + updating all API routes and types. Deferred to a dedicated migration pass.

### ✅ 3. Category list — DONE
Updated `src/lib/data.ts` and `src/types/index.ts` to match PRD §4.1.3:
- **Removed:** Sports, Delivery (as a category)
- **Added:** Rentals, Artisan, Free
- **Kept:** Food, Home, Electronics, Vehicles, Fashion, Services, Other

### ⏳ 4. Price storage — PARTIALLY DONE (DB migration needed to complete)
The UI layer (`ListingCard`, `formatPrice()`) already uses `price_cents` as the canonical value with the text `price` as a fallback. Full canonicalization (making `price_cents` NOT NULL, dropping the text `price` column) requires a DB migration. Deferred.

### ✅ 5. Admin routes — ALREADY DONE
`src/lib/admin.ts` exports `requireAdmin()` which is called at the top of every admin route handler. No duplication.

### ⏸️ 6. Barrel export cleanup — NOT URGENT
`src/components/index.ts` re-exports ~10 components. Consider direct imports for better tree-shaking in a future cleanup pass.

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

## Summary

The codebase is **substantially aligned** with the PRD's vision. The core marketplace loop — list, discover, message, buy, deliver — is well-built. The tech choices (Next.js 16, Supabase, Cloudflare, Leaflet) are appropriate for the target market. Security fundamentals (CSRF, rate limiting, RLS, input sanitization) are solid.

**Remaining deferred items (require DB migrations):**
- Rename `listings.type` → `listings.listing_kind`
- Make `price_cents` NOT NULL and drop text `price` column

These are non-blocking. The recommended actions are trimming, not adding.
