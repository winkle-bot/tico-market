# TicoMarket

A Costa Rican marketplace web application for buying and selling goods locally, with integrated express delivery services.

**Status:** MVP Complete ✅ | Refactored ✅  
**Last Updated:** 2026-02-04

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

## Known Limitations

1. **No real authentication** — passwords stored in plain text in JSON
2. **No real-time updates** — messages require refresh to see new ones
3. **No image optimization** — raw uploads, no resizing
4. **Single-server DB** — JSON file won't scale
5. **No payment integration** — booking is mock-only

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

## Remaining Refactoring

### 🟡 Medium Priority

**1. CSS organization**
- Most styles inline via Tailwind (fine, but verbose)
- Multiple components fetch `/api/listings` independently
- Consider React Query, SWR, or a simple data fetching hook

**3. CSS organization**
- Most styles inline via Tailwind (fine, but verbose)
- Some repeated patterns could be `@apply` utilities
- Consider component-level CSS modules for complex components

### 🟢 Low Priority (Nice to Have)

**4. Image handling brittle**
- Uploads go to `/public/uploads` (not recommended in production)
- No file type validation beyond `accept="image/*"`
- No max file size enforcement
- Should use a proper file storage (S3, Cloudinary, Uploadthing)

**10. Accessibility gaps**
- Missing `aria-label` on icon-only buttons
- No keyboard navigation for modals
- Focus trap not implemented on modals
- No skip-to-content link

**11. SEO incomplete**
- Dynamic pages lack proper `<title>` and `<meta>` tags
- No OpenGraph tags for social sharing
- No sitemap or robots.txt

**12. Testing absent**
- No unit tests
- No integration tests
- No E2E tests
- Add at minimum: API route tests, critical flow E2E

---

## Quick Wins

Things that would take <30 min each:

- [x] Extract `ListingCard` component ✅
- [x] Create `types/index.ts` and fix `any` types ✅
- [x] Add config file for constants (coordinates, categories) ✅
- [x] Add basic form validation to listing creation ✅
- [x] Add `aria-label` to all icon buttons ✅
- [ ] Add proper `<title>` tags to listing/seller pages

---

## Future Improvements

- [ ] Real database (PostgreSQL/Supabase or Firebase)
- [ ] Proper auth (NextAuth.js or Clerk)
- [ ] Real-time messaging (WebSockets or Supabase Realtime)
- [ ] Image optimization and CDN
- [ ] Push notifications
- [ ] Payment integration (SINPE Móvil, cards)
- [ ] Admin dashboard
- [ ] Reviews and ratings system
- [ ] Location-based sorting ("near me")

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
