-- Add role column to profiles table
alter table public.profiles add column if not exists role text not null default 'user' check (role in ('user', 'admin', 'moderator'));

-- Update existing profiles (optional: first profile becomes admin if none exist)
do $$
begin
  if not exists (select 1 from public.profiles where role = 'admin') then
    update public.profiles
    set role = 'admin'
    where id in (
      select id from public.profiles order by created_at asc limit 1
    );
  end if;
end $$;
