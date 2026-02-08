-- TicoMarket Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database

-- Enable Row Level Security
alter table if exists public.profiles enable row level security;
alter table if exists public.listings enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.favorites enable row level security;
alter table if exists public.reviews enable row level security;

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
  joined timestamptz default now(),
  pickup_locations jsonb default '[]'::jsonb,
  accepts_delivery boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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
  price text not null,
  category text not null,
  location_lat decimal(10, 8) not null default 9.9281,
  location_lng decimal(11, 8) not null default -84.0907,
  rating decimal(3,2) default 5.0,
  type text not null check (type in ('seller', 'driver')),
  owner text not null,
  image_url text,
  verified boolean default false,
  private_key text,
  pickup_config jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index for faster queries
create index if not exists idx_listings_seller_id on public.listings(seller_id);
create index if not exists idx_listings_category on public.listings(category);
create index if not exists idx_listings_type on public.listings(type);

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

-- ==================== REVIEWS TABLE ====================

create table if not exists public.reviews (
  id bigserial primary key,
  order_id text references public.orders(id) on delete cascade not null unique,
  listing_id bigint references public.listings(id) on delete cascade not null,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  buyer_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

create index if not exists idx_reviews_seller_id on public.reviews(seller_id);
create index if not exists idx_reviews_listing_id on public.reviews(listing_id);
create index if not exists idx_reviews_buyer_id on public.reviews(buyer_id);
create index if not exists idx_reviews_created_at on public.reviews(created_at);

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
  with check (auth.role() = 'authenticated');

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
  with check (auth.role() = 'authenticated');

create policy "Recipients can mark messages as read"
  on public.messages for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Orders: Buyers and sellers can view their orders
create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id or auth.uid() = driver_id);

create policy "Authenticated users can create orders"
  on public.orders for insert
  with check (auth.role() = 'authenticated');

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
  with check (auth.role() = 'authenticated');

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
