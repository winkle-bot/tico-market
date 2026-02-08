# Tico-Market Production Roadmap

*Generated: 2026-02-08*

## Priority Legend
- 🔴 **P0 - Critical**: Blocks production, must fix before launch
- 🟠 **P1 - High**: Core marketplace functionality needed
- 🟡 **P2 - Medium**: Important for scale/polish
- ⚪ **P3 - Low**: Nice to have, defer post-launch

---

## 🔴 P0 - Critical (Blocks Production)

### 1. Fix Checkout Blocker
**Issue**: `CheckoutModal` doesn't send `listingSnapshot` but schema requires it
**Files**: `src/components/CheckoutModal.tsx:152`, `src/app/api/orders/route.ts:127`
**Impact**: Purchases likely fail silently or throw DB errors
**Work**: Add `listingSnapshot` to checkout payload

### 2. Security Hardening
**Missing**: Rate limiting, CSRF protection, input sanitization
**Files**: `src/middleware.ts`, API routes
**Impact**: Vulnerable to abuse, spam, potential injection attacks
**Work**: 
- Add rate limiting middleware
- Add CSRF tokens for state-changing endpoints
- Add Zod validation on all API inputs
- Add content sanitization for user-generated content

---

## 🟠 P1 - High (Core Marketplace Features)

### 3. Payments Integration
**Missing**: No payment processing (Stripe/PayPal)
**Files**: New `src/lib/stripe.ts`, `src/app/api/checkout/route.ts`
**Impact**: No way to actually transact — cash only
**Work**:
- Integrate Stripe checkout
- Add payment status to orders
- Handle webhooks for payment confirmation
- Add seller payout logic (escrow or direct)

### 4. Reviews System
**Missing**: No reviews table, API, or write flow
**Files**: `supabase/schema.sql`, new `src/app/api/reviews/route.ts`
**Impact**: No trust mechanism for buyers/sellers
**Work**:
- Add `reviews` table to schema
- Create reviews API (CRUD)
- Add review form to order completion flow
- Display reviews on seller profiles

### 5. Admin/Moderation
**Missing**: No admin routes, role system, or moderation tools
**Impact**: No way to handle disputes, remove bad actors, manage platform
**Work**:
- Add `role` column to users table (user/admin/moderator)
- Create admin API routes (listings moderation, user management)
- Build simple admin dashboard
- Add report/flag functionality for listings/users

### 6. Account Recovery
**Missing**: No password reset, email verification flow
**Files**: `src/app/api/auth/route.ts`, Supabase settings
**Impact**: Users locked out with no recovery path
**Work**:
- Enable Supabase password reset emails
- Add "Forgot Password" flow
- Add email verification (optional, but recommended)

---

## 🟡 P2 - Medium (Scale & Polish)

### 7. Server-Side Search & Pagination
**Issue**: All filtering is client-side, loads all listings
**Files**: `src/app/api/listings/route.ts`, `src/app/page.tsx`
**Impact**: Won't scale past ~1000 listings
**Work**:
- Add server-side pagination (cursor or offset)
- Add server-side filtering (category, price range, location)
- Add sorting (newest, price, distance)

### 8. Dynamic SEO
**Issue**: Static metadata only, no per-listing SEO
**Files**: `src/app/listing/[id]/page.tsx`, `src/app/seller/[id]/page.tsx`
**Impact**: Poor discoverability on Google
**Work**:
- Add `generateMetadata` for listing pages
- Add Open Graph tags for social sharing
- Add sitemap.xml generation
- Add robots.txt

### 9. Error Handling & UX
**Issue**: Uses `alert/confirm` for critical flows
**Files**: `src/components/SellModal.tsx`, `src/app/account/page.tsx`
**Impact**: Poor UX, no error recovery guidance
**Work**:
- Replace alerts with toast notifications
- Add proper error boundaries
- Add loading states for all async operations

### 10. Testing
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

1. **P0.1**: Fix checkout blocker (30 min)
2. **P0.2**: Security hardening (1-2 days)
3. **P1.6**: Account recovery (half day)
4. **P1.3**: Payments integration (2-3 days)
5. **P1.4**: Reviews system (1-2 days)
6. **P1.5**: Admin/moderation (2 days)
7. **P2.7**: Server-side search (1 day)
8. **P2.8**: Dynamic SEO (half day)
9. **P2.9**: Error handling UX (1 day)
10. **P2.10**: Testing (ongoing)

---

## Notes

- Current stack: Next.js + Supabase + Cloudflare Workers
- Auth: Supabase email/password (can add social later)
- Storage: Supabase storage for images
- Real-time: SSE via Supabase for chat
