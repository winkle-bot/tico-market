# Tico-Market Production Roadmap

*Generated: 2026-02-08*

## Priority Legend
- 🔴 **P0 - Critical**: Blocks production, must fix before launch
- 🟠 **P1 - High**: Core marketplace functionality needed
- 🟡 **P2 - Medium**: Important for scale/polish
- ⚪ **P3 - Low**: Nice to have, defer post-launch

---

## 🔴 P0 - Critical (Blocks Production)

### 1. ✅ DONE - Fix Checkout Blocker (`P0.1`)
**Issue**: `CheckoutModal` doesn't send `listingSnapshot` but schema requires it
**Files**: `src/components/CheckoutModal.tsx:152`, `src/app/api/orders/route.ts:127`
**Impact**: Purchases likely fail silently or throw DB errors
**Work**: Add `listingSnapshot` to checkout payload

### 2. ✅ DONE - Security Hardening (`P0.2`)
**Missing**: Rate limiting, CSRF protection, input sanitization
**Files**: `src/middleware.ts`, API routes
**Impact**: Vulnerable to abuse, spam, potential injection attacks
**Work**: 
- Add rate limiting middleware
- Add CSRF tokens for state-changing endpoints
- Add Zod validation on all API inputs
- Add content sanitization for user-generated content

### 3. ✅ DONE - Auth Callback Session Reliability (`P0.x`)
**Issue**: OAuth/email callback handling caused inconsistent session setup and login state in edge/runtime flows
**Files**: `src/app/auth/callback/route.ts`, auth callback UI/routes
**Impact**: Users could fail to complete sign-in or appear logged out after callback/refresh
**Work**:
- Add server-side callback handling with proper cookie persistence
- Add reliable client callback fallback for edge environment behavior
- Fix redirect origin handling (`emailRedirectTo`)
- Wrap callback search param usage with Suspense compatibility for Next.js 16

---

## 🟠 P1 - High (Core Marketplace Features)

### 3. ✅ DONE - Payments Integration (`P1.3`)
**Missing**: No payment processing (Stripe/PayPal)
**Files**: New `src/lib/stripe.ts`, `src/app/api/checkout/route.ts`
**Impact**: No way to actually transact — cash only
**Work**:
- Integrate Stripe checkout
- Add payment status to orders
- Handle webhooks for payment confirmation
- Add seller payout logic (escrow or direct)

### 4. ✅ DONE - Reviews System (`P1.4`)
**Missing**: No reviews table, API, or write flow
**Files**: `supabase/schema.sql`, new `src/app/api/reviews/route.ts`
**Impact**: No trust mechanism for buyers/sellers
**Work**:
- Add `reviews` table to schema
- Create reviews API (CRUD)
- Add review form to order completion flow
- Display reviews on seller profiles

### 5. ✅ DONE - Admin/Moderation (`P1.5`)
**Missing**: No admin routes, role system, or moderation tools
**Impact**: No way to handle disputes, remove bad actors, manage platform
**Work**:
- Add `role` column to users table (user/admin/moderator)
- Create admin API routes (listings moderation, user management)
- Build simple admin dashboard
- Add report/flag functionality for listings/users

### 6. ✅ DONE - Account Recovery (`P1.6`)
**Missing**: No password reset, email verification flow
**Files**: `src/app/api/auth/route.ts`, Supabase settings
**Impact**: Users locked out with no recovery path
**Work**:
- Enable Supabase password reset emails
- Add "Forgot Password" flow
- Add email verification (optional, but recommended)

---

## 🟡 P2 - Medium (Scale & Polish)

### 7. ✅ DONE - Server-Side Search & Pagination (`P2.7`)
**Issue**: All filtering is client-side, loads all listings
**Files**: `src/app/api/listings/route.ts`, `src/app/page.tsx`
**Impact**: Won't scale past ~1000 listings
**Work**:
- Add server-side pagination (cursor or offset)
- Add server-side filtering (category, price range, location)
- Add sorting (newest, price, distance)

### 8. ✅ DONE - Dynamic SEO (`P2.8`)
**Issue**: Static metadata only, no per-listing SEO
**Files**: `src/app/listing/[id]/page.tsx`, `src/app/seller/[id]/page.tsx`
**Impact**: Poor discoverability on Google
**Work**:
- Add `generateMetadata` for listing pages
- Add Open Graph tags for social sharing
- Add sitemap.xml generation
- Add robots.txt

### 9. ✅ DONE - Error Handling & UX (`P2.9`)
**Issue**: Uses `alert/confirm` for critical flows
**Files**: `src/components/SellModal.tsx`, `src/app/account/page.tsx`
**Impact**: Poor UX, no error recovery guidance
**Work**:
- Replace alerts with toast notifications
- Add proper error boundaries
- Add loading states for all async operations

### 10. ✅ DONE - Testing (`P2.10`, basic API integration)
**Issue**: Only structural mock tests, no integration/e2e
**Files**: `src/__tests__/`
**Impact**: No confidence in deployments
**Work**:
- Add integration tests for API routes
- Add Playwright/Cypress e2e for critical flows
- Add CI pipeline for test runs

---

## ⚪ P3 - Deferred (Post-Launch)

### ~~Chat Attachments~~
**Decision**: Skip — users will move to WhatsApp for rich chat

### ~~Mobile App / PWA~~
**Decision**: Skip — web-centric for now

### ~~Push Notifications~~
**Decision**: Defer — start with in-app unread badges only

### ~~Email/SMS Notifications~~
**Decision**: Defer — can add later with SendGrid/Twilio

---

## Suggested Execution Order

1. Add Playwright/Cypress e2e coverage for checkout/auth/review happy paths
2. Add CI pipeline gating for integration + e2e

---

## Notes

- Current stack: Next.js + Supabase + Cloudflare Workers
- Auth: Supabase email/password (can add social later)
- Storage: Supabase storage for images
- Real-time: SSE via Supabase for chat
- Verified for `P2.9`: no remaining `alert()` / `confirm()` calls in repository source.
