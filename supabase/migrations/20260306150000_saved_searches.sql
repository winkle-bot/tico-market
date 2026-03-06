create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  query_text text,
  categories text[] not null default '{}',
  listing_kind text,
  min_price integer,
  max_price integer,
  sort text not null default 'newest',
  alert_enabled boolean not null default true,
  fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, fingerprint)
);

create index if not exists idx_saved_searches_user on public.saved_searches(user_id);
create index if not exists idx_saved_searches_alert_enabled on public.saved_searches(alert_enabled);

alter table public.saved_searches enable row level security;

drop policy if exists "Users can view own saved searches" on public.saved_searches;
drop policy if exists "Users can create own saved searches" on public.saved_searches;
drop policy if exists "Users can update own saved searches" on public.saved_searches;
drop policy if exists "Users can delete own saved searches" on public.saved_searches;

create policy "Users can view own saved searches"
  on public.saved_searches for select
  using (auth.uid() = user_id);

create policy "Users can create own saved searches"
  on public.saved_searches for insert
  with check (auth.uid() = user_id);

create policy "Users can update own saved searches"
  on public.saved_searches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own saved searches"
  on public.saved_searches for delete
  using (auth.uid() = user_id);

drop trigger if exists handle_saved_searches_updated_at on public.saved_searches;
create trigger handle_saved_searches_updated_at
  before update on public.saved_searches
  for each row execute procedure public.handle_updated_at();
