-- Migration: Trust & Growth Features
-- Listing expiry, driver reviews, response time, landmark directions

-- ==================== LISTING EXPIRY ====================
alter table public.listings add column if not exists expires_at timestamptz;
alter table public.listings add column if not exists last_bumped_at timestamptz default now();

create index if not exists idx_listings_expires_at on public.listings(expires_at);

-- Set default expiry to 30 days from now for existing listings
update public.listings set expires_at = created_at + interval '30 days' where expires_at is null;

-- ==================== DRIVER REVIEWS ====================
alter table public.reviews add column if not exists driver_id uuid references public.profiles(id) on delete set null;
alter table public.reviews add column if not exists review_type text default 'seller' check (review_type in ('seller', 'driver'));

create index if not exists idx_reviews_driver on public.reviews(driver_id);
create index if not exists idx_reviews_type on public.reviews(review_type);

-- ==================== RESPONSE TIME TRACKING ====================
alter table public.profiles add column if not exists avg_response_minutes integer;
alter table public.profiles add column if not exists total_transactions integer default 0;

-- ==================== LANDMARK DIRECTIONS ====================
alter table public.listings add column if not exists landmark_directions text;
alter table public.profiles add column if not exists landmark_directions text;

-- ==================== VERIFICATION BADGES ====================
-- Extend beyond single boolean verified
alter table public.profiles add column if not exists verification_badges jsonb default '[]'::jsonb;
-- Format: [{"type": "phone", "verified_at": "..."}, {"type": "cedula", ...}]
-- Types: phone, cedula, business, feria_vendor
