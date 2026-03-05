-- TicoMarket Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database

-- Enable Row Level Security
alter table if exists public.profiles enable row level security;
alter table if exists public.listings enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.favorites enable row level security;
alter table if exists public.reviews enable row level security;
alter table if exists public.driver_profiles enable row level security;
alter table if exists public.delivery_requests enable row level security;
alter table if exists public.delivery_bids enable row level security;
alter table if exists public.sinpe_config enable row level security;
alter table if exists public.event_drivers enable row level security;

-- ==================== PROFILES TABLE ====================
-- Extends auth.users with additional user information

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text not null,
  bio text,
  location text default 'Costa Rica',
  rating decimal(3,2) default 5.0,
  verified boolean default false,
  role text not null default 'user' check (role in ('user', 'admin', 'moderator')),
  joined timestamptz default now(),
  pickup_locations jsonb default '[]'::jsonb,
  accepts_delivery boolean default true,
  avg_response_minutes integer,
  total_transactions integer default 0,
  landmark_directions text,
  verification_badges jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles add column if not exists role text not null default 'user';
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('user', 'admin', 'moderator'));
  end if;
end $$;

-- Trigger to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==================== LISTINGS TABLE ====================

create table if not exists public.listings (
  id bigserial primary key,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  price text,
  price_cents integer not null default 0,
  currency text not null default 'CRC' check (currency in ('CRC', 'USD')),
  category text not null,
  location_lat decimal(10, 8) not null default 9.9281,
  location_lng decimal(11, 8) not null default -84.0907,
  rating decimal(3,2) default 5.0,
  listing_kind text not null check (listing_kind in ('seller', 'driver')),
  owner text not null,
  image_url text,
  image_urls jsonb default '[]'::jsonb,
  condition text default 'good' check (condition in ('new', 'like_new', 'good', 'fair', 'for_parts')),
  item_type text default 'physical' check (item_type in ('physical', 'food', 'service', 'rental', 'free')),
  fulfillment_options jsonb default '{"pickup": true, "platform_delivery": true}'::jsonb,
  verified boolean default false,
  moderation_status text not null default 'active' check (moderation_status in ('active', 'hidden')),
  private_key text,
  pickup_config jsonb default '{}'::jsonb,
  expires_at timestamptz,
  last_bumped_at timestamptz default now(),
  landmark_directions text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.listings add column if not exists moderation_status text not null default 'active';
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'listings_moderation_status_check'
  ) then
    alter table public.listings
      add constraint listings_moderation_status_check
      check (moderation_status in ('active', 'hidden'));
  end if;
end $$;

-- Create index for faster queries
create index if not exists idx_listings_seller_id on public.listings(seller_id);
create index if not exists idx_listings_category on public.listings(category);
create index if not exists idx_listings_listing_kind on public.listings(listing_kind);
create index if not exists idx_listings_moderation_status on public.listings(moderation_status);

-- ==================== MESSAGES TABLE ====================

create table if not exists public.messages (
  id bigserial primary key,
  listing_id bigint references public.listings(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  created_at timestamptz default now(),
  read boolean default false,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  buyer_name text not null,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  seller_name text not null
);

-- Indexes for messages
create index if not exists idx_messages_listing_id on public.messages(listing_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_messages_buyer_id on public.messages(buyer_id);
create index if not exists idx_messages_seller_id on public.messages(seller_id);
create index if not exists idx_messages_created_at on public.messages(created_at);

-- ==================== ORDERS TABLE ====================

create table if not exists public.orders (
  id text primary key default 'order-' || extract(epoch from now())::bigint::text,
  listing_id bigint references public.listings(id) on delete cascade not null,
  listing_snapshot jsonb not null,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  buyer_name text not null,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  seller_name text not null,
  type text not null check (type in ('delivery', 'pickup')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'in_transit', 'completed', 'cancelled')),
  driver_id uuid references public.profiles(id) on delete set null,
  driver_name text,
  delivery_address text,
  delivery_fee integer,
  pickup_location_id text,
  pickup_location jsonb,
  scheduled_window text,
  notes text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'requires_payment', 'paid', 'failed', 'refunded')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  payment_amount integer,
  payment_currency text default 'crc',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Safe upgrades for existing databases
alter table public.orders add column if not exists payment_status text not null default 'pending';
alter table public.orders add column if not exists stripe_checkout_session_id text;
alter table public.orders add column if not exists stripe_payment_intent_id text;
alter table public.orders add column if not exists payment_amount integer;
alter table public.orders add column if not exists payment_currency text default 'crc';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_status_check'
  ) then
    alter table public.orders
      add constraint orders_payment_status_check
      check (payment_status in ('pending', 'requires_payment', 'paid', 'failed', 'refunded'));
  end if;
end $$;

-- Indexes for orders
create index if not exists idx_orders_buyer_id on public.orders(buyer_id);
create index if not exists idx_orders_seller_id on public.orders(seller_id);
create index if not exists idx_orders_driver_id on public.orders(driver_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_payment_status on public.orders(payment_status);
create index if not exists idx_orders_listing_id on public.orders(listing_id);
create index if not exists idx_orders_created_at on public.orders(created_at);
create index if not exists idx_orders_stripe_session on public.orders(stripe_checkout_session_id);

-- ==================== DRIVER PROFILES TABLE ====================

create table if not exists public.driver_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade unique not null,
  vehicle_type text check (vehicle_type in ('motorcycle', 'car', 'pickup', 'bike', 'walker')),
  capacity_description text,
  specialties text[] default '{}'::text[],
  service_radius_km integer default 10,
  base_location_lat double precision,
  base_location_lng double precision,
  current_lat double precision,
  current_lng double precision,
  is_online boolean default false,
  live_now boolean default false,
  total_deliveries integer default 0,
  rating double precision default 5.0,
  face_image_url text,
  is_verified boolean default false,
  verification_status text not null default 'none' check (verification_status in ('none', 'pending', 'approved', 'rejected')),
  license_image_key text,
  base_rate integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Safe upgrades for existing driver_profiles
alter table public.driver_profiles add column if not exists face_image_url text;
alter table public.driver_profiles add column if not exists is_verified boolean default false;
alter table public.driver_profiles add column if not exists verification_status text not null default 'none';
alter table public.driver_profiles add column if not exists license_image_key text;
alter table public.driver_profiles add column if not exists base_rate integer;
alter table public.driver_profiles add column if not exists current_lat double precision;
alter table public.driver_profiles add column if not exists current_lng double precision;
alter table public.driver_profiles add column if not exists is_online boolean default false;
alter table public.driver_profiles add column if not exists live_now boolean default false;

create index if not exists idx_driver_profiles_user_id on public.driver_profiles(user_id);
create index if not exists idx_driver_profiles_online on public.driver_profiles(is_online);
create index if not exists idx_driver_profiles_live_now on public.driver_profiles(live_now);
create index if not exists idx_driver_profiles_vehicle_type on public.driver_profiles(vehicle_type);
alter table public.driver_profiles enable row level security;

-- ==================== DELIVERY REQUESTS TABLE ====================

create table if not exists public.delivery_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('open', 'assigned', 'in_transit', 'completed', 'cancelled')) default 'open',

  pickup_address text not null,
  pickup_lat double precision,
  pickup_lng double precision,
  pickup_instructions text,
  pickup_window_start timestamptz,
  pickup_window_end timestamptz,

  dropoff_address text not null,
  dropoff_lat double precision,
  dropoff_lng double precision,
  dropoff_instructions text,
  dropoff_window_start timestamptz,
  dropoff_window_end timestamptz,

  item_description text not null,
  item_photos text[] default '{}'::text[],
  estimated_weight_kg double precision,
  is_fragile boolean default false,

  budget_amount integer,
  final_amount integer,

  assigned_driver_id uuid references public.profiles(id),
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,

  request_type text not null default 'broadcast' check (request_type in ('auto', 'manual', 'broadcast')),
  target_driver_id uuid references public.driver_profiles(id),
  expires_at timestamptz,
  offered_price integer,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Safe upgrades for existing delivery_requests
alter table public.delivery_requests add column if not exists request_type text not null default 'broadcast';
alter table public.delivery_requests add column if not exists target_driver_id uuid;
alter table public.delivery_requests add column if not exists expires_at timestamptz;
alter table public.delivery_requests add column if not exists offered_price integer;

create index if not exists idx_delivery_requests_requester_id on public.delivery_requests(requester_id);
create index if not exists idx_delivery_requests_status on public.delivery_requests(status);
create index if not exists idx_delivery_requests_assigned_driver on public.delivery_requests(assigned_driver_id);
create index if not exists idx_delivery_requests_created_at on public.delivery_requests(created_at);
create index if not exists idx_delivery_requests_type on public.delivery_requests(request_type);
alter table public.delivery_requests enable row level security;

-- ==================== DELIVERY BIDS TABLE ====================

create table if not exists public.delivery_bids (
  id uuid primary key default gen_random_uuid(),
  delivery_request_id uuid references public.delivery_requests(id) on delete cascade not null,
  driver_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  eta_minutes integer,
  message text,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(delivery_request_id, driver_id)
);

create index if not exists idx_delivery_bids_request_id on public.delivery_bids(delivery_request_id);
create index if not exists idx_delivery_bids_driver_id on public.delivery_bids(driver_id);
create index if not exists idx_delivery_bids_status on public.delivery_bids(status);
alter table public.delivery_bids enable row level security;

-- ==================== DRIVER DOCUMENTS TABLE ====================

create table if not exists public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_profile_id uuid references public.driver_profiles(id) on delete cascade not null,
  document_type text not null default 'license' check (document_type in ('license')),
  storage_key text not null,
  uploaded_at timestamptz default now()
);

create index if not exists idx_driver_documents_profile_id on public.driver_documents(driver_profile_id);
alter table public.driver_documents enable row level security;

-- ==================== DELIVERY NEGOTIATIONS TABLE ====================

create table if not exists public.delivery_negotiations (
  id uuid primary key default gen_random_uuid(),
  delivery_request_id uuid references public.delivery_requests(id) on delete cascade not null,
  proposed_by uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'rejected', 'countered')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Safe upgrades for existing delivery_negotiations
alter table public.delivery_negotiations add column if not exists updated_at timestamptz default now();

create index if not exists idx_delivery_negotiations_request_id on public.delivery_negotiations(delivery_request_id);
create index if not exists idx_delivery_negotiations_proposed_by on public.delivery_negotiations(proposed_by);
alter table public.delivery_negotiations enable row level security;

-- ==================== SINPE CONFIG TABLE ====================

create table if not exists public.sinpe_config (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'SINPE Movil',
  phone_number text not null,
  account_holder text not null,
  instructions text,
  is_enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_sinpe_config_enabled on public.sinpe_config(is_enabled);
alter table public.sinpe_config enable row level security;

-- ==================== EVENT DRIVERS TABLE ====================

create table if not exists public.event_drivers (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.profiles(id) on delete cascade not null,
  event_id text not null,
  event_name text not null,
  event_date date not null,
  location_name text not null,
  availability_start time,
  availability_end time,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(driver_id, event_id, event_date)
);

create index if not exists idx_event_drivers_driver_id on public.event_drivers(driver_id);
create index if not exists idx_event_drivers_event_date on public.event_drivers(event_date);
create index if not exists idx_event_drivers_status on public.event_drivers(status);
alter table public.event_drivers enable row level security;

-- ==================== REVIEWS TABLE ====================

create table if not exists public.reviews (
  id bigserial primary key,
  order_id text references public.orders(id) on delete cascade not null unique,
  listing_id bigint references public.listings(id) on delete cascade not null,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  buyer_name text not null,
  driver_id uuid references public.profiles(id) on delete set null,
  review_type text default 'seller' check (review_type in ('seller', 'driver')),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

create index if not exists idx_reviews_seller_id on public.reviews(seller_id);
create index if not exists idx_reviews_listing_id on public.reviews(listing_id);
create index if not exists idx_reviews_buyer_id on public.reviews(buyer_id);
create index if not exists idx_reviews_driver_id on public.reviews(driver_id);
create index if not exists idx_reviews_created_at on public.reviews(created_at);

-- ==================== REPORTS TABLE ====================

create table if not exists public.reports (
  id bigserial primary key,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  target_type text not null check (target_type in ('listing', 'user')),
  target_listing_id bigint references public.listings(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_reports_reporter_id on public.reports(reporter_id);
create index if not exists idx_reports_status on public.reports(status);
create index if not exists idx_reports_listing_id on public.reports(target_listing_id);
create index if not exists idx_reports_target_user_id on public.reports(target_user_id);

-- ==================== FAVORITES TABLE (Junction) ====================

create table if not exists public.favorites (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  listing_id bigint references public.listings(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, listing_id)
);

-- Indexes for favorites
create index if not exists idx_favorites_user_id on public.favorites(user_id);
create index if not exists idx_favorites_listing_id on public.favorites(listing_id);

-- ==================== ROW LEVEL SECURITY POLICIES ====================

-- Profiles: Users can read all profiles, but only update their own
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Listings: Anyone can view, only seller can modify
create policy "Listings are viewable by everyone"
  on public.listings for select
  using (true);

create policy "Authenticated users can create listings"
  on public.listings for insert
  with check (auth.uid() = seller_id);

create policy "Sellers can update their own listings"
  on public.listings for update
  using (auth.uid() = seller_id);

create policy "Sellers can delete their own listings"
  on public.listings for delete
  using (auth.uid() = seller_id);

-- Messages: Participants can view and create messages
create policy "Users can view messages they're part of"
  on public.messages for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id or auth.uid() = sender_id);

create policy "Authenticated users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Recipients can mark messages as read"
  on public.messages for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Orders: Buyers and sellers can view their orders
create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id or auth.uid() = driver_id);

create policy "Authenticated users can create orders"
  on public.orders for insert
  with check (auth.uid() = buyer_id);

create policy "Buyers and sellers can update orders"
  on public.orders for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Favorites: Users can view and manage their own favorites
create policy "Users can view their own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Users can add their own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- Reviews: visible to everyone, only authenticated users create via API checks
create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using (true);

create policy "Authenticated users can create reviews"
  on public.reviews for insert
  with check (auth.uid() = buyer_id);

-- Reports: users can create and view own reports
create policy "Users can view own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

create policy "Authenticated users can create reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

-- Driver profiles: anyone can view online drivers, users manage own profile
create policy "Driver profiles are viewable by everyone"
  on public.driver_profiles for select
  using (true);

create policy "Users can create own driver profile"
  on public.driver_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own driver profile"
  on public.driver_profiles for update
  using (auth.uid() = user_id);

create policy "Users can delete own driver profile"
  on public.driver_profiles for delete
  using (auth.uid() = user_id);

-- Delivery requests: public read for marketplace, requester creates/updates, assigned driver can update transit states
create policy "Delivery requests are viewable by everyone"
  on public.delivery_requests for select
  using (true);

create policy "Users can create own delivery requests"
  on public.delivery_requests for insert
  with check (auth.uid() = requester_id);

create policy "Requesters and assigned drivers can update delivery requests"
  on public.delivery_requests for update
  using (auth.uid() = requester_id or auth.uid() = assigned_driver_id);

create policy "Requesters can delete their own delivery requests"
  on public.delivery_requests for delete
  using (auth.uid() = requester_id);

-- Delivery bids: marketplace-visible, drivers create own bids, requesters and drivers can update status
create policy "Delivery bids are viewable by everyone"
  on public.delivery_bids for select
  using (true);

create policy "Drivers can create own bids"
  on public.delivery_bids for insert
  with check (auth.uid() = driver_id);

create policy "Drivers and requesters can update bids"
  on public.delivery_bids for update
  using (
    auth.uid() = driver_id
    or exists (
      select 1
      from public.delivery_requests dr
      where dr.id = delivery_request_id
        and dr.requester_id = auth.uid()
    )
  );

create policy "Drivers can delete own bids"
  on public.delivery_bids for delete
  using (auth.uid() = driver_id);

-- SINPE config: public read, admin/moderator write
create policy "SINPE config is viewable by everyone"
  on public.sinpe_config for select
  using (true);

create policy "Admins can insert SINPE config"
  on public.sinpe_config for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'moderator')
    )
  );

create policy "Admins can update SINPE config"
  on public.sinpe_config for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'moderator')
    )
  );

create policy "Admins can delete SINPE config"
  on public.sinpe_config for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'moderator')
    )
  );

-- Event driver signups: users can manage their own entries
create policy "Event driver signups are viewable by everyone"
  on public.event_drivers for select
  using (true);

create policy "Drivers can create their event signups"
  on public.event_drivers for insert
  with check (auth.uid() = driver_id);

create policy "Drivers can update their event signups"
  on public.event_drivers for update
  using (auth.uid() = driver_id);

create policy "Drivers can delete their event signups"
  on public.event_drivers for delete
  using (auth.uid() = driver_id);

-- Driver documents: drivers manage own, admins can view all
create policy "Driver documents viewable by owner and admins"
  on public.driver_documents for select
  using (
    exists (
      select 1 from public.driver_profiles dp
      where dp.id = driver_profile_id
        and dp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'moderator')
    )
  );

create policy "Drivers can upload own documents"
  on public.driver_documents for insert
  with check (
    exists (
      select 1 from public.driver_profiles dp
      where dp.id = driver_profile_id
        and dp.user_id = auth.uid()
    )
  );

-- Delivery negotiations: participants can view, participants can create
create policy "Delivery negotiations viewable by participants"
  on public.delivery_negotiations for select
  using (
    proposed_by = auth.uid()
    or exists (
      select 1 from public.delivery_requests dr
      where dr.id = delivery_request_id
        and (dr.requester_id = auth.uid() or dr.assigned_driver_id = auth.uid())
    )
  );

create policy "Participants can create negotiations"
  on public.delivery_negotiations for insert
  with check (auth.uid() = proposed_by);

create policy "Participants can update negotiations"
  on public.delivery_negotiations for update
  using (
    proposed_by = auth.uid()
    or exists (
      select 1 from public.delivery_requests dr
      where dr.id = delivery_request_id
        and dr.requester_id = auth.uid()
    )
  );

-- ==================== FUNCTIONS ====================

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_listings_updated_at
  before update on public.listings
  for each row execute procedure public.handle_updated_at();

create trigger handle_orders_updated_at
  before update on public.orders
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_driver_profiles_updated_at on public.driver_profiles;
create trigger handle_driver_profiles_updated_at
  before update on public.driver_profiles
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_delivery_requests_updated_at on public.delivery_requests;
create trigger handle_delivery_requests_updated_at
  before update on public.delivery_requests
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_delivery_bids_updated_at on public.delivery_bids;
create trigger handle_delivery_bids_updated_at
  before update on public.delivery_bids
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_sinpe_config_updated_at on public.sinpe_config;
create trigger handle_sinpe_config_updated_at
  before update on public.sinpe_config
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_event_drivers_updated_at on public.event_drivers;
create trigger handle_event_drivers_updated_at
  before update on public.event_drivers
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_delivery_negotiations_updated_at on public.delivery_negotiations;
create trigger handle_delivery_negotiations_updated_at
  before update on public.delivery_negotiations
  for each row execute procedure public.handle_updated_at();
