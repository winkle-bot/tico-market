alter table public.feria_vendors
  add column if not exists weekly_availability jsonb default '{}'::jsonb;
