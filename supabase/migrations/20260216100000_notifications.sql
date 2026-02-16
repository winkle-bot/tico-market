-- Migration: Push Subscriptions + Notification Preferences
-- Adds push notification storage and WhatsApp opt-in fields

-- ==================== PUSH SUBSCRIPTIONS ====================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, endpoint)
);

create index if not exists idx_push_subs_user on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;

create policy "Users can manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==================== NOTIFICATION PREFERENCES ON PROFILES ====================

alter table public.profiles add column if not exists notification_prefs jsonb
  default '{"push_messages": true, "push_orders": true, "push_delivery": true, "whatsapp_messages": false, "whatsapp_orders": false}'::jsonb;

alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists whatsapp_opted_in boolean default false;
