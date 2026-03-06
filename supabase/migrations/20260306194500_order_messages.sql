create table if not exists public.order_messages (
  id bigserial primary key,
  order_id text references public.orders(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  sender_name text not null,
  text text not null,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  driver_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table if exists public.order_messages enable row level security;

create index if not exists idx_order_messages_order_id on public.order_messages(order_id);
create index if not exists idx_order_messages_buyer_id on public.order_messages(buyer_id);
create index if not exists idx_order_messages_seller_id on public.order_messages(seller_id);
create index if not exists idx_order_messages_driver_id on public.order_messages(driver_id);
create index if not exists idx_order_messages_created_at on public.order_messages(created_at);

create policy "Users can view delivery room messages they're part of"
  on public.order_messages for select
  using (
    auth.uid() = buyer_id or
    auth.uid() = seller_id or
    auth.uid() = driver_id or
    auth.uid() = sender_id
  );

create policy "Participants can send delivery room messages"
  on public.order_messages for insert
  with check (
    auth.uid() = sender_id and (
      auth.uid() = buyer_id or
      auth.uid() = seller_id or
      auth.uid() = driver_id
    )
  );
