-- Migration: Dispute Resolution System
-- Disputes table + dispute messages with evidence

-- ==================== DISPUTES ====================

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete restrict,
  opened_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in (
    'item_not_received', 'item_not_as_described', 'damaged',
    'wrong_item', 'seller_unresponsive', 'other'
  )),
  description text not null,
  status text not null default 'open' check (status in (
    'open', 'under_review', 'resolved_buyer', 'resolved_seller',
    'resolved_refund', 'closed'
  )),
  resolution_notes text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_disputes_order on public.disputes(order_id);
create index if not exists idx_disputes_opened_by on public.disputes(opened_by);
create index if not exists idx_disputes_status on public.disputes(status);

-- Only one active dispute per order
create unique index if not exists idx_disputes_active_order
  on public.disputes(order_id)
  where status not in ('resolved_buyer', 'resolved_seller', 'resolved_refund', 'closed');

alter table public.disputes enable row level security;

-- Order parties and admins can view disputes
create policy "Order parties can view disputes"
  on public.disputes for select
  using (
    opened_by = auth.uid()
    or exists (
      select 1 from public.orders o
      where o.id = disputes.order_id
      and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'moderator')
    )
  );

-- Only order parties can open disputes
create policy "Order parties can open disputes"
  on public.disputes for insert
  with check (
    auth.uid() = opened_by
    and exists (
      select 1 from public.orders o
      where o.id = order_id
      and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

-- Only admins can update dispute status
create policy "Admins can update disputes"
  on public.disputes for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'moderator')
    )
  );

-- Triggers
drop trigger if exists handle_disputes_updated_at on public.disputes;
create trigger handle_disputes_updated_at
  before update on public.disputes
  for each row execute procedure public.handle_updated_at();

-- ==================== DISPUTE MESSAGES ====================

create table if not exists public.dispute_messages (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('buyer', 'seller', 'admin')),
  text text not null,
  evidence_urls text[] default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_dispute_messages_dispute on public.dispute_messages(dispute_id);
alter table public.dispute_messages enable row level security;

-- Dispute participants and admins can view messages
create policy "Dispute participants can view messages"
  on public.dispute_messages for select
  using (
    exists (
      select 1 from public.disputes d
      join public.orders o on o.id = d.order_id
      where d.id = dispute_messages.dispute_id
      and (
        o.buyer_id = auth.uid()
        or o.seller_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'moderator'))
      )
    )
  );

-- Dispute participants and admins can add messages
create policy "Dispute participants can add messages"
  on public.dispute_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.disputes d
      join public.orders o on o.id = d.order_id
      where d.id = dispute_id
      and (
        o.buyer_id = auth.uid()
        or o.seller_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'moderator'))
      )
    )
  );
