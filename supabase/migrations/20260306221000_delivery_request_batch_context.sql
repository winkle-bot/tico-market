alter table public.delivery_requests
  add column if not exists batch_context jsonb not null default '{}'::jsonb;

create index if not exists idx_delivery_requests_batch_key
  on public.delivery_requests ((batch_context->>'batchKey'));
