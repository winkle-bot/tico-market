-- Migration: Feria Module
-- Creates ferias table, feria_vendors junction, feria_followers

-- ==================== FERIAS TABLE ====================

create table if not exists public.ferias (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  location_name text not null,
  location_lat double precision,
  location_lng double precision,
  waze_link text,

  -- Schedule
  schedule_text text, -- "Every Saturday 7am-1pm"
  schedule_days text[] default '{}'::text[], -- ['saturday']
  start_time time,
  end_time time,
  next_date date,

  -- Organizer
  organizer_id uuid references public.profiles(id) on delete set null,
  organizer_name text,
  contact_phone text,
  contact_email text,

  -- Media
  cover_image_url text,
  photos jsonb default '[]'::jsonb,

  -- Meta
  is_active boolean default true,
  vendor_count integer default 0,
  follower_count integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ferias_slug on public.ferias(slug);
create index if not exists idx_ferias_active on public.ferias(is_active);
create index if not exists idx_ferias_next_date on public.ferias(next_date);
create index if not exists idx_ferias_organizer on public.ferias(organizer_id);
alter table public.ferias enable row level security;

-- RLS: Anyone can view ferias, organizers can manage
create policy "Ferias are viewable by everyone"
  on public.ferias for select using (true);

create policy "Authenticated users can create ferias"
  on public.ferias for insert
  with check (auth.uid() = organizer_id);

create policy "Organizers can update their ferias"
  on public.ferias for update
  using (auth.uid() = organizer_id);

-- ==================== FERIA VENDORS TABLE ====================

create table if not exists public.feria_vendors (
  id uuid primary key default gen_random_uuid(),
  feria_id uuid references public.ferias(id) on delete cascade not null,
  vendor_id uuid references public.profiles(id) on delete cascade not null,
  display_name text,
  description text,
  products_summary text, -- "Organic vegetables, herbs, honey"
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(feria_id, vendor_id)
);

create index if not exists idx_feria_vendors_feria on public.feria_vendors(feria_id);
create index if not exists idx_feria_vendors_vendor on public.feria_vendors(vendor_id);
create index if not exists idx_feria_vendors_status on public.feria_vendors(status);
alter table public.feria_vendors enable row level security;

create policy "Feria vendors are viewable by everyone"
  on public.feria_vendors for select using (true);

create policy "Users can apply as vendors"
  on public.feria_vendors for insert
  with check (auth.uid() = vendor_id);

create policy "Vendors can update their own entry"
  on public.feria_vendors for update
  using (auth.uid() = vendor_id);

-- ==================== FERIA FOLLOWERS TABLE ====================

create table if not exists public.feria_followers (
  id uuid primary key default gen_random_uuid(),
  feria_id uuid references public.ferias(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),

  unique(feria_id, user_id)
);

create index if not exists idx_feria_followers_feria on public.feria_followers(feria_id);
create index if not exists idx_feria_followers_user on public.feria_followers(user_id);
alter table public.feria_followers enable row level security;

create policy "Feria followers viewable by everyone"
  on public.feria_followers for select using (true);

create policy "Users can follow ferias"
  on public.feria_followers for insert
  with check (auth.uid() = user_id);

create policy "Users can unfollow ferias"
  on public.feria_followers for delete
  using (auth.uid() = user_id);

-- ==================== TRIGGERS ====================

drop trigger if exists handle_ferias_updated_at on public.ferias;
create trigger handle_ferias_updated_at
  before update on public.ferias
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_feria_vendors_updated_at on public.feria_vendors;
create trigger handle_feria_vendors_updated_at
  before update on public.feria_vendors
  for each row execute procedure public.handle_updated_at();
