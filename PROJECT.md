# TicoMarket

A Costa Rican marketplace web application for buying and selling goods locally, with integrated express delivery services.

**Status:** MVP Complete ✅ | Refactored ✅ | Roadmap Locked ✅  
**Last Updated:** 2026-02-05

---

## Overview

TicoMarket connects buyers and sellers across the Greater Metropolitan Area (GAM) of Costa Rica. Users can list items for sale, browse by category or location on a map, message sellers directly, and book express delivery through certified drivers.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion |
| Maps | Leaflet + React-Leaflet |
| Icons | Lucide React |
| Database | JSON file (`src/lib/db.json`) |
| Auth | Custom session-based (via React Context) |

---

## Project Structure

```
tico-market/
├── public/
│   └── uploads/           # User-uploaded images
├── src/
│   ├── app/
│   │   ├── page.tsx       # Homepage (list + map views)
│   │   ├── layout.tsx     # Root layout with AuthProvider
│   │   ├── account/       # User account dashboard
│   │   ├── listing/[id]/  # Listing detail page
│   │   ├── seller/[id]/   # Seller profile page
│   │   └── api/
│   │       ├── auth/      # Login/signup endpoints
│   │       ├── listings/  # CRUD for listings
│   │       ├── messages/  # Chat/messaging endpoints
│   │       └── users/     # User profile endpoints
│   ├── components/
│   │   ├── ChatModal.tsx  # Real-time messaging UI
│   │   └── Skeletons.tsx  # Loading skeleton components
│   ├── context/
│   │   └── AuthContext.tsx # Authentication state
│   └── lib/
│       ├── data.ts        # Static data (category emojis, etc.)
│       ├── db.json        # JSON database
│       └── db-provider.ts # Read/write helpers for db.json
├── package.json
└── PROJECT.md             # This file
```

---

## Features

### Core Marketplace
- **Listing feed** with grid layout
- **Map view** with Leaflet showing all listings as markers
- **Category filtering** (Electronics, Home, Vehicles, Food, Services, Fashion, Sports)
- **Real-time search** by title and description
- **Listing details** with image, price, description, seller info

### User Accounts
- Email/password registration and login
- User profiles with bio, location, join date
- **My Account** dashboard with tabs:
  - My Listings (edit/delete)
  - Favorites (persisted)
  - Messages (conversations)

### Messaging
- In-app chat between buyers and sellers
- Messages tied to specific listings
- "Message Seller" from profile (with listing picker if multiple)
- Real-time UI updates

### Express Delivery
- Floating action button to book delivery
- Driver selection modal
- Delivery confirmation flow
- Certified driver badges

### Polish
- Mobile-responsive design
- Slide-in mobile menu
- Loading skeletons
- Image thumbnails in map popups
- Framer Motion transitions throughout

---

## Data Model

### Listing
```typescript
{
  id: number,
  sellerId: string,
  title: string,
  description: string,
  price: string,           // e.g., "₡85,000"
  category: string,        // Electronics | Home | Vehicles | Food | Services | Fashion | Sports
  location: [number, number], // [lat, lng]
  rating: number,
  type: "seller" | "driver",
  owner: string,           // Display name
  imageUrl?: string,
  verified?: boolean,
  privateKey?: string      // For guest posts
}
```

### User
```typescript
{
  id: string,
  email: string,
  name: string,
  joined: string,          // ISO date
  verified: boolean,
  favorites?: string[],    // Listing IDs
  bio?: string,
  location?: string
}
```

### Message
```typescript
{
  id: number,
  listingId: number,
  senderId: string,
  receiverId: string,
  text: string,
  timestamp: number
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/listings` | Get all listings |
| POST | `/api/listings` | Create listing (FormData with image) |
| GET | `/api/listings/[id]` | Get single listing |
| PUT | `/api/listings/[id]` | Update listing |
| DELETE | `/api/listings/[id]` | Delete listing |
| POST | `/api/auth` | Login or signup |
| GET | `/api/users/[id]` | Get user profile |
| PUT | `/api/users/[id]` | Update user (favorites, etc.) |
| GET | `/api/messages?listingId=X&participantId=Y` | Get conversation |
| POST | `/api/messages` | Send message |

---

## Running Locally

```bash
cd tico-market
npm install
npm run dev
# → http://localhost:3000
```

Network access (for mobile testing):
```
http://192.168.1.85:3000
```

---

## Seed Data

The database includes 25+ realistic listings across all categories:
- Costa Rican pricing in colones (₡)
- Locations spread across GAM (San José, Escazú, Heredia, Alajuela, Cartago)
- Real product images from Unsplash
- Spanish descriptions for authenticity

---

## Refactoring Done ✅

### Completed (2026-02-04)

**1. ✅ Split `page.tsx` (795 → 241 lines)**
Extracted into modular components:
- `components/ListingCard.tsx` — listing grid card
- `components/MapView.tsx` — Leaflet map with markers  
- `components/AuthModal.tsx` — login/signup modal
- `components/BookingModal.tsx` — driver booking flow
- `components/SellModal.tsx` — create listing modal
- `components/MobileMenu.tsx` — hamburger slide-out
- `components/FilterBar.tsx` — search + category chips
- `components/Navbar.tsx` — top navigation bar
- `components/index.ts` — barrel export for clean imports

**2. ✅ Type definitions centralized**
Created `src/types/index.ts` with proper interfaces:
- `Listing`, `User`, `Message`, `Conversation`
- `Category` union type
- `AuthFormState`, `NewListingForm`, `BookingStep`

**3. ✅ Constants centralized**
Created `src/config/constants.ts`:
- `MAP_CENTER`, `MAP_DEFAULT_ZOOM`
- `DEFAULT_LISTING_COORDS`
- `DELIVERY_FEE`, `CURRENCY_SYMBOL`
- `API_ROUTES`
- Framer Motion animation variants

**4. ✅ Auth state synchronization**
- `AuthContext` now hydrates from `localStorage` AND fetches fresh data
- Favorites, verification status, and profile updates sync correctly
- `toggleFavorite` persists to backend and updates local state

**5. ✅ Form validation**
- `SellModal`: Title, Price (numeric), Description, Fulfillment options
- `AuthModal`: Email format, Password length (min 6), Name required (signup)
- Inline error messages for better UX

### Completed (2026-02-05)

**6. ✅ API error handling standardized**
- Created `lib/api-response.ts` helper
- Standardized error format: `{ error: string, code?: string }`
- Updated all core endpoints (auth, listings, users, orders) to use it

**7. ✅ Duplicate fetch logic removed**
- Implemented `ListingsContext` with `ListingsProvider`
- Moved listing data fetching to context (global state)
- Updated `page.tsx`, `account/page.tsx`, and `seller/[id]/page.tsx` to use `useListings`
- Removed ad-hoc `fetch('/api/listings')` calls from components

---

## Improvement Roadmap

### Phase 1: Immediate Enhancements (Priority)

**P1.1 — Persist sessions properly** ⬜
- Current: Auth stores in `localStorage` but gets wiped on refresh.  
- Goal: Use `httpOnly` cookies for sessions and add a `GET /api/auth/me` endpoint.  
- Impact: Stops annoying re-logins and makes auth actually secure.

**P1.2 — Add file upload validation** ⬜
- Current: No size/type checks + uploads to `/public/uploads`.  
- Goal: Add max file size (1MB) and MIME validation (`image/jpeg`, `image/png`).  
- Impact: Prevents server crashes from giant files and blocks malicious uploads. (Browser-side downsizer is a nice-to-have for later).

**P1.3 — Add SEO basics** ⬜
- Current: No `<title>` tags, no OpenGraph.  
- Goal: Add dynamic `<title>{listing.title} - TicoMarket</title>` and OG meta to listing/seller pages.  
- Impact: Better sharing on WhatsApp/Facebook, better search ranking.

**P1.4 — Add loading states to buttons** ⬜
- Current: Buttons stay clickable during async ops.  
- Goal: Add `isLoading` state to all form submit buttons.  
- Impact: Prevents double-clicks and shows feedback.

**P1.5 — Replace JSON "database" with Supabase** ⬜
- Current: `db.json` is a race condition waiting to happen.  
- Goal: Migrate to **Supabase** (free tier, 500MB).  
- Impact: Real transactions, concurrent safety, scales to real users.

**P1.6 — Add request authentication to API routes** ⬜
- Current: Anyone can hit `/api/listings` and modify data.  
- Goal: Add middleware to verify session cookie on all `/api/*` routes.  
- Impact: Closes the biggest security hole.

**P1.7 — Add client-side input sanitization** ⬜
- Current: No XSS protection.  
- Goal: Sanitize message/listing inputs with `DOMPurify` and strip HTML on server.  
- Impact: Stops script injection attacks.

### Phase 2: Feature Development & Polish

**P2.1 — Real-time messaging with Supabase Realtime** ⬜
- Current: Messages require manual refresh.  
- Goal: Implement real-time chat using **Supabase Realtime** (WebSockets).  
- Impact: Actual real-time chat, way better UX.

**P2.2 — Reviews & driver ratings** ⬜
- Current: No way to vet sellers/drivers.  
- Goal: Add a simple 5-star + comment system tied to completed deliveries.  
- Impact: Builds trust, keeps quality high.

**P2.3 — Location-based sorting ("near me")** ⬜
- Current: No "near me" filtering.  
- Goal: Filter listings by distance from user's location (browser geolocation).  
- Impact: Makes the map actually useful for buyers.

**P2.4 — Add image optimization (Cloudflare Images)** ⬜
- Current: Raw image uploads slow down the app.  
- Goal: Use **Cloudflare Images** (free tier) for auto-resize, WebP conversion, faster loads.  
- Impact: Faster loading times, better user experience.

**P2.5 — Add a "Mark as Sold" button** ⬜
- Current: No way to delist sold items.  
- Goal: Add toggle listing status (active/sold) from the account page.  
- Impact: Keeps feed clean, reduces frustration.

**P2.6 — Add typing indicators in chat** ⬜
- Current: Silent waiting during message send.  
- Goal: Add "Typing..." indicator when the other party is composing.  
- Impact: Chat feels more alive and responsive.

**P2.7 — Better mobile nav** ⬜
- Current: Slide-out menu works but could be smoother.  
- Goal: Use a proper drawer library (e.g., **Vaul**) for swipe-to-close gestures.  
- Impact: More native app feel.

### Phase 3: Hardening & Scalability

**P3.1 — Add rate limiting** ⬜
- Current: No protection against brute force or spam.  
- Goal: Use **Upstash Ratelimit** (free) on `/api/auth` and `/api/messages`.  
- Impact: Prevents credential stuffing and spam floods.

**P3.2 — Move uploaded images to Cloudflare R2** ⬜
- Current: `/public/uploads` gets wiped on redeploy.  
- Goal: Upload to **Cloudflare R2** (free tier).  
- Impact: Survives deployments, proper CDN delivery.

---

## Current Limitations

- **Accessibility gaps:** Missing `aria-label` on icon-only buttons, no keyboard navigation for modals, focus trap not implemented on modals, no skip-to-content link.
- **Testing absent:** No unit tests, no integration tests, no E2E tests. Add at minimum: API route tests, critical flow E2E.
- **CSS organization:** Most styles inline via Tailwind (fine, but verbose). Some repeated patterns could be `@apply` utilities. Consider component-level CSS modules for complex components.
- **Payment integration:** Booking is mock-only.

---

## Commits History

```
xxxxxxx Phase 6: Refactor - Component extraction, types, config
49f1b09 Phase 5: Polish - Mobile menu, loading skeletons, better UX
2b5353d Phase 4: User features - Account page, favorites, listing management
6475454 Phase 3: Messaging system
da70769 Phase 2: Working search and category filters
a2a55f2 Phase 1: Add 25 diverse realistic seed listings
```

---

*Built with ❤️ in Costa Rica*
