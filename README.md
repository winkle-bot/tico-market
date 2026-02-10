# Tico Market

Costa Rica-first marketplace for buying and selling locally, with built-in express delivery workflows, live order/message updates, and seller pickup logistics.

## Overview

`tico-market` is a Next.js marketplace app focused on Costa Rica where users can:
- publish listings or driver profiles
- chat with buyers/sellers/drivers in-app
- place pickup or delivery orders
- pay through Stripe Checkout (CRC)
- track order progress through status + delivery timeline updates

The app runs on Next.js (App Router) and is deployed to Cloudflare Workers via OpenNext, with Supabase handling auth, database, storage, and realtime events.

## Key Features

- Marketplace feed with:
  - search
  - category filtering
  - sorting (`newest`, `price_asc`, `price_desc`)
  - pagination
  - map view (Leaflet/OpenStreetMap)
- Listing details with seller info, location map, and report flow
- Seller profiles with ratings/reviews and direct messaging
- Auth with Supabase (signup, login, logout, password reset, auth callback)
- In-app messaging:
  - listing-scoped conversations
  - read/unread state
  - live updates via SSE + Supabase Realtime subscriptions
- Checkout and orders:
  - pickup or delivery mode
  - express driver selection and ETA estimate
  - delivery tracking metadata timeline (`deliveryMeta`)
  - live order refresh in account view
- Payments:
  - Stripe Checkout session creation
  - Stripe webhook handling for payment status updates
  - CRC currency support
- User account dashboard:
  - manage listings
  - favorites
  - messages
  - orders + review submission
- Moderation/admin:
  - user role management (`user`, `moderator`, `admin`)
  - listing visibility moderation
  - report triage
- Security baseline:
  - CSRF token checks for mutation requests
  - in-memory rate limiting by route bucket
  - Zod input validation + basic text sanitization

## Tech Stack

- Framework: Next.js `16.1.6` (App Router)
- Runtime/UI: React `19`, TypeScript, Tailwind CSS `4`, Framer Motion
- Maps: Leaflet + React-Leaflet + OpenStreetMap tiles
- Backend platform: Supabase
  - Auth
  - Postgres (RLS policies)
  - Storage bucket for listing images
  - Realtime feeds (used through SSE API)
- Payments: Stripe (`card` checkout)
- Deployment: OpenNext + Cloudflare Workers (`wrangler`)
- Testing: Jest + Testing Library

## Getting Started

### Prerequisites

- Node.js `20+` (Node `22` recommended)
- npm
- Supabase project
- Stripe account (for checkout/webhooks)
- Cloudflare account (for deployment)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>

NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Stripe keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Important:
- The code expects `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- Keep `SUPABASE_SERVICE_ROLE_KEY` and Stripe secrets server-only.

### 3. Initialize Supabase schema + storage

Run SQL in your Supabase SQL editor:
- `supabase/schema.sql`
- `supabase/storage.sql`

This creates tables, indexes, RLS policies, triggers, and the `listings` storage bucket policy model.

### 4. Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

### 5. Optional checks

```bash
npm test
npm run lint
```

## Project Structure

```text
tico-market/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Home marketplace (list + map)
│   │   ├── listing/[id]/               # Listing detail + checkout entry
│   │   ├── seller/[id]/                # Seller profile + reviews
│   │   ├── account/                    # User dashboard (orders/messages/favorites)
│   │   ├── admin/                      # Admin moderation dashboard
│   │   ├── auth/                       # Callback + reset password
│   │   └── api/                        # Auth, listings, orders, messages, reviews, reports, admin, Stripe
│   ├── components/                     # UI components (CheckoutModal, ChatModal, MapView, etc.)
│   ├── context/                        # Auth, listings, toast providers
│   ├── lib/                            # Supabase clients, security, payments, helpers
│   ├── config/                         # Constants (GAM map defaults, fees, routes)
│   └── types/                          # Domain model types
├── supabase/
│   ├── schema.sql                      # Core DB schema + RLS
│   └── storage.sql                     # Storage bucket/policies
├── scripts/                            # Utility scripts (setup/check/test helpers)
├── wrangler.jsonc                      # Cloudflare Worker config
└── open-next.config.ts                 # OpenNext Cloudflare adapter config
```

## Costa Rica-Specific Notes

- Currency and pricing are modeled for Costa Rican colones (`₡` / `CRC`).
- Default geographic focus is San José / GAM coordinates.
- Delivery copy and flow are optimized around same-day urban delivery expectations.
- The UI uses mixed English + Spanish phrasing in places (for local familiarity).
- Pickup supports local-style logistics:
  - regular pickup locations
  - market/event-based pickup windows
  - optional Waze/Google Maps links in location metadata
- Current payment integration is Stripe card checkout; SINPE Móvil is not implemented in this codebase yet.

## Deployment (Cloudflare Workers)

This project is configured for OpenNext on Cloudflare Workers.

### Local Development

For Next.js dev server:
```bash
npm run dev
```

For Cloudflare Workers local (wrangler dev):
```bash
npm run build
npx opennextjs-cloudflare build
npx wrangler dev
```

Note: `wrangler dev` reads secrets from `.dev.vars` (not `.env.local`).

### Production Deploy

Full deploy workflow:
```bash
# 1. Build Next.js
npm run build

# 2. Build OpenNext for Cloudflare
npx opennextjs-cloudflare build

# 3. Deploy to Cloudflare Workers
npx wrangler deploy
```

Or as a one-liner:
```bash
npm run build && npx opennextjs-cloudflare build && npx wrangler deploy
```

### Setting Production Secrets

Use `wrangler secret put` for sensitive values:
```bash
wrangler secret put STRIPE_SECRET_KEY
# Paste the key when prompted

wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

For non-secret env vars, use `wrangler.toml` or:
```bash
wrangler secret put NEXT_PUBLIC_SUPABASE_URL  # public but needs to be set
```

### Required Production Vars/Secrets

Set via `wrangler secret put` or dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` ⚠️ secret
- `STRIPE_SECRET_KEY` ⚠️ secret
- `STRIPE_WEBHOOK_SECRET` ⚠️ secret
- `NEXT_PUBLIC_SITE_URL`
- `NEXTJS_ENV=production`

### Stripe Webhook

Configure Stripe to send events to:
```
https://your-domain.com/api/stripe/webhook
```

The webhook route updates order payment status and stores Stripe IDs for reconciliation.

### Environment Files Summary

| File | Purpose |
|------|---------|
| `.env.local` | Next.js local dev (`npm run dev`) |
| `.dev.vars` | Wrangler local dev (`wrangler dev`) |
| `wrangler secrets` | Production secrets |
| `.env.local.example` | Template (no real secrets!) |

## API Surface (High-Level)

Main route groups:
- `/api/auth` (+ `/api/auth/me`)
- `/api/listings` and `/api/listings/[id]`
- `/api/messages`
- `/api/orders` and `/api/orders/[id]`
- `/api/checkout`
- `/api/stripe/webhook`
- `/api/reviews`
- `/api/reports`
- `/api/admin/*`
- `/api/events` (SSE stream for user-scoped message/order updates)

## Contributing

1. Fork/branch from `main`
2. Keep changes scoped and typed
3. Run lint/tests locally
4. Open PR with:
   - what changed
   - why
   - screenshots for UI changes
   - any DB/schema implications

## License

No license file is currently defined in this repository.
