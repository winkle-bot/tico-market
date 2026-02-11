-- Ensure driver_profiles has all columns expected by the API and types.

begin;

alter table if exists public.driver_profiles
  add column if not exists face_image_url text,
  add column if not exists is_verified boolean default false,
  add column if not exists verification_status text default 'none',
  add column if not exists license_image_key text,
  add column if not exists base_rate integer,
  add column if not exists live_now boolean default false;

-- Backfill and normalize verification defaults for existing rows.
update public.driver_profiles
set
  is_verified = coalesce(is_verified, false),
  verification_status = coalesce(verification_status, 'none'),
  live_now = coalesce(live_now, false)
where
  is_verified is null
  or verification_status is null
  or live_now is null;

alter table public.driver_profiles
  alter column is_verified set default false,
  alter column verification_status set default 'none',
  alter column verification_status set not null,
  alter column live_now set default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'driver_profiles_verification_status_check'
  ) then
    alter table public.driver_profiles
      add constraint driver_profiles_verification_status_check
      check (verification_status in ('none', 'pending', 'approved', 'rejected'));
  end if;
end $$;

-- Force PostgREST schema cache refresh for environments that need explicit reload.
notify pgrst, 'reload schema';

commit;
