# TicoMarket — Comprehensive Project Review

**Date:** 2026-02-09
**Scope:** Full codebase audit — code quality, architecture, performance, security, UX, scalability, testing, docs, and Costa Rica context
**Codebase:** ~11,500 lines TypeScript/TSX across 80+ source files

---

## Scorecard

| # | Category | Score | Verdict |
|---|---|:---:|---|
| 1 | Code Quality | 6/10 | Good patterns undermined by 40+ unsafe type casts and large monolithic components |
| 2 | Architecture | 7/10 | Clean separation of concerns; context-based state management works at MVP scale |
| 3 | Performance | 6/10 | Code-split maps, lean deps — but missing `next/image`, no caching, no memoized list items |
| 4 | Security | 4/10 | **Cloudflare API token hardcoded in package.json**; cookies lack httpOnly; otherwise decent |
| 5 | UX/UI | 7/10 | Strong mobile-first responsive design; accessibility and i18n are the weak spots |
| 6 | Scalability | 5/10 | In-memory filtering, no HTTP caching, no PostGIS — fine for MVP, won't scale past ~1K listings |
| 7 | Testing | 2/10 | 4 test files, ~5% coverage, zero component tests, zero E2E tests |
| 8 | Documentation | 7/10 | README, PROJECT.md, ROADMAP.md are solid; inline docs and API docs missing |
| 9 | Costa Rica Context | 5/10 | CRC currency works, but no SINPE Movil, no i18n, no IVA, no legal pages |

**Overall: 5.4/10** — Solid MVP foundation with critical security and testing gaps blocking production readiness.

---

## Red Flags (Fix Before Production)

### 1. Hardcoded Cloudflare API Token in Version Control

**Severity: CRITICAL**

```json
// package.json:13
"deploy": "npx opennextjs-cloudflare build && CLOUDFLARE_API_TOKEN=eHk3_Uk0DIqnhn10BBK2avTe0CuPRSrbPe3soAHN npx wrangler deploy"
```

This token is in git history. Anyone with repo access can deploy arbitrary code to your Cloudflare account.

**Action:**
1. Rotate the token immediately in Cloudflare dashboard
2. Remove from `package.json` — use env var or CI/CD secrets
3. Install `detect-secrets` pre-commit hook to prevent future leaks
4. Consider the token permanently compromised

### 2. Cookies Set with `httpOnly: false`

**Severity: HIGH**

```
src/lib/supabase-cookie-options.ts:7  →  httpOnly: false
src/middleware.ts:61                  →  httpOnly: false  (CSRF cookie)
```

Auth session cookies and CSRF tokens are readable by JavaScript. Any XSS vulnerability becomes a full session hijack. The `httpOnly: false` on Supabase auth cookies is required by Supabase's browser client, but the CSRF cookie does **not** need JS access — it should use `httpOnly: true` with a separate header-based token.

### 3. Pervasive Unsafe Type Casts (~40 instances)

**Severity: MEDIUM**

```typescript
// Pattern repeated across 15+ API route files:
.from('orders') as any)
.from('reports') as any)
const typedProfile = profile as unknown as ProfileWithFavorites;
.update(dbUpdates as never)
```

These casts silence the compiler instead of fixing the underlying type mismatch between generated Supabase types (`database.types.ts`) and manual app types (`types/index.ts`). Runtime type errors won't be caught at compile time.

**Action:** Regenerate Supabase types with `supabase gen types typescript` and derive app types from them instead of maintaining parallel type definitions.

### 4. RLS Policies May Allow Identity Spoofing

**Severity: HIGH**

Several RLS insert policies only check `auth.uid() IS NOT NULL` without verifying that the inserted `sender_id`, `buyer_id`, or `seller_id` matches `auth.uid()`. A client bypassing the API layer could insert messages or orders with arbitrary identity fields.

**Action:** Add `WITH CHECK (sender_id = auth.uid())` constraints on insert policies for messages, orders, and reviews.

---

## Detailed Findings

### 1. Code Quality (6/10)

**Strengths:**
- Consistent project structure: `components/`, `context/`, `lib/`, `types/`, `app/api/`
- Centralized constants in `config/constants.ts`
- Standardized API responses via `ApiResponse` utility class
- Zod validation on all API inputs
- `sanitizeText()` applied to user content before storage

**Issues:**

| Issue | Location | Impact |
|---|---|---|
| 40+ `as any` / `as unknown as` / `as never` casts | All API routes | Type safety is decorative, not functional |
| Generic `console.error` logging everywhere | All API routes | No structured error tracking; silent production failures |
| Large components (500+ lines) | `SellModal.tsx`, `CheckoutModal.tsx`, `account/page.tsx` (~1240 lines) | Hard to test, reason about, or maintain |
| Magic numbers | Timeouts, delays, limits scattered inline | Should be in constants |
| Hardcoded strings | Error messages, status labels, UI text | Not localizable, not centralized |
| API response shapes inconsistent | Sometimes array, sometimes `{data, pagination}` | Defensive client code required |

**Quick wins:**
- Regenerate Supabase types from schema (eliminates all `as any` casts) — 2-3 hours
- Move magic numbers to `constants.ts` (15000ms timeout, 300ms debounce, etc.) — 30 min
- Add a structured logger (even JSON-context `console.error` helps) — 1 hour

### 2. Architecture (7/10)

**Strengths:**
- Next.js App Router with clear page/API route separation
- Three focused React contexts: `AuthContext`, `ListingsContext`, `ToastContext`
- Server components for listing detail and seller profile data fetching
- SSE + Supabase Realtime for message/order updates
- Middleware handles CSRF, rate limiting, and session refresh
- Admin access helper pattern (`requireAdmin()`) is clean

**Issues:**

| Issue | Impact |
|---|---|
| `AuthContext` does too much (auth + favorites + profile + unread count) | Any auth change re-renders everything |
| Duplicate listing data pipelines (ListingsContext + page-level fetch) | Confusion about data source of truth |
| `account/page.tsx` manages 8+ `useState` calls | State explosion — should use `useReducer` or sub-components |
| Too much business logic in client components | Hard to test, easy to break |
| No React Error Boundaries | Unhandled errors crash entire pages |

**Recommendations:**
- Split `AuthContext` into `AuthContext` (session only) and `UserContext` (profile, favorites, unread)
- Add Error Boundaries around major page sections
- Extract `useOrders()` / `useMessages()` hooks for data fetching

### 3. Performance (6/10)

**Strengths:**
- Leaflet dynamically imported with `ssr: false` (avoids 150KB+ on every page)
- Search input debounced at 300ms
- `useMemo` on expensive driver distance calculations in CheckoutModal
- `useCallback` on context provider functions
- CSS respects `prefers-reduced-motion`
- Lean dependency tree (10 production deps)

**Issues:**

| Issue | Location | Impact |
|---|---|---|
| `<img>` instead of `next/image` | 7+ components | No lazy loading, no format optimization, no responsive sizing |
| `ListingCard` not wrapped in `React.memo` | Grid renders 24+ cards | Every filter/search re-renders all cards |
| No HTTP cache headers on any API response | All GET endpoints | Every page load hits the database |
| In-memory listing filtering/sorting | `api/listings/route.ts:149-195` | Fetches all listings then filters in JS |
| No map marker clustering | `MapView.tsx` | Degrades at 100+ markers |
| Middleware calls `supabase.auth.getUser()` on every request | `middleware.ts` | Network roundtrip on every navigation |
| Leaflet CSS loaded globally | `layout.tsx:37-42` | Loaded on pages that don't use maps |
| Full data reload on every SSE event | `account/page.tsx:68-125` | Refetches all messages/orders on any change |

**Quick wins:**
- Replace `<img>` with `next/image` across all components — 1 hour
- Wrap `ListingCard` in `React.memo` — 15 min
- Add `Cache-Control: public, max-age=60` to listing/review GET endpoints — 1 hour
- Push filtering to Postgres (`.ilike()`, `.gte()`, `.order()`) — 2-3 hours

**Larger refactors:**
- Add `react-leaflet-markercluster` for map performance
- Implement ISR or SWR for listing pages
- Add Cloudflare KV cache layer
- Route-scoped Leaflet CSS loading

### 4. Security (4/10)

**Strengths:**
- RLS policies on all 7 tables
- CSRF double-submit cookie pattern on mutation endpoints
- Per-endpoint rate limiting (auth: 10/min, messages: 90/min, default: 120/min)
- Stripe webhook signature verification
- `SUPABASE_SERVICE_ROLE_KEY` isolated to server-side only
- File upload validation (5MB max, image MIME types only)
- Input sanitization strips HTML tags and control characters

**Critical/High Issues:**

| Issue | Severity | Location |
|---|---|---|
| Cloudflare API token hardcoded | CRITICAL | `package.json:13` |
| Auth cookies `httpOnly: false` | HIGH | `supabase-cookie-options.ts:7` |
| CSRF cookie `httpOnly: false` | HIGH | `middleware.ts:61` |
| RLS insert policies lack identity verification | HIGH | `supabase/schema.sql` messages/orders/reviews policies |
| Password reset trusts request `origin` header | MEDIUM | `api/auth/route.ts:36-38` |

**Medium/Low Issues:**

| Issue | Severity | Notes |
|---|---|---|
| No Content Security Policy headers | MEDIUM | XSS mitigation missing |
| Sanitization regex may miss edge cases | MEDIUM | `security.ts:131` — `<img src=x onerror=...>` if partial match |
| No file content validation (only extension check) | MEDIUM | Uploaded files could contain non-image data |
| Rate limiting in-memory only | MEDIUM | Resets on deploy, per-instance on serverless |
| No rate limiting on admin endpoints | MEDIUM | Admin abuse possible |
| Stripe webhook doesn't verify order ownership consistency | MEDIUM | State transitions not validated against checkout session metadata |
| No audit trail for destructive operations | LOW | Deletes, role changes unlogged |

**Recommendations:**
1. Rotate Cloudflare token, use CI/CD secrets
2. Set CSRF cookie to `httpOnly: true`
3. Add CSP headers in middleware
4. Fix RLS insert policies with `WITH CHECK (column = auth.uid())` constraints
5. Allowlist redirect origins for password reset
6. Install `detect-secrets` pre-commit hook

### 5. UX/UI (7/10)

**Strengths:**
- Excellent mobile-first responsive design (40+ responsive class applications)
- Skeleton loading screens for listing grid, detail page, conversations
- Custom design system (`.tm-card`, `.tm-btn`, `.tm-input` utilities)
- Framer Motion animations on modals and transitions
- Focus-visible styles in `globals.css`
- Double-click deletion safeguard
- Geolocation fallback with meaningful error messages
- `prefers-reduced-motion` respected

**Accessibility Gaps:**

| Issue | Impact | Location |
|---|---|---|
| Modals lack `role="dialog"` and `aria-modal="true"` | Screen readers don't announce modal context | All modals |
| No focus trap in modals | Keyboard users can tab behind modal | All modals |
| No focus restoration on modal close | Focus lost after interaction | All modals |
| Form inputs use placeholder instead of `<label>` | Screen readers can't identify fields | AuthModal, SellModal |
| Filter toggles missing `aria-pressed` | Selected state not announced | FilterBar.tsx |
| Toasts lack `aria-live="polite"` | Status changes not announced | ToastContext |
| No skip-to-content link | Keyboard users tab through full nav | layout.tsx |
| Account dropdown hover-only | Not keyboard/touch accessible | Navbar.tsx:92-106 |
| Seller reporting uses `window.prompt` | Poor mobile/assistive UX | SellerProfileClient.tsx:72-75 |

**UX Friction Points:**

| Issue | Recommendation |
|---|---|
| No guest checkout — must auth first | Allow email-based guest checkout |
| No loading spinners on async buttons | Add spinner + disabled state |
| No unsaved-work warning when closing modals | Confirm if form has changes |
| Location hardcoded as "San Jose, CR" on all cards | Show actual listing location |
| No empty state illustrations | Replace blank areas with helpful CTAs |

**Quick wins:**
- Add `role="dialog"` + `aria-modal="true"` to modal wrappers — 30 min
- Add `aria-live="polite"` to toast container — 15 min
- Add `aria-pressed` to filter toggle buttons — 15 min
- Add visible `<label>` elements to form inputs — 1 hour

### 6. Scalability (5/10)

**Issues that will break at scale (>1K listings, >100 concurrent users):**

| Issue | Current | Better |
|---|---|---|
| Listing search/filter in-memory | Fetch all rows, filter in JS | Push to Postgres with `.ilike()`, `.gte()`, `.order()` |
| Distance sorting in-memory | Haversine in JS on all listings | PostGIS `ST_DWithin` / `ST_Distance` |
| Rate limiting uses in-memory Map | Resets on deploy, per-instance | Cloudflare KV or Upstash Redis |
| No HTTP caching on any endpoint | Every request hits DB | `Cache-Control` + `stale-while-revalidate` |
| Favorites toggle: 3 queries per click | Check + delete/insert + fetch all | `ON CONFLICT` upsert, single roundtrip |
| Order read + update = 2 queries | SELECT then UPDATE with RETURNING | Single UPDATE...RETURNING |
| SSE creates Supabase channel per user | Fine for 100 users | Connection pool exhaustion at 1000+ |
| Price stored as TEXT | Can't range-query efficiently | Store as INTEGER (cents) |
| Messages/orders APIs unbounded | No pagination | Add cursor-based pagination |
| Missing composite indexes | Single-column only | Add `(buyer_id, seller_id, listing_id, created_at)` |
| Order ID: `order-<epoch_seconds>` | Collision risk under concurrency | Use UUID or ULID |

**Larger refactors:**
- Enable PostGIS extension for geo queries
- Add Cloudflare KV cache (60s TTL for listings)
- Move from SSE to direct Supabase Realtime channels on client
- Implement cursor-based pagination for chat

### 7. Testing (2/10)

**Current state: 4 test files, ~734 lines, estimated <5% code coverage**

| Test File | What It Tests | Assessment |
|---|---|---|
| `structure.test.ts` | File existence checks | Smoke test only |
| `types.test.ts` | Type shape validation | Good but limited |
| `api-schema.test.ts` | Response shapes with mock data | No actual API calls |
| `api-integration.test.ts` | 3 of 19 API routes with mocked Supabase | Decent but narrow |

**Completely untested:**

| Gap | Risk |
|---|---|
| 0 component tests (13 components) | UI regressions go unnoticed |
| 0 context/hook tests | Auth flow, favorites, state management |
| 0 E2E tests | Complete user journeys never verified |
| 16 of 19 API routes untested | Auth, messages, checkout, admin, webhooks |
| Security functions untested | Rate limiting, CSRF, sanitization logic |
| Stripe webhook handler | Payment status updates could silently fail |

**Priority test plan:**

1. **Critical (week 1):** Auth flow E2E, checkout + payment E2E, Stripe webhook integration
2. **High (week 2):** Component tests for AuthModal, CheckoutModal, ChatModal, SellModal
3. **Medium (week 3):** All 19 API route tests, context unit tests
4. **Nice to have:** Visual regression, axe-core accessibility audit, performance benchmarks

**Recommended setup:**
- Add Playwright for E2E
- Add `msw` (Mock Service Worker) instead of manual mocks
- Target 60%+ coverage on `src/lib/` and `src/app/api/` first

### 8. Documentation (7/10)

**Strengths:**
- `README.md`: Comprehensive features, tech stack, setup, deployment guide
- `PROJECT.md`: Migration status, refactoring history, phased roadmap
- `ROADMAP.md`: Clear improvement priorities
- `test-manual.md`: Manual testing checklist

**Gaps:**

| Gap | Impact |
|---|---|
| No inline JSDoc on utility functions | Must read implementation to understand API |
| No API documentation (OpenAPI/Swagger) | Frontend devs guess at request/response shapes |
| No architecture decision records | Why Supabase? Why SSE over WebSockets? Lost context |
| Conflicting env key names | Code uses `PUBLISHABLE_KEY`, examples say `ANON_KEY` |
| `test-manual.md` has stale conclusions | Includes unsafe recommendations (e.g., loosening TS strictness) |
| Multiple docs out of sync | README, PROJECT.md, ROADMAP.md conflict on status |
| No changelog | Hard to track what changed between deploys |

**Quick wins:**
- Fix env var naming consistency across all docs — 30 min
- Add JSDoc to `lib/payments.ts`, `lib/security.ts`, `lib/validation.ts` — 1 hour
- Add `docs/API.md` with all 19 endpoints documented — 2-3 hours

### 9. Costa Rica Context (5/10)

**What works:**

| Feature | Status |
|---|---|
| CRC (₡) currency throughout | Working via Stripe with `crc` currency code |
| Map centered on San Jose / GAM | `MAP_CENTER: [9.9281, -84.0907]` |
| Landmark-based addresses | "100m norte del Mas x Menos" — matches CR conventions |
| Pickup location model with Waze link field | Type defined, seed data populated |
| Express same-day delivery for GAM | Driver matching with ETA |
| Realistic Costa Rican seed data | Names, locations, prices |

**What's missing:**

| Gap | Impact | Effort |
|---|---|---|
| **No SINPE Movil** | Excludes CR's most popular payment method | Large (1-2 weeks) |
| **No Spanish localization** | English-only UI for Spanish-speaking market | Medium (2-3 days for i18n setup + translations) |
| **No IVA (13% VAT) calculation** | Legal compliance risk | Medium (1 day) |
| **No Terms of Service / Privacy Policy** | Legal requirement for CR commerce | Medium (legal review needed) |
| **No phone validation (8-digit CR format)** | Can't validate CR phone numbers | Small (1 hour) |
| **No timezone handling (UTC-6, no DST)** | Schedule display may be wrong | Small (1 hour) |
| **No province/canton/district structure** | Can't filter by region, no delivery zones | Medium (1 week) |
| **Waze links in data model but not in UI** | Feature defined but unused | Small (2 hours) |
| **No local invoice/factura support** | Some sellers need formal invoices | Medium |

**SINPE Movil options:**
1. Manual verification flow (buyer sends SINPE, uploads screenshot, seller confirms)
2. Local processor integration (Greenpay, VPOS)
3. Hybrid: Stripe for cards + manual SINPE toggle

---

## Prioritized Action Plan

### P0: Immediate (Do Now)

| # | Action | Category | Effort |
|---|---|---|---|
| 1 | **Rotate Cloudflare API token, remove from `package.json`** | Security | 15 min |
| 2 | **Set CSRF cookie to `httpOnly: true`** | Security | 30 min |
| 3 | **Fix RLS insert policies** (add identity verification) | Security | 1-2 hours |
| 4 | **Add `detect-secrets` pre-commit hook** | Security | 30 min |
| 5 | Replace `<img>` with `next/image` in all components | Performance | 1 hour |
| 6 | Wrap `ListingCard` in `React.memo` | Performance | 15 min |
| 7 | Add `role="dialog"` + `aria-modal` to all modals | Accessibility | 30 min |

### P1: Quick Wins (This Week)

| # | Action | Category | Effort |
|---|---|---|---|
| 8 | Regenerate Supabase types, eliminate `as any` casts | Code Quality | 2-3 hours |
| 9 | Add `Cache-Control` headers to read-only endpoints | Performance | 1 hour |
| 10 | Add `aria-live` to toast, `aria-pressed` to filters | Accessibility | 1 hour |
| 11 | Add visible `<label>` elements to all form inputs | Accessibility | 1 hour |
| 12 | Add CSP headers in middleware | Security | 1 hour |
| 13 | Push listing filters to Postgres queries | Scalability | 2-3 hours |
| 14 | Fix env var naming inconsistency across docs | Documentation | 30 min |
| 15 | Set up Playwright + write auth flow E2E test | Testing | 3-4 hours |
| 16 | Switch order IDs to UUID | Scalability | 1-2 hours |

### P2: Medium Term (This Month)

| # | Action | Category | Effort |
|---|---|---|---|
| 17 | Set up `next-intl` for Spanish/English localization | Costa Rica | 2-3 days |
| 18 | Split `AuthContext` into auth + user contexts | Architecture | 1 day |
| 19 | Break down large components (SellModal, CheckoutModal, account page) | Code Quality | 1-2 days |
| 20 | Add component tests for critical modals | Testing | 2-3 days |
| 21 | Add focus trapping to modals (radix-ui or similar) | Accessibility | 1 day |
| 22 | Add React Error Boundaries | Architecture | 0.5 day |
| 23 | Add IVA calculation to checkout flow | Costa Rica | 1 day |
| 24 | Add Terms of Service / Privacy Policy pages | Legal | 1-2 days |
| 25 | Normalize price to INTEGER (cents), migrate from TEXT | Scalability | 1-2 days |
| 26 | Paginate messages and orders APIs | Scalability | 1-2 days |
| 27 | Targeted SSE refresh (by entity ID) instead of full reload | Performance | 1 day |

### P3: Larger Refactors (Next Quarter)

| # | Action | Category | Effort |
|---|---|---|---|
| 28 | SINPE Movil payment option | Costa Rica | 1-2 weeks |
| 29 | PostGIS for distance-based queries and delivery zones | Scalability | 1 week |
| 30 | Cloudflare KV caching layer | Performance | 1 week |
| 31 | Comprehensive test suite (60%+ coverage) | Testing | 2-3 weeks |
| 32 | Province/canton/district structured addresses | Costa Rica | 1 week |
| 33 | Map marker clustering | Performance | 2-3 days |
| 34 | Move rate limiting to Upstash Redis / Cloudflare KV | Scalability | 2-3 days |
| 35 | Structured logging + error tracking (Sentry) | Operations | 1-2 days |
| 36 | API documentation (OpenAPI spec) | Documentation | 2-3 days |

---

## Architecture Diagram (Current)

```
Browser
  │
  ├── Next.js App Router (React 19 + TypeScript)
  │     ├── Contexts: Auth │ Listings │ Toast
  │     ├── Components: 13 (modals, cards, nav, filters, maps)
  │     ├── Pages: Home │ Listing Detail │ Seller Profile │ Account │ Admin
  │     └── middleware.ts (CSRF + Rate Limit + Session Refresh)
  │
  ├── API Routes (19 endpoints)
  │     ├── /api/auth/* (signup, login, me)
  │     ├── /api/listings/* (CRUD + search + filter)
  │     ├── /api/orders/* (CRUD + status tracking)
  │     ├── /api/messages/* (send, list, mark-read)
  │     ├── /api/checkout (Stripe session creation)
  │     ├── /api/stripe/webhook (payment events)
  │     ├── /api/events (SSE real-time stream)
  │     ├── /api/reviews, /api/reports
  │     └── /api/admin/* (moderation)
  │
  ├── Supabase
  │     ├── Auth (email/password, password reset)
  │     ├── Postgres (7 tables, RLS on all)
  │     ├── Storage (listing images, 5MB max)
  │     └── Realtime (message/order subscriptions)
  │
  ├── Stripe (CRC card payments, webhook integration)
  │
  └── Cloudflare Workers (deployment via OpenNext)
```

---

## Final Assessment

TicoMarket is a well-structured MVP with a solid foundation. The architecture choices (Next.js App Router, Supabase, Stripe) are appropriate for the use case. The codebase shows thoughtful engineering in areas like CSRF protection, rate limiting, RLS policies, and mobile-first design.

**The three things that matter most before production:**

1. **Fix the security issues** — the hardcoded token is a showstopper, RLS identity gaps enable spoofing, and `httpOnly: false` on cookies is a liability
2. **Add basic E2E tests** — at minimum, test auth flow and checkout flow so deploys don't break critical paths
3. **Regenerate Supabase types** — the 40+ `as any` casts mean TypeScript is providing a false sense of safety

Everything else is iterative improvement. The Costa Rica context gaps (SINPE, i18n, IVA) matter for market fit but don't block a controlled soft launch. The scalability issues only matter once you have real traffic. Focus on security, testing, and type safety first.

**Do not treat this as production-ready until P0 security items are resolved.**
