-- Add SINPE config and event drivers tables

-- SINPE CONFIG TABLE
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

-- EVENT DRIVERS TABLE
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

-- RLS POLICIES
create policy "SINPE config is viewable by everyone" on public.sinpe_config for select using (true);
create policy "Authenticated users can manage SINPE config" on public.sinpe_config for all using (auth.uid() is not null);

create policy "Event driver signups are viewable by everyone" on public.event_drivers for select using (true);
create policy "Drivers can create their event signups" on public.event_drivers for insert with check (auth.uid() = driver_id);
create policy "Drivers can update their event signups" on public.event_drivers for update using (auth.uid() = driver_id);
create policy "Drivers can delete their event signups" on public.event_drivers for delete using (auth.uid() = driver_id);

-- TRIGGERS
drop trigger if exists handle_sinpe_config_updated_at on public.sinpe_config;
create trigger handle_sinpe_config_updated_at before update on public.sinpe_config for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_event_drivers_updated_at on public.event_drivers;
create trigger handle_event_drivers_updated_at before update on public.event_drivers for each row execute procedure public.handle_updated_at();
